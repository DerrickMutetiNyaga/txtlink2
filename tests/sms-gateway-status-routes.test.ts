/**
 * Phone gateway /sent and /delivered route safety + integration tests.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import mongoose from 'mongoose'
import { NextRequest } from 'next/server'
import {
  parseGatewayStatusBody,
  parseStatusTimestamp,
  precheckPhoneSentStatus,
  precheckPhoneDeliveredStatus,
  buildSentJobUpdate,
  buildDeliveredJobUpdate,
  isValidSmsMessageId,
  maskGatewayJobId,
  isLateTimeoutRecovery,
  isAtomicJob,
} from '@/lib/services/sms-gateway/phone-status-routes'
import { generateAttemptId, generateClaimToken } from '@/lib/services/sms-gateway/atomic-claim'
import { canTransitionCanonical } from '@/lib/services/sms-gateway/canonical-status'
import { GATEWAY_SENDING_TIMEOUT_MS } from '@/lib/services/sms-fallback/stale-sending'

const userId = new mongoose.Types.ObjectId()
const deviceMongoId = new mongoose.Types.ObjectId()
const jobIdA = new mongoose.Types.ObjectId()
const jobIdB = new mongoose.Types.ObjectId()
const smsIdA = new mongoose.Types.ObjectId()
const claimToken = generateClaimToken()
const attemptId = generateAttemptId()
const attemptIdB = generateAttemptId()

function makeJob(overrides: Record<string, unknown> = {}) {
  return {
    _id: jobIdA,
    userId,
    originalSmsId: String(smsIdA),
    status: 'sending',
    phoneStatus: 'sending',
    canonicalStatus: 'SUBMISSION_STARTED',
    claimToken,
    attemptId,
    claimedByDeviceId: String(deviceMongoId),
    lockedBy: String(deviceMongoId),
    assignedDeviceId: String(deviceMongoId),
    submissionStartedAt: new Date(),
    attempts: 1,
    isTest: false,
    serverRevision: 3,
    createdAt: new Date(),
    updatedAt: new Date(),
    recipientPhone: '254700000000',
    normalizedPhone: '254700000000',
    message: 'hello',
    retryAttempted: false,
    ...overrides,
  } as any
}

function makeParsed(overrides: Record<string, unknown> = {}) {
  return parseGatewayStatusBody(
    {
      claimToken,
      attemptId,
      deviceName: 'Pixel',
      simLabel: 'SIM 1',
      timestamp: '2026-08-11T11:49:00.000Z',
      ...overrides,
    },
    'sent'
  )
}

describe('parseStatusTimestamp', () => {
  it('accepts ISO strings and epoch ms', () => {
    expect(parseStatusTimestamp('2026-08-11T11:49:00.000Z').toISOString()).toBe(
      '2026-08-11T11:49:00.000Z'
    )
    expect(parseStatusTimestamp('1723372140000').getTime()).toBe(1723372140000)
  })

  it('never returns Invalid Date for garbage input', () => {
    const d = parseStatusTimestamp('not-a-date', {}, null)
    expect(Number.isNaN(d.getTime())).toBe(false)
  })
})

describe('atomic attempt identity rules', () => {
  it('jobs with attemptId are atomic', () => {
    expect(isAtomicJob(makeJob())).toBe(true)
    expect(isAtomicJob(makeJob({ attemptId: null }))).toBe(false)
  })

  it('atomic /sent requires attemptId', () => {
    const parsed = parseGatewayStatusBody({ claimToken }, 'sent')
    const result = precheckPhoneSentStatus(makeJob(), parsed, String(deviceMongoId))
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('ATTEMPT_REQUIRED')
  })

  it('claimToken is optional post-submission when attemptId matches', () => {
    const parsed = parseGatewayStatusBody({ attemptId }, 'sent')
    const result = precheckPhoneSentStatus(makeJob(), parsed, String(deviceMongoId))
    expect(result.ok).toBe(true)
  })

  it('claimToken mismatch still rejects when both present', () => {
    const parsed = makeParsed({ claimToken: generateClaimToken() })
    const result = precheckPhoneSentStatus(makeJob(), parsed, String(deviceMongoId))
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('CLAIM_TOKEN_MISMATCH')
  })
})

describe('sending timeout semantics', () => {
  it('timeout after /sending is SUBMISSION_UNKNOWN, not PHONE_SEND_FAILED', () => {
    expect(GATEWAY_SENDING_TIMEOUT_MS).toBe(2 * 60 * 1000)
    expect(canTransitionCanonical('SUBMISSION_STARTED', 'SUBMISSION_UNKNOWN')).toBe(true)
    expect(canTransitionCanonical('SUBMISSION_STARTED', 'PHONE_SEND_FAILED')).toBe(true) // affirmative /failed only
    expect(canTransitionCanonical('SUBMISSION_UNKNOWN', 'QUEUED_FOR_PHONE')).toBe(false)
    expect(canTransitionCanonical('SUBMISSION_UNKNOWN', 'CLAIMED_FOR_PHONE')).toBe(false)
    expect(canTransitionCanonical('SUBMISSION_UNKNOWN', 'SUBMISSION_STARTED')).toBe(false)
  })

  it('isLateTimeoutRecovery only for UNKNOWN or legacy SENDING_TIMEOUT failed', () => {
    expect(
      isLateTimeoutRecovery({
        status: 'submission_unknown',
        canonicalStatus: 'SUBMISSION_UNKNOWN',
      })
    ).toBe(true)
    expect(
      isLateTimeoutRecovery({
        status: 'failed',
        canonicalStatus: 'PHONE_SEND_FAILED',
        failureCode: 'SENDING_TIMEOUT',
      })
    ).toBe(true)
    expect(
      isLateTimeoutRecovery({
        status: 'failed',
        canonicalStatus: 'PHONE_SEND_FAILED',
        failureCode: 'SMS_MANAGER_ERROR',
      })
    ).toBe(false)
  })
})

describe('precheck /sent', () => {
  it('allows SUBMISSION_STARTED → SENT', () => {
    const result = precheckPhoneSentStatus(makeJob(), makeParsed(), String(deviceMongoId))
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.duplicate).toBe(false)
      expect(result.canonicalStatus).toBe('SENT_VIA_PHONE')
    }
  })

  it('is idempotent for already-sent jobs', () => {
    const result = precheckPhoneSentStatus(
      makeJob({ status: 'sent', canonicalStatus: 'SENT_VIA_PHONE' }),
      makeParsed(),
      String(deviceMongoId)
    )
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.duplicate).toBe(true)
  })

  it('rejects DELIVERED → SENT regression', () => {
    const result = precheckPhoneSentStatus(
      makeJob({ status: 'delivered', canonicalStatus: 'DELIVERED_VIA_PHONE' }),
      makeParsed(),
      String(deviceMongoId)
    )
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('STATUS_REGRESSION')
  })

  it('rejects stale attempt overwrite on SENT', () => {
    const result = precheckPhoneSentStatus(
      makeJob({ status: 'sent', canonicalStatus: 'SENT_VIA_PHONE' }),
      makeParsed({ attemptId: attemptIdB }),
      String(deviceMongoId)
    )
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('STALE_ATTEMPT')
  })

  it('TEST A: late SENT after SUBMISSION_UNKNOWN with matching attemptId', () => {
    const result = precheckPhoneSentStatus(
      makeJob({
        status: 'submission_unknown',
        canonicalStatus: 'SUBMISSION_UNKNOWN',
      }),
      makeParsed(),
      String(deviceMongoId)
    )
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.lateCallback).toBe(true)
      expect(result.eligibleStatuses).toContain('submission_unknown')
    }
  })

  it('TEST C: stale attempt A cannot overwrite when job now has attempt B', () => {
    const result = precheckPhoneSentStatus(
      makeJob({
        status: 'submission_unknown',
        canonicalStatus: 'SUBMISSION_UNKNOWN',
        attemptId: attemptIdB,
      }),
      makeParsed({ attemptId }), // attempt A
      String(deviceMongoId)
    )
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('STALE_ATTEMPT')
  })

  it('rejects true PHONE_SEND_FAILED recovery via /sent', () => {
    const result = precheckPhoneSentStatus(
      makeJob({
        status: 'failed',
        canonicalStatus: 'PHONE_SEND_FAILED',
        failureCode: 'SMS_MANAGER_ERROR',
      }),
      makeParsed(),
      String(deviceMongoId)
    )
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('STATUS_REGRESSION')
  })
})

describe('precheck /delivered', () => {
  it('allows SENT → DELIVERED', () => {
    const parsed = parseGatewayStatusBody({ claimToken, attemptId }, 'delivered')
    const result = precheckPhoneDeliveredStatus(
      makeJob({ status: 'sent', canonicalStatus: 'SENT_VIA_PHONE', sentAt: new Date() }),
      parsed,
      String(deviceMongoId)
    )
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.canonicalStatus).toBe('DELIVERED_VIA_PHONE')
  })

  it('is idempotent for duplicate DELIVERED', () => {
    const parsed = parseGatewayStatusBody({ claimToken, attemptId }, 'delivered')
    const result = precheckPhoneDeliveredStatus(
      makeJob({ status: 'delivered', canonicalStatus: 'DELIVERED_VIA_PHONE' }),
      parsed,
      String(deviceMongoId)
    )
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.duplicate).toBe(true)
  })

  it('TEST B: late DELIVERED after SUBMISSION_UNKNOWN', () => {
    const parsed = parseGatewayStatusBody({ attemptId }, 'delivered')
    const result = precheckPhoneDeliveredStatus(
      makeJob({
        status: 'submission_unknown',
        canonicalStatus: 'SUBMISSION_UNKNOWN',
      }),
      parsed,
      String(deviceMongoId)
    )
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.lateCallback).toBe(true)
  })
})

describe('Mongo update builders', () => {
  it('omits undefined localMessageId from /sent update', () => {
    const update = buildSentJobUpdate(makeParsed(), { boundDeviceName: 'Pixel' } as any, false)
    expect(update.$set).not.toHaveProperty('localMessageId')
  })

  it('clears failure fields on late callback', () => {
    const update = buildSentJobUpdate(makeParsed(), { boundDeviceName: 'Pixel' } as any, true)
    expect(update.$unset).toMatchObject({
      failureReason: 1,
      failureCode: 1,
      failedAt: 1,
    })
  })

  it('does not increment attempts in status updates', () => {
    const sent = buildSentJobUpdate(makeParsed(), { boundDeviceName: 'Pixel' } as any, false)
    const delivered = buildDeliveredJobUpdate(
      makeJob({ sentAt: new Date() }),
      parseGatewayStatusBody({ attemptId }, 'delivered'),
      { boundDeviceName: 'Pixel' } as any,
      false
    )
    expect(sent.$inc).toEqual({ serverRevision: 1 })
    expect(delivered.$inc).toEqual({ serverRevision: 1 })
    expect(sent).not.toHaveProperty('$inc.attempts')
  })
})

describe('isValidSmsMessageId', () => {
  it('rejects test job ids and invalid object ids', () => {
    expect(isValidSmsMessageId(String(smsIdA))).toBe(true)
    expect(isValidSmsMessageId(`test_${smsIdA}`)).toBe(false)
    expect(isValidSmsMessageId('not-an-id')).toBe(false)
  })
})

describe('route handlers (mocked DB)', () => {
  const store = new Map<string, any>()
  let smsProjectionFail = false
  let smsUpdateCalls = 0

  beforeEach(() => {
    store.clear()
    smsProjectionFail = false
    smsUpdateCalls = 0
    vi.resetModules()
    process.env.SMS_GATEWAY_TOKEN_SECRET = 'test-gateway-secret'
    process.env.JWT_SECRET = 'test-jwt-secret'
  })

  async function setupMocks() {
    vi.doMock('@/lib/db/connect', () => ({ default: vi.fn().mockResolvedValue(undefined) }))

    vi.doMock('@/lib/services/sms-gateway/auth', () => ({
      validateGatewayDevice: vi.fn().mockResolvedValue({
        ok: true,
        device: {
          _id: deviceMongoId,
          userId,
          boundDeviceName: 'Pixel',
          boundSimLabel: 'SIM 1',
          isGatewayRunning: true,
        },
        identity: { deviceId: 'android-stable-id', deviceName: 'Pixel', simLabel: 'SIM 1' },
      }),
      gatewayAuthErrorResponse: vi.fn(),
    }))

    vi.doMock('@/lib/services/sms-gateway/diagnostics', () => ({
      recordGatewayConnectionDiagnostic: vi.fn().mockResolvedValue(undefined),
    }))

    vi.doMock('@/lib/utils/audit', () => ({
      logAuditAction: vi.fn().mockResolvedValue(undefined),
    }))

    vi.doMock('@/lib/db/models', () => ({
      SmsFallbackJob: {
        findOne: vi.fn(({ _id, userId: uid }: any) => {
          const job = store.get(String(_id))
          if (!job || String(job.userId) !== String(uid)) {
            return {
              lean: () => Promise.resolve(null),
              select: () => ({ lean: () => Promise.resolve(null) }),
            }
          }
          return {
            lean: () => Promise.resolve({ ...job }),
            select: () => ({ lean: () => Promise.resolve({ ...job }) }),
          }
        }),
        findOneAndUpdate: vi.fn((filter: any, update: any) => {
          const id = String(filter._id)
          const job = store.get(id)
          if (!job) return Promise.resolve(null)
          if (filter.status?.$in && !filter.status.$in.includes(job.status)) {
            return Promise.resolve(null)
          }
          const next = { ...job, ...(update.$set || {}) }
          if (update.$unset) {
            for (const key of Object.keys(update.$unset)) {
              delete next[key]
            }
          }
          if (update.$inc?.serverRevision) {
            next.serverRevision = (job.serverRevision || 0) + update.$inc.serverRevision
          }
          store.set(id, next)
          return Promise.resolve(next)
        }),
      },
      SmsMessage: {
        findByIdAndUpdate: vi.fn(async () => {
          smsUpdateCalls++
          if (smsProjectionFail) {
            const err = new Error('Cast to ObjectId failed')
            ;(err as any).name = 'CastError'
            throw err
          }
          return {}
        }),
      },
      SmsGatewayDevice: {
        updateOne: vi.fn().mockResolvedValue({}),
      },
    }))
  }

  function authRequest(url: string, body: Record<string, unknown>) {
    return new NextRequest(url, {
      method: 'POST',
      headers: {
        authorization: 'Bearer gw_live_test_token',
        'content-type': 'application/json',
      },
      body: JSON.stringify(body),
    })
  }

  it('full sequence: /sent → /delivered (jobs A and B), duplicates, no regression', async () => {
    await setupMocks()

    for (const [id, label] of [
      [jobIdA, 'A'],
      [jobIdB, 'B'],
    ] as const) {
      store.set(String(id), makeJob({ _id: id, attemptId: `${attemptId}_${label}`, attempts: 1 }))
    }

    const { POST: postSent } = await import('@/app/api/sms-gateway/jobs/[jobId]/sent/route')
    const { POST: postDelivered } = await import(
      '@/app/api/sms-gateway/jobs/[jobId]/delivered/route'
    )

    for (const [id, label] of [
      [jobIdA, 'A'],
      [jobIdB, 'B'],
    ] as const) {
      const body = {
        attemptId: `${attemptId}_${label}`,
        deviceName: 'Pixel',
        timestamp: '2026-08-11T11:49:00.000Z',
      }
      const attemptsBefore = store.get(String(id)).attempts

      const sentRes = await postSent(authRequest(`https://x/j/${id}/sent`, body), {
        params: Promise.resolve({ jobId: String(id) }),
      })
      expect(sentRes.status).toBe(200)
      expect((await sentRes.json()).canonicalStatus).toBe('SENT_VIA_PHONE')

      const sentDup = await postSent(authRequest(`https://x/j/${id}/sent`, body), {
        params: Promise.resolve({ jobId: String(id) }),
      })
      expect(sentDup.status).toBe(200)
      expect((await sentDup.json()).duplicate).toBe(true)
      expect(store.get(String(id)).attempts).toBe(attemptsBefore)

      const delRes = await postDelivered(authRequest(`https://x/j/${id}/delivered`, body), {
        params: Promise.resolve({ jobId: String(id) }),
      })
      expect(delRes.status).toBe(200)
      expect((await delRes.json()).canonicalStatus).toBe('DELIVERED_VIA_PHONE')

      const delDup = await postDelivered(authRequest(`https://x/j/${id}/delivered`, body), {
        params: Promise.resolve({ jobId: String(id) }),
      })
      expect(delDup.status).toBe(200)

      // /sent after delivered must not regress
      const regress = await postSent(authRequest(`https://x/j/${id}/sent`, body), {
        params: Promise.resolve({ jobId: String(id) }),
      })
      expect(regress.status).toBe(409)
      expect(store.get(String(id)).status).toBe('delivered')
    }
  })

  it('TEST A: late /sent after SUBMISSION_UNKNOWN → SENT_VIA_PHONE, no resend', async () => {
    await setupMocks()
    store.set(
      String(jobIdA),
      makeJob({
        status: 'submission_unknown',
        canonicalStatus: 'SUBMISSION_UNKNOWN',
        attempts: 1,
      })
    )

    const { POST: postSent } = await import('@/app/api/sms-gateway/jobs/[jobId]/sent/route')
    const res = await postSent(
      authRequest(`https://x/j/${jobIdA}/sent`, {
        attemptId,
        timestamp: '2026-08-11T11:52:00.000Z',
      }),
      { params: Promise.resolve({ jobId: String(jobIdA) }) }
    )
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.canonicalStatus).toBe('SENT_VIA_PHONE')
    expect(json.lateCallback).toBe(true)
    expect(store.get(String(jobIdA)).status).toBe('sent')
    expect(store.get(String(jobIdA)).attempts).toBe(1)
  })

  it('TEST B: late /delivered after SUBMISSION_UNKNOWN → DELIVERED_VIA_PHONE', async () => {
    await setupMocks()
    store.set(
      String(jobIdA),
      makeJob({
        status: 'submission_unknown',
        canonicalStatus: 'SUBMISSION_UNKNOWN',
        attempts: 1,
      })
    )

    const { POST: postDelivered } = await import(
      '@/app/api/sms-gateway/jobs/[jobId]/delivered/route'
    )
    const res = await postDelivered(
      authRequest(`https://x/j/${jobIdA}/delivered`, { attemptId }),
      { params: Promise.resolve({ jobId: String(jobIdA) }) }
    )
    expect(res.status).toBe(200)
    expect((await res.json()).canonicalStatus).toBe('DELIVERED_VIA_PHONE')
    expect(store.get(String(jobIdA)).attempts).toBe(1)
  })

  it('TEST C: stale attempt A cannot corrupt attempt B job', async () => {
    await setupMocks()
    store.set(
      String(jobIdA),
      makeJob({
        status: 'sending',
        canonicalStatus: 'SUBMISSION_STARTED',
        attemptId: attemptIdB,
      })
    )

    const { POST: postSent } = await import('@/app/api/sms-gateway/jobs/[jobId]/sent/route')
    const res = await postSent(
      authRequest(`https://x/j/${jobIdA}/sent`, { attemptId }),
      { params: Promise.resolve({ jobId: String(jobIdA) }) }
    )
    expect(res.status).toBe(409)
    expect(store.get(String(jobIdA)).status).toBe('sending')
    expect(store.get(String(jobIdA)).attemptId).toBe(attemptIdB)
  })

  it('SmsMessage projection failure after job commit still returns 2xx', async () => {
    await setupMocks()
    smsProjectionFail = true
    store.set(String(jobIdA), makeJob())

    const { POST: postSent } = await import('@/app/api/sms-gateway/jobs/[jobId]/sent/route')
    const res = await postSent(
      authRequest(`https://x/j/${jobIdA}/sent`, { attemptId }),
      { params: Promise.resolve({ jobId: String(jobIdA) }) }
    )
    expect(res.status).toBe(200)
    expect(store.get(String(jobIdA)).status).toBe('sent')
    expect(smsUpdateCalls).toBeGreaterThan(0)
  })

  it('legacy SENDING_TIMEOUT failed rows can still recover once', async () => {
    await setupMocks()
    store.set(
      String(jobIdA),
      makeJob({
        status: 'failed',
        canonicalStatus: 'PHONE_SEND_FAILED',
        failureCode: 'SENDING_TIMEOUT',
        phoneStatus: 'failed',
      })
    )

    const { POST: postSent } = await import('@/app/api/sms-gateway/jobs/[jobId]/sent/route')
    const res = await postSent(
      authRequest(`https://x/j/${jobIdA}/sent`, { attemptId }),
      { params: Promise.resolve({ jobId: String(jobIdA) }) }
    )
    expect(res.status).toBe(200)
    expect(store.get(String(jobIdA)).status).toBe('sent')
  })
})

describe('maskGatewayJobId', () => {
  it('masks job ids for logs', () => {
    expect(maskGatewayJobId(String(jobIdA))).toMatch(/^[a-f0-9]{4}…[a-f0-9]{4}$/)
  })
})

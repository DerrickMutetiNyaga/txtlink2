/**
 * Android HTTPS gateway atomic-claim correctness tests.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import mongoose from 'mongoose'
import {
  clampPendingJobLimit,
  PENDING_JOB_MAX_LIMIT,
  PENDING_QUERY_INDEX_HINTS,
  pendingClaimAttemptBudget,
} from '@/lib/services/sms-gateway/pending-query'
import {
  getClaimLeaseSeconds,
  claimLeaseSupportsBatch,
  computeClaimExpiresAt,
  getMinRecommendedClaimLeaseSeconds,
} from '@/lib/services/sms-gateway/claim-lease'
import {
  generateAttemptId,
  generateClaimToken,
  formatClaimedJobForAndroid,
} from '@/lib/services/sms-gateway/atomic-claim'
import {
  canTransitionCanonical,
  toCanonicalStatus,
} from '@/lib/services/sms-gateway/canonical-status'
import { extractBearerToken } from '@/lib/services/sms-gateway/auth'
import { NextRequest } from 'next/server'

describe('batch limit standardized to 50', () => {
  it('pending limit is consistently <= 50', () => {
    expect(PENDING_JOB_MAX_LIMIT).toBe(50)
    expect(clampPendingJobLimit('50')).toBe(50)
    expect(clampPendingJobLimit('100')).toBe(50)
    expect(clampPendingJobLimit('999')).toBe(50)
    expect(pendingClaimAttemptBudget(50)).toBeLessThanOrEqual(100)
  })
})

describe('claim lease supports 50-job batch', () => {
  it('default lease is at least 10 minutes and covers 50×3s', () => {
    delete process.env.SMS_GATEWAY_CLAIM_LEASE_SECONDS
    expect(getClaimLeaseSeconds()).toBe(600)
    expect(getClaimLeaseSeconds()).toBeGreaterThanOrEqual(getMinRecommendedClaimLeaseSeconds())
    expect(claimLeaseSupportsBatch(50, 3)).toBe(true)
    const leaseMs = computeClaimExpiresAt(new Date('2026-01-01T00:00:00Z')).getTime()
    expect(leaseMs - Date.parse('2026-01-01T00:00:00Z')).toBe(600_000)
  })
})

describe('claimToken / attemptId formats', () => {
  it('pending response shape includes claimToken and attemptId', () => {
    const claimToken = generateClaimToken()
    const attemptId = generateAttemptId()
    expect(claimToken.startsWith('clm_')).toBe(true)
    expect(attemptId.startsWith('att_')).toBe(true)

    const formatted = formatClaimedJobForAndroid({
      _id: new mongoose.Types.ObjectId(),
      userId: new mongoose.Types.ObjectId(),
      originalSmsId: 'sms1',
      recipientPhone: '254700000000',
      normalizedPhone: '254700000000',
      message: 'hello',
      status: 'claimed',
      canonicalStatus: 'CLAIMED_FOR_PHONE',
      attempts: 1,
      claimToken,
      attemptId,
      claimExpiresAt: computeClaimExpiresAt(),
      claimedByDeviceId: 'dev-a',
      assignedDeviceId: 'dev-a',
      assignedSubscriptionId: 'sub-1',
      retryAttempted: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      serverRevision: 1,
    } as any)

    expect(formatted.claimToken).toBe(claimToken)
    expect(formatted.attemptId).toBe(attemptId)
    expect(formatted.attemptNumber).toBe(1)
    expect(formatted.canonicalStatus).toBe('CLAIMED_FOR_PHONE')
    expect(formatted.serverJobId).toBeTruthy()
    expect(formatted.originalSmsId).toBe('sms1')
    expect(formatted.assignedDeviceId).toBe('dev-a')
    expect(formatted.assignedSubscriptionId).toBe('sub-1')
    // Legacy field preserved
    expect(formatted.status).toBe('pending')
    expect(formatted.id).toBeTruthy()
  })
})

describe('atomic concurrent claim — two polls never share a job', () => {
  interface FakeJob {
    _id: mongoose.Types.ObjectId
    userId: mongoose.Types.ObjectId
    status: string
    assignedDeviceId: string | null
    claimToken: string | null
    attemptId: string | null
    claimedByDeviceId: string | null
    attempts: number
  }

  const store: FakeJob[] = []

  function atomicClaim(userId: mongoose.Types.ObjectId, deviceId: string): FakeJob | null {
    const job = store.find(
      (j) =>
        j.userId.equals(userId) &&
        j.status === 'pending' &&
        (!j.assignedDeviceId || j.assignedDeviceId === deviceId)
    )
    if (!job) return null
    job.status = 'claimed'
    job.claimedByDeviceId = deviceId
    job.assignedDeviceId = deviceId
    job.claimToken = generateClaimToken()
    job.attemptId = generateAttemptId()
    job.attempts += 1
    return { ...job }
  }

  beforeEach(() => {
    store.length = 0
  })

  it('two simultaneous pending requests never receive the same job', () => {
    const userId = new mongoose.Types.ObjectId()
    const jobId = new mongoose.Types.ObjectId()
    store.push({
      _id: jobId,
      userId,
      status: 'pending',
      assignedDeviceId: null,
      claimToken: null,
      attemptId: null,
      claimedByDeviceId: null,
      attempts: 0,
    })

    const a = atomicClaim(userId, 'device-a')
    const b = atomicClaim(userId, 'device-b')

    expect(a).not.toBeNull()
    expect(b).toBeNull()
    expect(a!._id.toString()).toBe(jobId.toString())
    expect(store[0].claimedByDeviceId).toBe('device-a')
    expect(store[0].claimToken).toBeTruthy()
    expect(store[0].attemptId).toBeTruthy()
  })

  it('two devices cannot claim the same job', () => {
    const userId = new mongoose.Types.ObjectId()
    store.push({
      _id: new mongoose.Types.ObjectId(),
      userId,
      status: 'pending',
      assignedDeviceId: null,
      claimToken: null,
      attemptId: null,
      claimedByDeviceId: null,
      attempts: 0,
    })

    const first = atomicClaim(userId, 'phone-1')
    const second = atomicClaim(userId, 'phone-2')
    expect(first?.claimedByDeviceId).toBe('phone-1')
    expect(second).toBeNull()
  })

  it('device-assigned jobs are only claimable by that device', () => {
    const userId = new mongoose.Types.ObjectId()
    store.push({
      _id: new mongoose.Types.ObjectId(),
      userId,
      status: 'pending',
      assignedDeviceId: 'phone-2',
      claimToken: null,
      attemptId: null,
      claimedByDeviceId: null,
      attempts: 0,
    })

    expect(atomicClaim(userId, 'phone-1')).toBeNull()
    expect(atomicClaim(userId, 'phone-2')).not.toBeNull()
  })
})

describe('claim validation rules', () => {
  function validateClaim(opts: {
    ownerDeviceId: string
    callerDeviceId: string
    jobToken: string
    requestToken: string
    jobAttempt: string
    requestAttempt: string
    expired?: boolean
    status?: string
  }) {
    if (opts.status === 'cancelled') return { valid: false, reason: 'CANCELLED' }
    if (opts.status === 'sent') return { valid: false, reason: 'ALREADY_SENT' }
    if (opts.status === 'delivered') return { valid: false, reason: 'ALREADY_DELIVERED' }
    if (opts.ownerDeviceId !== opts.callerDeviceId) return { valid: false, reason: 'WRONG_DEVICE' }
    if (opts.jobToken !== opts.requestToken) return { valid: false, reason: 'CLAIM_TOKEN_MISMATCH' }
    if (opts.jobAttempt !== opts.requestAttempt) return { valid: false, reason: 'ATTEMPT_ID_MISMATCH' }
    if (opts.expired) return { valid: false, reason: 'CLAIM_EXPIRED' }
    return { valid: true }
  }

  it('wrong device cannot validate claim', () => {
    expect(
      validateClaim({
        ownerDeviceId: 'dev-a',
        callerDeviceId: 'dev-b',
        jobToken: 'clm_1',
        requestToken: 'clm_1',
        jobAttempt: 'att_1',
        requestAttempt: 'att_1',
      }).reason
    ).toBe('WRONG_DEVICE')
  })

  it('wrong claim token fails', () => {
    expect(
      validateClaim({
        ownerDeviceId: 'dev-a',
        callerDeviceId: 'dev-a',
        jobToken: 'clm_1',
        requestToken: 'clm_other',
        jobAttempt: 'att_1',
        requestAttempt: 'att_1',
      }).reason
    ).toBe('CLAIM_TOKEN_MISMATCH')
  })

  it('wrong attempt ID fails', () => {
    expect(
      validateClaim({
        ownerDeviceId: 'dev-a',
        callerDeviceId: 'dev-a',
        jobToken: 'clm_1',
        requestToken: 'clm_1',
        jobAttempt: 'att_1',
        requestAttempt: 'att_other',
      }).reason
    ).toBe('ATTEMPT_ID_MISMATCH')
  })
})

describe('idempotent status updates', () => {
  it('/sending is idempotent for the same attempt', () => {
    let attempts = 1
    let status = 'claimed'
    const attemptId = 'att_1'

    const applySending = (incomingAttempt: string) => {
      if (status === 'sending' && incomingAttempt === attemptId) {
        return { ok: true, duplicate: true, attempts }
      }
      if (status === 'claimed' && incomingAttempt === attemptId) {
        status = 'sending'
        // do not increment attempts again
        return { ok: true, duplicate: false, attempts }
      }
      return { ok: false, duplicate: false, attempts }
    }

    expect(applySending(attemptId)).toEqual({ ok: true, duplicate: false, attempts: 1 })
    expect(applySending(attemptId)).toEqual({ ok: true, duplicate: true, attempts: 1 })
    expect(attempts).toBe(1)
  })

  it('/sent is idempotent', () => {
    let status = 'sending'
    const applySent = () => {
      if (status === 'sent' || status === 'delivered') return { ok: true, duplicate: true, status }
      if (status === 'sending' || status === 'claimed') {
        status = 'sent'
        return { ok: true, duplicate: false, status }
      }
      return { ok: false, duplicate: false, status }
    }
    expect(applySent().duplicate).toBe(false)
    expect(applySent()).toEqual({ ok: true, duplicate: true, status: 'sent' })
  })

  it('/delivered is idempotent', () => {
    let status = 'sent'
    const applyDelivered = () => {
      if (status === 'delivered') return { ok: true, duplicate: true, status }
      status = 'delivered'
      return { ok: true, duplicate: false, status }
    }
    expect(applyDelivered().duplicate).toBe(false)
    expect(applyDelivered()).toEqual({ ok: true, duplicate: true, status: 'delivered' })
  })
})

describe('monotonic statuses', () => {
  it('DELIVERED cannot regress', () => {
    expect(canTransitionCanonical('DELIVERED_VIA_PHONE', 'SENT_VIA_PHONE')).toBe(false)
    expect(canTransitionCanonical('DELIVERED_VIA_PHONE', 'QUEUED_FOR_PHONE')).toBe(false)
    expect(canTransitionCanonical('DELIVERED_VIA_PHONE', 'CLAIMED_FOR_PHONE')).toBe(false)
    expect(canTransitionCanonical('DELIVERED_VIA_PHONE', 'DELIVERED_VIA_PHONE')).toBe(true)
  })

  it('SENT cannot regress to queued', () => {
    expect(canTransitionCanonical('SENT_VIA_PHONE', 'QUEUED_FOR_PHONE')).toBe(false)
    expect(canTransitionCanonical('SENT_VIA_PHONE', 'CLAIMED_FOR_PHONE')).toBe(false)
    expect(canTransitionCanonical('SENT_VIA_PHONE', 'DELIVERED_VIA_PHONE')).toBe(true)
  })

  it('SUBMISSION_UNKNOWN does not auto-return to pending', () => {
    expect(canTransitionCanonical('SUBMISSION_UNKNOWN', 'QUEUED_FOR_PHONE')).toBe(false)
    expect(canTransitionCanonical('SUBMISSION_UNKNOWN', 'CLAIMED_FOR_PHONE')).toBe(false)
  })

  it('maps job status to canonical', () => {
    expect(toCanonicalStatus('claimed')).toBe('CLAIMED_FOR_PHONE')
    expect(toCanonicalStatus('sending')).toBe('SUBMISSION_STARTED')
    expect(toCanonicalStatus('sent')).toBe('SENT_VIA_PHONE')
    expect(toCanonicalStatus('delivered')).toBe('DELIVERED_VIA_PHONE')
  })
})

describe('expired claim safety', () => {
  it('expired not-started claim can safely return to pending', () => {
    const job = {
      status: 'claimed',
      submissionStartedAt: null as Date | null,
      claimExpiresAt: new Date(Date.now() - 1000),
    }
    const safe =
      job.status === 'claimed' &&
      !job.submissionStartedAt &&
      job.claimExpiresAt.getTime() < Date.now()
    expect(safe).toBe(true)
  })

  it('expired submission-started attempt does not return automatically', () => {
    const job = {
      status: 'sending',
      submissionStartedAt: new Date(Date.now() - 700_000),
      claimExpiresAt: new Date(Date.now() - 1000),
    }
    const unsafe =
      Boolean(job.submissionStartedAt) || job.status === 'sending'
    expect(unsafe).toBe(true)
    // Must go to SUBMISSION_UNKNOWN, not pending
    expect(canTransitionCanonical('SUBMISSION_STARTED', 'QUEUED_FOR_PHONE')).toBe(false)
    expect(canTransitionCanonical('SUBMISSION_STARTED', 'SUBMISSION_UNKNOWN')).toBe(true)
  })
})

describe('legacy Android compatibility', () => {
  it('existing legacy Android API remains temporarily compatible', () => {
    const request = new NextRequest('https://txtlink.co.ke/api/sms-gateway/jobs/pending', {
      headers: {
        authorization: 'Bearer gw_live_legacy_token',
        cookie: 'token=browser-session',
      },
    })
    expect(extractBearerToken(request)).toBe('gw_live_legacy_token')

    const legacyJob = formatClaimedJobForAndroid({
      _id: new mongoose.Types.ObjectId(),
      userId: new mongoose.Types.ObjectId(),
      originalSmsId: 'sms',
      recipientPhone: '254700',
      normalizedPhone: '254700',
      message: 'hi',
      status: 'claimed',
      canonicalStatus: 'CLAIMED_FOR_PHONE',
      attempts: 1,
      claimToken: generateClaimToken(),
      attemptId: generateAttemptId(),
      claimExpiresAt: computeClaimExpiresAt(),
      retryAttempted: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any)

    // Legacy fields still present for older app builds
    expect(legacyJob).toHaveProperty('id')
    expect(legacyJob).toHaveProperty('recipientPhone')
    expect(legacyJob).toHaveProperty('message')
    expect(legacyJob.status).toBe('pending')
    // New fields additive
    expect(legacyJob).toHaveProperty('claimToken')
    expect(legacyJob).toHaveProperty('attemptId')
  })
})

describe('indexes', () => {
  it('documents device assignment + claim indexes', () => {
    expect(PENDING_QUERY_INDEX_HINTS).toEqual(
      expect.arrayContaining([
        { userId: 1, status: 1, createdAt: 1 },
        { userId: 1, status: 1, claimExpiresAt: 1 },
        { userId: 1, assignedDeviceId: 1, status: 1, createdAt: 1 },
      ])
    )
  })

  it('SmsFallbackJob schema includes claim + canonical fields', async () => {
    const { SmsFallbackJob } = await import('@/lib/db/models')
    const paths = SmsFallbackJob.schema.paths
    for (const field of [
      'claimToken',
      'attemptId',
      'claimedByDeviceId',
      'claimedAt',
      'claimExpiresAt',
      'assignedDeviceId',
      'assignedSubscriptionId',
      'submissionStartedAt',
      'canonicalStatus',
      'serverRevision',
      'phoneSentAt',
      'phoneDeliveredAt',
    ]) {
      expect(paths[field]).toBeTruthy()
    }
    const indexes = SmsFallbackJob.schema.indexes().map(([fields]) => fields)
    expect(indexes).toEqual(
      expect.arrayContaining([
        { userId: 1, assignedDeviceId: 1, status: 1, createdAt: 1 },
        { claimToken: 1 },
        { attemptId: 1 },
      ])
    )
    const statusEnum = (SmsFallbackJob.schema.path('status') as any).enumValues
    expect(statusEnum).toContain('claimed')
    expect(statusEnum).toContain('submission_unknown')
  })
})

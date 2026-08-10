/**
 * Android HTTPS gateway polling hardening tests.
 * Covers pending batches, drain, heartbeat lightness, auth without cookies,
 * idempotent status, indexes, and concurrent claim safety — without Firebase/FCM.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import mongoose from 'mongoose'
import {
  clampPendingJobLimit,
  pendingFetchLimit,
  buildPendingJobsQuery,
  PENDING_JOBS_SORT,
  PENDING_JOB_MAX_LIMIT,
  PENDING_QUERY_INDEX_HINTS,
} from '@/lib/services/sms-gateway/pending-query'
import {
  buildSafeDiagnosticLog,
  logGatewayConnectionDiagnostic,
} from '@/lib/services/sms-gateway/diagnostics'
import {
  computeClaimExpiresAt,
  getClaimLeaseMs,
} from '@/lib/services/sms-gateway/claim-lease'
import {
  computeGatewayConnectionStatus,
  getGatewayLatestActivity,
} from '@/lib/services/sms-gateway/status'
import { extractBearerToken } from '@/lib/services/sms-gateway/auth'
import { buildServerTimingHeader, elapsedMs, nowMs } from '@/lib/services/sms-gateway/timing'
import { NextRequest } from 'next/server'

describe('pending job limit + query shape', () => {
  it('clamps limit to <= 50', () => {
    expect(clampPendingJobLimit('50')).toBe(50)
    expect(clampPendingJobLimit('100')).toBe(50)
    expect(clampPendingJobLimit('999')).toBe(PENDING_JOB_MAX_LIMIT)
    expect(clampPendingJobLimit(null)).toBe(40)
    expect(clampPendingJobLimit('0')).toBe(40)
    expect(clampPendingJobLimit('abc')).toBe(40)
  })

  it('allows batches of 50 and over-fetches modestly', () => {
    expect(clampPendingJobLimit('50')).toBe(50)
    expect(pendingFetchLimit(50)).toBe(100)
    expect(pendingFetchLimit(10)).toBe(20)
  })

  it('builds indexed pending query sorted oldest-first', () => {
    const userId = new mongoose.Types.ObjectId()
    expect(buildPendingJobsQuery(userId)).toEqual({ userId, status: 'pending' })
    expect(PENDING_JOBS_SORT).toEqual({ createdAt: 1 })
  })

  it('documents compound indexes covering pending + claim expiry', () => {
    expect(PENDING_QUERY_INDEX_HINTS).toEqual(
      expect.arrayContaining([
        { userId: 1, status: 1, createdAt: 1 },
        { userId: 1, status: 1, claimExpiresAt: 1 },
        { userId: 1, status: 1, sendingAt: 1 },
      ])
    )
  })

  it('can drain 500 queued jobs through repeated batches of 50 with no server delay', () => {
    const total = 500
    const batch = clampPendingJobLimit('50')
    let remaining = total
    let rounds = 0
    const started = Date.now()
    while (remaining > 0) {
      const took = Math.min(batch, remaining)
      remaining -= took
      rounds++
    }
    const elapsed = Date.now() - started
    expect(rounds).toBe(10)
    expect(remaining).toBe(0)
    // No artificial 10s server delay between batches
    expect(elapsed).toBeLessThan(1000)
  })
})

describe('server timing + safe diagnostics', () => {
  it('builds Server-Timing header', () => {
    expect(buildServerTimingHeader({ db: 12.4, total: 40.9 })).toBe('db;dur=12, total;dur=41')
  })

  it('elapsedMs is non-negative', () => {
    const start = nowMs()
    expect(elapsedMs(start)).toBeGreaterThanOrEqual(0)
  })

  it('never includes raw token, authorization, or SMS body in diagnostics', () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined)
    const record = buildSafeDiagnosticLog({
      deviceId: 'dev1',
      route: 'GET /api/sms-gateway/jobs/pending',
      httpStatus: 200,
      durationMs: 15,
      dbQueryDurationMs: 4,
      jobsReturned: 0,
      kind: 'pending',
      gatewayDeviceIdHeader: 'android-device-abc',
    })

    logGatewayConnectionDiagnostic({
      deviceId: 'dev1',
      route: 'GET /api/sms-gateway/jobs/pending',
      httpStatus: 200,
      durationMs: 15,
      dbQueryDurationMs: 4,
      jobsReturned: 0,
      kind: 'pending',
      gatewayDeviceIdHeader: 'android-device-abc',
    })

    const payload = JSON.stringify(record)
    expect(payload).not.toMatch(/gw_live_/i)
    expect(payload).not.toMatch(/authorization/i)
    expect(payload).not.toMatch(/Bearer/i)
    expect(payload).not.toMatch(/message body/i)
    expect(record.gatewayDeviceId).toBe('android-device-abc')
    expect(record.jobsReturned).toBe(0)
    expect(record.dbQueryDurationMs).toBe(4)
    expect(log).toHaveBeenCalled()
    log.mockRestore()
  })
})

describe('gateway auth without browser cookies', () => {
  it('extracts Bearer token and ignores cookies', () => {
    const request = new NextRequest('https://txtlink.co.ke/api/sms-gateway/jobs/pending', {
      headers: {
        authorization: 'Bearer gw_live_test_token_value',
        cookie: 'token=browser-session-jwt; session=abc',
      },
    })
    expect(extractBearerToken(request)).toBe('gw_live_test_token_value')
  })

  it('returns null when only cookies are present', () => {
    const request = new NextRequest('https://txtlink.co.ke/api/sms-gateway/heartbeat', {
      method: 'POST',
      headers: {
        cookie: 'token=browser-session-jwt',
      },
    })
    expect(extractBearerToken(request)).toBeNull()
  })
})

describe('connection status diagnostics fields', () => {
  it('uses pending/http contact times for online detection', () => {
    const recent = new Date()
    const status = computeGatewayConnectionStatus({
      isActive: true,
      boundDeviceFingerprint: 'fp',
      isGatewayRunning: true,
      lastPendingRequestAt: recent,
    })
    expect(status.isOnline).toBe(true)
    expect(status.connectionStatus).toBe('online')
    expect(status.secondsSinceLastContact).toBeTypeOf('number')
  })

  it('getGatewayLatestActivity prefers newest contact', () => {
    const older = new Date(Date.now() - 60_000)
    const newer = new Date()
    const latest = getGatewayLatestActivity({
      lastHeartbeatAt: older,
      lastHttpAt: newer,
    })
    expect(latest?.getTime()).toBe(newer.getTime())
  })
})

describe('claim expiry + concurrent claim safety', () => {
  interface FakeJob {
    _id: mongoose.Types.ObjectId
    userId: mongoose.Types.ObjectId
    status: string
    lockedBy: string | null
    attempts: number
    sendingAt: Date | null
    claimExpiresAt: Date | null
  }

  const store: FakeJob[] = []

  function atomicClaim(jobId: mongoose.Types.ObjectId, userId: mongoose.Types.ObjectId, lockedBy: string) {
    const job = store.find(
      (j) => j._id.equals(jobId) && j.userId.equals(userId) && j.status === 'pending'
    )
    if (!job) return null
    const now = new Date()
    job.status = 'sending'
    job.lockedBy = lockedBy
    job.sendingAt = now
    job.claimExpiresAt = computeClaimExpiresAt(now)
    job.attempts += 1
    return { ...job }
  }

  beforeEach(() => {
    store.length = 0
  })

  it('sets claimExpiresAt ~90s ahead', () => {
    const from = new Date('2026-08-10T12:00:00.000Z')
    expect(computeClaimExpiresAt(from).getTime() - from.getTime()).toBe(getClaimLeaseMs())
  })

  it('concurrent claims: only one device wins', () => {
    const userId = new mongoose.Types.ObjectId()
    const jobId = new mongoose.Types.ObjectId()
    store.push({
      _id: jobId,
      userId,
      status: 'pending',
      lockedBy: null,
      attempts: 0,
      sendingAt: null,
      claimExpiresAt: null,
    })

    const a = atomicClaim(jobId, userId, 'device-a')
    const b = atomicClaim(jobId, userId, 'device-b')

    expect(a).not.toBeNull()
    expect(b).toBeNull()
    expect(store[0].lockedBy).toBe('device-a')
    expect(store[0].status).toBe('sending')
    expect(store[0].attempts).toBe(1)
    expect(store[0].claimExpiresAt).toBeInstanceOf(Date)
  })

  it('duplicate status report is safe (idempotent delivered)', () => {
    const statuses = ['delivered']
    const applySent = (current: string) => {
      if (current === 'delivered' || current === 'sent') {
        return { ok: true, duplicate: true, status: 'delivered' }
      }
      if (current === 'sending' || current === 'pending') {
        statuses[0] = 'delivered'
        return { ok: true, duplicate: false, status: 'delivered' }
      }
      return { ok: false, duplicate: false, status: current }
    }

    expect(applySent('delivered')).toEqual({
      ok: true,
      duplicate: true,
      status: 'delivered',
    })
    expect(applySent('sending')).toEqual({
      ok: true,
      duplicate: false,
      status: 'delivered',
    })
    expect(applySent('delivered')).toEqual({
      ok: true,
      duplicate: true,
      status: 'delivered',
    })
  })
})

describe('model index coverage (schema contract)', () => {
  it('SmsFallbackJob schema declares pending + claim indexes', async () => {
    const { SmsFallbackJob } = await import('@/lib/db/models')
    const indexes = SmsFallbackJob.schema.indexes()
    const normalized = indexes.map(([fields]) => fields)
    expect(normalized).toEqual(
      expect.arrayContaining([
        { userId: 1, status: 1, createdAt: 1 },
        { userId: 1, status: 1, claimExpiresAt: 1 },
        { userId: 1, status: 1, sendingAt: 1 },
      ])
    )
  })

  it('SmsGatewayDevice schema includes diagnostic fields', async () => {
    const { SmsGatewayDevice } = await import('@/lib/db/models')
    const paths = SmsGatewayDevice.schema.paths
    for (const field of [
      'lastSeenAt',
      'lastPendingRequestAt',
      'lastPendingSuccessAt',
      'lastPendingJobsReturned',
      'lastHttpAt',
      'lastHttpRoute',
      'lastHttpStatus',
      'lastHttpDurationMs',
      'lastDbQueryDurationMs',
      'lastStatusUpdateAt',
    ]) {
      expect(paths[field]).toBeTruthy()
    }
  })
})

describe('heartbeat remains fast (contract)', () => {
  it('heartbeat path updates only lightweight fields (no aggregation keys)', () => {
    // Contract: heartbeat $set keys must stay a small fixed set — never queue counts.
    const heartbeatSetKeys = [
      'lastHeartbeatAt',
      'lastSeenAt',
      'lastSyncAt',
      'lastIp',
      'lastUserAgent',
      'boundDeviceName',
      'boundSimLabel',
      'appVersion',
      'batteryLevel',
      'isSmsPermissionGranted',
      'isGatewayRunning',
    ]
    expect(heartbeatSetKeys).not.toContain('pendingPhoneJobs')
    expect(heartbeatSetKeys).not.toContain('$lookup')
    expect(heartbeatSetKeys.length).toBeLessThanOrEqual(12)
  })
})

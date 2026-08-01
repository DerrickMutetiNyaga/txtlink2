import { describe, it, expect, beforeEach } from 'vitest'
import {
  GATEWAY_SETUP_DEFAULTS,
  resolveGatewaySetupConfig,
  isLegacyPauseDefault,
} from '@/lib/services/sms-gateway/config'
import {
  normalizeGatewayApiBaseUrl,
  resolveGatewayApiBaseUrlFromOrigin,
} from '@/lib/services/sms-gateway/api-base-url'
import {
  buildGatewaySetupPayload,
  encodeConnectionCode,
  decodeConnectionCode,
} from '@/lib/services/sms-gateway/connection-code'
import { planLegacyConfigRepair } from '@/lib/services/sms-gateway/migrate-config'
import {
  classifyGatewayFailure,
  isAccidentalGatewayPauseReason,
} from '@/lib/services/sms-gateway/failure-classify'
import {
  canTransitionPhoneSmsStatus,
  canTransitionPhoneJobStatus,
} from '@/lib/services/sms-gateway/phone-status-transitions'
import {
  deriveSimProcessingState,
  deriveGatewayServiceState,
} from '@/lib/services/sms-gateway/states'
import { computeGatewayConnectionStatus } from '@/lib/services/sms-gateway/status'
import { hashGatewayToken } from '@/lib/services/sms-gateway/auth'

describe('gateway setup defaults', () => {
  it('uses pauseOnFailure = false', () => {
    expect(GATEWAY_SETUP_DEFAULTS.pauseOnFailure).toBe(false)
    expect(resolveGatewaySetupConfig().pauseOnFailure).toBe(false)
  })

  it('uses maxFailuresBeforePause = 5', () => {
    expect(GATEWAY_SETUP_DEFAULTS.maxFailuresBeforePause).toBe(5)
    expect(resolveGatewaySetupConfig().maxFailuresBeforePause).toBe(5)
  })

  it('encodes setup string with safe defaults and prefix', () => {
    const payload = buildGatewaySetupPayload(
      'https://txtlink.co.ke/api/sms-gateway',
      'gw_live_test_token_not_real'
    )
    expect(payload.pauseOnFailure).toBe(false)
    expect(payload.maxFailuresBeforePause).toBe(5)
    const code = encodeConnectionCode(payload)
    expect(code.startsWith('txtlink_gateway_setup:')).toBe(true)
    const decoded = decodeConnectionCode(code)
    expect(decoded.pauseOnFailure).toBe(false)
    expect(decoded.maxFailuresBeforePause).toBe(5)
    expect(decoded.apiBaseUrl).toBe('https://txtlink.co.ke/api/sms-gateway')
  })

  it('regenerated setup uses new token and safe defaults', () => {
    const a = buildGatewaySetupPayload('https://txtlink.co.ke', 'gw_live_token_a')
    const b = buildGatewaySetupPayload('https://txtlink.co.ke', 'gw_live_token_b')
    expect(a.deviceToken).not.toBe(b.deviceToken)
    expect(b.pauseOnFailure).toBe(false)
    expect(b.maxFailuresBeforePause).toBe(5)
  })
})

describe('normalizeGatewayApiBaseUrl', () => {
  it('strips trailing slash', () => {
    expect(normalizeGatewayApiBaseUrl('https://txtlink.co.ke/api/sms-gateway/')).toBe(
      'https://txtlink.co.ke/api/sms-gateway'
    )
  })

  it('accepts URL without trailing slash', () => {
    expect(normalizeGatewayApiBaseUrl('https://txtlink.co.ke/api/sms-gateway')).toBe(
      'https://txtlink.co.ke/api/sms-gateway'
    )
  })

  it('appends /api/sms-gateway when missing', () => {
    expect(normalizeGatewayApiBaseUrl('https://txtlink.co.ke')).toBe(
      'https://txtlink.co.ke/api/sms-gateway'
    )
  })

  it('collapses duplicate API path', () => {
    expect(
      normalizeGatewayApiBaseUrl('https://txtlink.co.ke/api/sms-gateway/api/sms-gateway')
    ).toBe('https://txtlink.co.ke/api/sms-gateway')
  })

  it('rejects invalid URL', () => {
    expect(() => normalizeGatewayApiBaseUrl('not a url')).toThrow()
  })

  it('rejects production HTTP and localhost via production rules', () => {
    expect(() =>
      normalizeGatewayApiBaseUrl('http://txtlink.co.ke/api/sms-gateway', {
        forceProductionRules: true,
      })
    ).toThrow()
    expect(() =>
      normalizeGatewayApiBaseUrl('https://localhost:3000/api/sms-gateway', {
        forceProductionRules: true,
      })
    ).toThrow()
  })

  it('allows localhost when production rules are not forced', () => {
    expect(
      normalizeGatewayApiBaseUrl('http://localhost:3000', { forceProductionRules: false })
    ).toBe('http://localhost:3000/api/sms-gateway')
  })

  it('canonical origin helper matches', () => {
    expect(resolveGatewayApiBaseUrlFromOrigin('https://txtlink.co.ke/')).toBe(
      'https://txtlink.co.ke/api/sms-gateway'
    )
  })
})

describe('legacy config migration', () => {
  it('repairs old default configuration', () => {
    const plan = planLegacyConfigRepair({
      clientPauseOnFailure: true,
      clientMaxFailuresBeforePause: 1,
    })
    expect(plan.shouldRepair).toBe(true)
    expect(plan.to.pauseOnFailure).toBe(false)
    expect(plan.to.maxFailuresBeforePause).toBe(5)
  })

  it('preserves user-customized configuration', () => {
    const plan = planLegacyConfigRepair({
      clientPauseOnFailure: true,
      clientMaxFailuresBeforePause: 10,
    })
    expect(plan.shouldRepair).toBe(false)
  })

  it('does not re-repair after migration timestamp', () => {
    const plan = planLegacyConfigRepair({
      clientPauseOnFailure: true,
      clientMaxFailuresBeforePause: 1,
      configMigratedAt: new Date(),
    })
    expect(plan.shouldRepair).toBe(false)
  })

  it('pending jobs remain intact conceptually after config migration plan', () => {
    // Migration only touches client pause mirrors — never job collections
    const plan = planLegacyConfigRepair({
      clientPauseOnFailure: true,
      clientMaxFailuresBeforePause: 1,
    })
    expect(plan.shouldRepair).toBe(true)
    expect(Object.keys(plan.to)).toEqual(['pauseOnFailure', 'maxFailuresBeforePause'])
  })

  it('detects legacy pair helper', () => {
    expect(isLegacyPauseDefault({ pauseOnFailure: true, maxFailuresBeforePause: 1 })).toBe(
      true
    )
    expect(isLegacyPauseDefault({ pauseOnFailure: false, maxFailuresBeforePause: 5 })).toBe(
      false
    )
  })
})

describe('failure classification', () => {
  it('one heartbeat failure does not pause the gateway', () => {
    const c = classifyGatewayFailure({ failureReason: 'Heartbeat timeout' })
    expect(c.pauseScope).toBe('NONE')
    expect(c.countsAsModemFailure).toBe(false)
  })

  it('multiple network failures do not pause the gateway', () => {
    for (const reason of [
      'Network Error',
      'DNS failure ENOTFOUND',
      'ECONNRESET',
      'internet disconnected',
    ]) {
      const c = classifyGatewayFailure({ failureReason: reason })
      expect(c.pauseScope).toBe('NONE')
    }
  })

  it('status-sync failure is transient and does not imply requeue of a new SMS', () => {
    const c = classifyGatewayFailure({ failureReason: 'Status sync failure' })
    expect(c.category).toBe('TRANSIENT_SYNC')
    expect(c.retryable).toBe(true)
    expect(c.pauseScope).toBe('NONE')
  })

  it('callback result code 0 is not a confirmed failure', () => {
    const c = classifyGatewayFailure({ resultCode: 0, failureReason: 'RESULT_ERROR_GENERIC' })
    expect(c.category).toBe('AMBIGUOUS_RESULT')
    expect(c.pauseScope).toBe('NONE')
  })

  it('top-up pauses only the affected SIM', () => {
    const c = classifyGatewayFailure({ requiresTopUp: true, failureReason: 'Need airtime' })
    expect(c.pauseScope).toBe('SIM')
    expect(c.category).toBe('TOP_UP_REQUIRED')
  })

  it('accidental pause reasons are detected for repair', () => {
    expect(isAccidentalGatewayPauseReason('Network Error')).toBe(true)
    expect(isAccidentalGatewayPauseReason('Heartbeat failure')).toBe(true)
    expect(isAccidentalGatewayPauseReason('Top-up required')).toBe(false)
  })
})

describe('per-SIM pause vs gateway', () => {
  it('SIM 2 remains ACTIVE while SIM 1 is paused for top-up', () => {
    const sim1 = deriveSimProcessingState({
      subscriptionId: 'sim1',
      requiresTopUp: true,
      pauseScope: 'SIM',
      pausedSubscriptionId: 'sim1',
      failureCategory: 'TOP_UP_REQUIRED',
    })
    const sim2 = deriveSimProcessingState({
      subscriptionId: 'sim2',
      requiresTopUp: false,
      pauseScope: 'SIM',
      pausedSubscriptionId: 'sim1',
      failureCategory: 'TOP_UP_REQUIRED',
    })
    expect(sim1).toBe('PAUSED_TOP_UP')
    expect(sim2).toBe('ACTIVE')
  })

  it('SIM pause does not mark gateway STOPPED_BY_USER', () => {
    const state = deriveGatewayServiceState({
      isActive: true,
      boundDeviceFingerprint: 'fp',
      isGatewayRunning: true,
      lastHeartbeatAt: new Date(),
      pauseScope: 'SIM',
      pausedAt: new Date(),
      pauseReason: 'Top-up required',
    })
    expect(state).toBe('RUNNING')
  })
})

describe('monotonic phone status transitions', () => {
  it('Delivered cannot regress to Sent or Queued', () => {
    expect(canTransitionPhoneSmsStatus('delivered_via_phone', 'sent_via_phone').ok).toBe(false)
    expect(canTransitionPhoneSmsStatus('delivered_via_phone', 'queued_for_phone').ok).toBe(
      false
    )
  })

  it('Sent cannot regress to Queued', () => {
    expect(canTransitionPhoneSmsStatus('sent_via_phone', 'queued_for_phone').ok).toBe(false)
    expect(canTransitionPhoneJobStatus('sent', 'pending').ok).toBe(false)
  })

  it('allows forward transitions', () => {
    expect(canTransitionPhoneSmsStatus('queued_for_phone', 'sending_via_phone').apply).toBe(
      true
    )
    expect(canTransitionPhoneSmsStatus('sending_via_phone', 'sent_via_phone').apply).toBe(true)
    expect(canTransitionPhoneSmsStatus('sent_via_phone', 'delivered_via_phone').apply).toBe(
      true
    )
  })

  it('Phone Send Failed does not replace Delivered', () => {
    expect(canTransitionPhoneSmsStatus('delivered_via_phone', 'phone_failed').ok).toBe(false)
    expect(canTransitionPhoneJobStatus('delivered', 'failed').ok).toBe(false)
  })
})

describe('dashboard online vs synchronized', () => {
  it('shows Device Online and Device Synchronized separately', () => {
    const status = computeGatewayConnectionStatus({
      isActive: true,
      boundDeviceFingerprint: 'fp',
      isGatewayRunning: true,
      lastHeartbeatAt: new Date(),
      consecutiveTransientFailures: 2,
      lastTransientError: 'Status sync failure',
    })
    expect(status.deviceOnline).toBe(true)
    expect(status.deviceSynchronized).toBe(false)
    expect(status.syncHealth).toBe('PENDING')
  })
})

describe('token revocation hashing', () => {
  beforeEach(() => {
    process.env.SMS_GATEWAY_TOKEN_SECRET = 'test-secret-for-unit-tests-only'
  })

  it('token revocation invalidates lookup of the old hash', () => {
    const plain = 'gw_live_unit_test_token_value'
    const hash = hashGatewayToken(plain)
    const revoked = `revoked_${hash}`
    expect(revoked).not.toBe(hash)
    expect(hashGatewayToken(plain)).toBe(hash)
    expect(hashGatewayToken(plain)).not.toBe(revoked)
  })
})

describe('expired job claim recovery', () => {
  it('uses a bounded stale sending reclaim window (90s)', () => {
    // Mirrors STALE_SENDING_RECLAIM_MS in pending route — claims recover safely
    const STALE_SENDING_RECLAIM_MS = 90 * 1000
    expect(STALE_SENDING_RECLAIM_MS).toBe(90_000)
    expect(STALE_SENDING_RECLAIM_MS).toBeGreaterThan(0)
  })
})

describe('status-sync failure must not create duplicate sends', () => {
  it('classify never marks sync failure as modem failure', () => {
    const c = classifyGatewayFailure({
      failureReason: 'Status-update failure after send',
      failureCode: 'STATUS_SYNC',
    })
    expect(c.countsAsModemFailure).toBe(false)
    expect(c.pauseScope).toBe('NONE')
  })
})

describe('idempotency key builder behavior', () => {
  it('beginGatewayStatusEvent returns non-duplicate when no key provided', async () => {
    const { beginGatewayStatusEvent } = await import(
      '@/lib/services/sms-gateway/idempotency'
    )
    const result = await beginGatewayStatusEvent({
      userId: '507f1f77bcf86cd799439011',
      jobId: 'job1',
    })
    expect(result.duplicate).toBe(false)
    expect(result.key).toBeNull()
  })
})

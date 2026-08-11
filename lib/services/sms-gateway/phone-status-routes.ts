import mongoose from 'mongoose'
import type { ISmsFallbackJob, ISmsGatewayDevice } from '@/lib/db/models'
import {
  canTransitionCanonical,
  toCanonicalStatus,
  type CanonicalPhoneStatus,
} from '@/lib/services/sms-gateway/canonical-status'

/** Accepted JSON body fields for Android status callbacks (sent / delivered). */
export interface GatewayStatusBody {
  deviceName?: string
  simLabel?: string
  deviceId?: string
  claimToken?: string | null
  attemptId?: string | null
  localMessageId?: string | null
  sentAt?: string | number | null
  deliveredAt?: string | number | null
  /** Android may send epoch ms or ISO text under `timestamp`. */
  timestamp?: string | number | null
  isGatewayRunning?: boolean
}

export interface ParsedGatewayStatusBody {
  deviceName: string
  simLabel: string
  claimToken: string | null
  attemptId: string | null
  /** True only when BOTH claimToken and attemptId are absent (legacy Android). */
  legacyMode: boolean
  localMessageId: string | null
  eventAt: Date
}

export type PhoneStatusRouteKind = 'sent' | 'delivered'

export type PhoneStatusRejectCode =
  | 'STALE_ATTEMPT'
  | 'STATUS_REGRESSION'
  | 'CLAIM_TOKEN_MISMATCH'
  | 'ATTEMPT_ID_MISMATCH'
  | 'WRONG_DEVICE'
  | 'ATTEMPT_REQUIRED'
  | 'NOT_FOUND'
  | 'CONFLICT'

export interface PhoneStatusReject {
  ok: false
  httpStatus: number
  code: PhoneStatusRejectCode
  message: string
  canonicalStatus?: CanonicalPhoneStatus | null
}

export interface PhoneStatusAccept {
  ok: true
  duplicate: boolean
  jobStatus: 'sent' | 'delivered'
  canonicalStatus: 'SENT_VIA_PHONE' | 'DELIVERED_VIA_PHONE'
  serverRevision: number | null
  /** Job statuses eligible for the atomic findOneAndUpdate filter. */
  eligibleStatuses: string[]
  /** Recovering SUBMISSION_UNKNOWN (or legacy SENDING_TIMEOUT failed) for same attempt. */
  lateCallback: boolean
}

export type PhoneStatusPrecheck = PhoneStatusReject | PhoneStatusAccept

/**
 * Statuses from which a matching /sent may advance to SENT_VIA_PHONE.
 * `failed` is included ONLY for legacy rows incorrectly marked PHONE_SEND_FAILED
 * with failureCode=SENDING_TIMEOUT before the SUBMISSION_UNKNOWN fix.
 */
const SENT_ELIGIBLE = [
  'sending',
  'claimed',
  'pending',
  'submission_unknown',
  'failed',
] as const

const DELIVERED_ELIGIBLE = [
  'sending',
  'claimed',
  'pending',
  'sent',
  'submission_unknown',
  'failed',
] as const

function readStringField(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed || null
}

/** Never returns Invalid Date — falls back to now. */
export function parseStatusTimestamp(...candidates: unknown[]): Date {
  for (const value of candidates) {
    if (value == null || value === '') continue
    if (typeof value === 'number' && Number.isFinite(value)) {
      const d = new Date(value)
      if (!Number.isNaN(d.getTime())) return d
      continue
    }
    if (typeof value === 'string') {
      const trimmed = value.trim()
      if (!trimmed) continue
      const asNumber = Number(trimmed)
      if (/^\d+$/.test(trimmed) && Number.isFinite(asNumber)) {
        const d = new Date(asNumber)
        if (!Number.isNaN(d.getTime())) return d
      }
      const d = new Date(trimmed)
      if (!Number.isNaN(d.getTime())) return d
    }
  }
  return new Date()
}

export function parseGatewayStatusBody(
  body: Record<string, unknown>,
  kind: PhoneStatusRouteKind
): ParsedGatewayStatusBody {
  const claimToken = readStringField(body.claimToken)
  const attemptId = readStringField(body.attemptId)
  const timestampCandidates =
    kind === 'delivered'
      ? [body.deliveredAt, body.sentAt, body.timestamp]
      : [body.sentAt, body.timestamp, body.deliveredAt]

  return {
    deviceName: readStringField(body.deviceName) || '',
    simLabel: readStringField(body.simLabel) || '',
    claimToken,
    attemptId,
    legacyMode: !claimToken && !attemptId,
    localMessageId: readStringField(body.localMessageId),
    eventAt: parseStatusTimestamp(...timestampCandidates),
  }
}

export function maskGatewayJobId(jobId: string): string {
  if (!jobId) return 'unknown'
  if (jobId.length <= 8) return `${jobId.slice(0, 2)}…`
  return `${jobId.slice(0, 4)}…${jobId.slice(-4)}`
}

export function logPhoneStatusEvent(
  event:
    | 'PHONE_SENT_STATUS_RECEIVED'
    | 'PHONE_SENT_STATUS_ACK'
    | 'PHONE_DELIVERED_STATUS_RECEIVED'
    | 'PHONE_DELIVERED_STATUS_ACK'
    | 'PHONE_STATUS_ROUTE_ERROR'
    | 'PHONE_STATUS_SMS_PROJECTION_ERROR',
  details: Record<string, unknown>
): void {
  console.log(
    '[sms-gateway-status]',
    JSON.stringify({ event, at: new Date().toISOString(), ...details })
  )
}

/**
 * Job is atomic-mode when it was claimed with an attemptId.
 * Atomic /sent and /delivered callbacks MUST carry the same attemptId.
 */
export function isAtomicJob(
  existing: Pick<ISmsFallbackJob, 'attemptId'>
): boolean {
  return Boolean(existing.attemptId)
}

/**
 * Late recovery is allowed only for:
 * - SUBMISSION_UNKNOWN (correct timeout semantics after /sending)
 * - legacy PHONE_SEND_FAILED with failureCode SENDING_TIMEOUT (migration)
 *
 * True modem failures (PHONE_SEND_FAILED without SENDING_TIMEOUT) are NOT recoverable
 * via late SENT — use operator tools if needed.
 */
export function isLateTimeoutRecovery(
  existing: Pick<ISmsFallbackJob, 'status' | 'canonicalStatus' | 'failureCode'>
): boolean {
  const canonical = toCanonicalStatus(existing.status, existing.canonicalStatus)
  if (canonical === 'SUBMISSION_UNKNOWN' || existing.status === 'submission_unknown') {
    return true
  }
  if (
    (existing.status === 'failed' || canonical === 'PHONE_SEND_FAILED') &&
    existing.failureCode === 'SENDING_TIMEOUT'
  ) {
    return true
  }
  return false
}

/**
 * Ownership + attempt identity rules for /sent and /delivered.
 *
 * ATOMIC JOB (job.attemptId set):
 *   - attemptId REQUIRED on callback
 *   - must match job.attemptId exactly (stale attempt → 409)
 *   - claimToken OPTIONAL post-submission: validated only when BOTH sides present
 *
 * LEGACY JOB (no job.attemptId):
 *   - attemptId optional
 *   - device ownership still enforced when owner fields exist
 */
export function validateOwnership(
  existing: Pick<
    ISmsFallbackJob,
    'claimToken' | 'attemptId' | 'claimedByDeviceId' | 'lockedBy' | 'assignedDeviceId'
  >,
  parsed: ParsedGatewayStatusBody,
  lockedBy: string
): PhoneStatusReject | null {
  if (isAtomicJob(existing)) {
    if (!parsed.attemptId) {
      return {
        ok: false,
        httpStatus: 400,
        code: 'ATTEMPT_REQUIRED',
        message: 'attemptId is required for atomic phone jobs',
      }
    }
    if (parsed.attemptId !== existing.attemptId) {
      return {
        ok: false,
        httpStatus: 409,
        code: 'STALE_ATTEMPT',
        message: 'Callback attemptId does not match current job attempt',
      }
    }
    // claimToken is durable only while present; after lease expiry/clear it is NOT required
    if (existing.claimToken && parsed.claimToken && existing.claimToken !== parsed.claimToken) {
      return {
        ok: false,
        httpStatus: 409,
        code: 'CLAIM_TOKEN_MISMATCH',
        message: 'Claim token mismatch',
      }
    }
  } else if (!parsed.legacyMode) {
    // Partial identifiers on a legacy job — still enforce mismatches when present
    if (existing.claimToken && parsed.claimToken && existing.claimToken !== parsed.claimToken) {
      return {
        ok: false,
        httpStatus: 409,
        code: 'CLAIM_TOKEN_MISMATCH',
        message: 'Claim token mismatch',
      }
    }
  }

  const owner = existing.claimedByDeviceId || existing.lockedBy || existing.assignedDeviceId
  if (owner && owner !== lockedBy) {
    return {
      ok: false,
      httpStatus: 403,
      code: 'WRONG_DEVICE',
      message: 'Job owned by another device',
    }
  }

  return null
}

export function precheckPhoneSentStatus(
  existing: ISmsFallbackJob | null,
  parsed: ParsedGatewayStatusBody,
  lockedBy: string
): PhoneStatusPrecheck {
  if (!existing) {
    return { ok: false, httpStatus: 404, code: 'NOT_FOUND', message: 'Job not found' }
  }

  const canonicalBefore = toCanonicalStatus(existing.status, existing.canonicalStatus)

  if (existing.status === 'sent' || canonicalBefore === 'SENT_VIA_PHONE') {
    if (isAtomicJob(existing)) {
      if (!parsed.attemptId || parsed.attemptId !== existing.attemptId) {
        return {
          ok: false,
          httpStatus: 409,
          code: 'STALE_ATTEMPT',
          message: 'Stale attempt cannot overwrite SENT',
        }
      }
    }
    return {
      ok: true,
      duplicate: true,
      jobStatus: 'sent',
      canonicalStatus: 'SENT_VIA_PHONE',
      serverRevision: existing.serverRevision ?? null,
      eligibleStatuses: [...SENT_ELIGIBLE],
      lateCallback: false,
    }
  }

  // DELIVERED cannot regress to SENT
  if (existing.status === 'delivered' || canonicalBefore === 'DELIVERED_VIA_PHONE') {
    return {
      ok: false,
      httpStatus: 409,
      code: 'STATUS_REGRESSION',
      message: 'Job already delivered — cannot regress to SENT',
      canonicalStatus: 'DELIVERED_VIA_PHONE',
    }
  }

  const lateCallback = isLateTimeoutRecovery(existing)

  if (lateCallback) {
    // Late recovery requires matching attempt identity — never blind overwrite
    if (!existing.attemptId || !parsed.attemptId || parsed.attemptId !== existing.attemptId) {
      return {
        ok: false,
        httpStatus: 409,
        code: 'STALE_ATTEMPT',
        message: 'Late SENT callback requires matching attemptId for this job',
      }
    }
  } else if (!canTransitionCanonical(canonicalBefore, 'SENT_VIA_PHONE')) {
    return {
      ok: false,
      httpStatus: 409,
      code: 'STATUS_REGRESSION',
      message: `Cannot transition ${canonicalBefore} → SENT_VIA_PHONE`,
      canonicalStatus: canonicalBefore,
    }
  }

  // Reject true PHONE_SEND_FAILED (non-timeout) from late SENT
  if (
    (existing.status === 'failed' || canonicalBefore === 'PHONE_SEND_FAILED') &&
    existing.failureCode !== 'SENDING_TIMEOUT'
  ) {
    return {
      ok: false,
      httpStatus: 409,
      code: 'STATUS_REGRESSION',
      message: 'Cannot recover confirmed PHONE_SEND_FAILED via /sent',
      canonicalStatus: 'PHONE_SEND_FAILED',
    }
  }

  const ownershipError = validateOwnership(existing, parsed, lockedBy)
  if (ownershipError) return ownershipError

  return {
    ok: true,
    duplicate: false,
    jobStatus: 'sent',
    canonicalStatus: 'SENT_VIA_PHONE',
    serverRevision: existing.serverRevision ?? null,
    eligibleStatuses: [...SENT_ELIGIBLE],
    lateCallback,
  }
}

export function precheckPhoneDeliveredStatus(
  existing: ISmsFallbackJob | null,
  parsed: ParsedGatewayStatusBody,
  lockedBy: string
): PhoneStatusPrecheck {
  if (!existing) {
    return { ok: false, httpStatus: 404, code: 'NOT_FOUND', message: 'Job not found' }
  }

  const canonicalBefore = toCanonicalStatus(existing.status, existing.canonicalStatus)

  if (existing.status === 'delivered' || canonicalBefore === 'DELIVERED_VIA_PHONE') {
    if (isAtomicJob(existing)) {
      if (!parsed.attemptId || parsed.attemptId !== existing.attemptId) {
        return {
          ok: false,
          httpStatus: 409,
          code: 'STALE_ATTEMPT',
          message: 'Stale attempt cannot overwrite DELIVERED',
        }
      }
    }
    return {
      ok: true,
      duplicate: true,
      jobStatus: 'delivered',
      canonicalStatus: 'DELIVERED_VIA_PHONE',
      serverRevision: existing.serverRevision ?? null,
      eligibleStatuses: [...DELIVERED_ELIGIBLE],
      lateCallback: false,
    }
  }

  const lateCallback = isLateTimeoutRecovery(existing)

  if (lateCallback) {
    if (!existing.attemptId || !parsed.attemptId || parsed.attemptId !== existing.attemptId) {
      return {
        ok: false,
        httpStatus: 409,
        code: 'STALE_ATTEMPT',
        message: 'Late DELIVERED callback requires matching attemptId for this job',
      }
    }
  } else if (!canTransitionCanonical(canonicalBefore, 'DELIVERED_VIA_PHONE')) {
    return {
      ok: false,
      httpStatus: 409,
      code: 'STATUS_REGRESSION',
      message: `Cannot transition ${canonicalBefore} → DELIVERED_VIA_PHONE`,
      canonicalStatus: canonicalBefore,
    }
  }

  if (
    (existing.status === 'failed' || canonicalBefore === 'PHONE_SEND_FAILED') &&
    existing.failureCode !== 'SENDING_TIMEOUT'
  ) {
    return {
      ok: false,
      httpStatus: 409,
      code: 'STATUS_REGRESSION',
      message: 'Cannot recover confirmed PHONE_SEND_FAILED via /delivered',
      canonicalStatus: 'PHONE_SEND_FAILED',
    }
  }

  const ownershipError = validateOwnership(existing, parsed, lockedBy)
  if (ownershipError) return ownershipError

  return {
    ok: true,
    duplicate: false,
    jobStatus: 'delivered',
    canonicalStatus: 'DELIVERED_VIA_PHONE',
    serverRevision: existing.serverRevision ?? null,
    eligibleStatuses: [...DELIVERED_ELIGIBLE],
    lateCallback,
  }
}

export function buildSentJobUpdate(
  parsed: ParsedGatewayStatusBody,
  device: ISmsGatewayDevice,
  lateCallback: boolean
): Record<string, unknown> {
  const $set: Record<string, unknown> = {
    status: 'sent',
    phoneStatus: 'sent',
    canonicalStatus: 'SENT_VIA_PHONE',
    sentAt: parsed.eventAt,
    phoneSentAt: parsed.eventAt,
    deviceName: parsed.deviceName || device.boundDeviceName,
    simLabel: parsed.simLabel || device.boundSimLabel,
  }
  if (parsed.localMessageId) {
    $set.localMessageId = parsed.localMessageId
  }
  return {
    $set,
    $unset: {
      resetReason: 1,
      claimExpiresAt: 1,
      ...(lateCallback
        ? { failureReason: 1, failureCode: 1, failedAt: 1 }
        : {}),
    },
    $inc: { serverRevision: 1 },
  }
}

export function buildDeliveredJobUpdate(
  existing: Pick<ISmsFallbackJob, 'sentAt' | 'phoneSentAt' | 'localMessageId'>,
  parsed: ParsedGatewayStatusBody,
  device: ISmsGatewayDevice,
  lateCallback: boolean
): Record<string, unknown> {
  const sentAt = existing.sentAt || existing.phoneSentAt || parsed.eventAt
  const $set: Record<string, unknown> = {
    status: 'delivered',
    phoneStatus: 'delivered',
    canonicalStatus: 'DELIVERED_VIA_PHONE',
    deliveredAt: parsed.eventAt,
    phoneDeliveredAt: parsed.eventAt,
    sentAt,
    phoneSentAt: existing.phoneSentAt || existing.sentAt || parsed.eventAt,
    deviceName: parsed.deviceName || device.boundDeviceName,
    simLabel: parsed.simLabel || device.boundSimLabel,
    localMessageId: parsed.localMessageId || existing.localMessageId,
  }
  return {
    $set,
    $unset: {
      resetReason: 1,
      claimExpiresAt: 1,
      claimToken: 1,
      lockedAt: 1,
      lockedBy: 1,
      ...(lateCallback
        ? { failureReason: 1, failureCode: 1, failedAt: 1 }
        : {}),
    },
    $inc: { serverRevision: 1 },
  }
}

/** Guard SmsMessage updates — invalid originalSmsId must not 500 the status route. */
export function isValidSmsMessageId(originalSmsId: string | undefined | null): boolean {
  if (!originalSmsId || typeof originalSmsId !== 'string') return false
  if (originalSmsId.startsWith('test_')) return false
  return mongoose.Types.ObjectId.isValid(originalSmsId)
}

export function phoneStatusErrorReason(error: unknown): string {
  if (error instanceof Error) {
    if (error.name === 'CastError') return 'CAST_ERROR'
    if (error.name === 'ValidationError') return 'VALIDATION_ERROR'
    return error.name || 'UNKNOWN_ERROR'
  }
  return 'UNKNOWN_ERROR'
}

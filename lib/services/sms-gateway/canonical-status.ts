/**
 * Canonical phone-gateway job statuses (monotonic pipeline).
 *
 * QUEUED_FOR_PHONE → CLAIMED_FOR_PHONE → SUBMISSION_STARTED → SENT_VIA_PHONE → DELIVERED_VIA_PHONE
 * Also: SUBMISSION_UNKNOWN | PHONE_SEND_FAILED | TOP_UP_REQUIRED | CANCELLED
 */

export const CANONICAL_PHONE_STATUSES = [
  'QUEUED_FOR_PHONE',
  'CLAIMED_FOR_PHONE',
  'SUBMISSION_STARTED',
  'SENT_VIA_PHONE',
  'DELIVERED_VIA_PHONE',
  'SUBMISSION_UNKNOWN',
  'PHONE_SEND_FAILED',
  'TOP_UP_REQUIRED',
  'CANCELLED',
] as const

export type CanonicalPhoneStatus = (typeof CANONICAL_PHONE_STATUSES)[number]

/** Persistable job.status values that map to the canonical pipeline. */
export const JOB_STATUS_BY_CANONICAL: Record<CanonicalPhoneStatus, string> = {
  QUEUED_FOR_PHONE: 'pending',
  CLAIMED_FOR_PHONE: 'claimed',
  SUBMISSION_STARTED: 'sending',
  SENT_VIA_PHONE: 'sent',
  DELIVERED_VIA_PHONE: 'delivered',
  SUBMISSION_UNKNOWN: 'submission_unknown',
  PHONE_SEND_FAILED: 'failed',
  TOP_UP_REQUIRED: 'blocked',
  CANCELLED: 'cancelled',
}

export const CANONICAL_BY_JOB_STATUS: Record<string, CanonicalPhoneStatus> = {
  pending: 'QUEUED_FOR_PHONE',
  claimed: 'CLAIMED_FOR_PHONE',
  sending: 'SUBMISSION_STARTED',
  sent: 'SENT_VIA_PHONE',
  delivered: 'DELIVERED_VIA_PHONE',
  submission_unknown: 'SUBMISSION_UNKNOWN',
  failed: 'PHONE_SEND_FAILED',
  blocked: 'TOP_UP_REQUIRED',
  cancelled: 'CANCELLED',
}

/** Numeric rank for monotonic enforcement (higher = later / terminal-ish). */
const RANK: Record<CanonicalPhoneStatus, number> = {
  QUEUED_FOR_PHONE: 10,
  CLAIMED_FOR_PHONE: 20,
  SUBMISSION_STARTED: 30,
  SENT_VIA_PHONE: 40,
  DELIVERED_VIA_PHONE: 50,
  SUBMISSION_UNKNOWN: 35,
  PHONE_SEND_FAILED: 45,
  TOP_UP_REQUIRED: 45,
  CANCELLED: 60,
}

export function toCanonicalStatus(
  status?: string | null,
  canonicalStatus?: string | null
): CanonicalPhoneStatus | null {
  if (canonicalStatus && (CANONICAL_PHONE_STATUSES as readonly string[]).includes(canonicalStatus)) {
    return canonicalStatus as CanonicalPhoneStatus
  }
  if (!status) return null
  return CANONICAL_BY_JOB_STATUS[status] || null
}

export function canonicalRank(status: CanonicalPhoneStatus): number {
  return RANK[status]
}

/**
 * Allowed forward transitions. Regression (e.g. DELIVERED → SENT) is forbidden.
 * Same-status is allowed (idempotent).
 */
const ALLOWED: Record<CanonicalPhoneStatus, ReadonlySet<CanonicalPhoneStatus>> = {
  QUEUED_FOR_PHONE: new Set([
    'QUEUED_FOR_PHONE',
    'CLAIMED_FOR_PHONE',
    'CANCELLED',
    'PHONE_SEND_FAILED',
    'TOP_UP_REQUIRED',
  ]),
  CLAIMED_FOR_PHONE: new Set([
    'CLAIMED_FOR_PHONE',
    'SUBMISSION_STARTED',
    'QUEUED_FOR_PHONE', // safe expired reclaim only
    'SUBMISSION_UNKNOWN',
    'CANCELLED',
    'PHONE_SEND_FAILED',
    'TOP_UP_REQUIRED',
  ]),
  SUBMISSION_STARTED: new Set([
    'SUBMISSION_STARTED',
    'SENT_VIA_PHONE',
    'SUBMISSION_UNKNOWN',
    'PHONE_SEND_FAILED',
    'TOP_UP_REQUIRED',
    'CANCELLED',
    'DELIVERED_VIA_PHONE', // rare direct DLR
  ]),
  SENT_VIA_PHONE: new Set([
    'SENT_VIA_PHONE',
    'DELIVERED_VIA_PHONE',
    'PHONE_SEND_FAILED', // unusual but allow late failure report
    'CANCELLED',
  ]),
  DELIVERED_VIA_PHONE: new Set(['DELIVERED_VIA_PHONE']),
  SUBMISSION_UNKNOWN: new Set([
    'SUBMISSION_UNKNOWN',
    'SENT_VIA_PHONE',
    'DELIVERED_VIA_PHONE',
    'PHONE_SEND_FAILED',
    'TOP_UP_REQUIRED',
    'CANCELLED',
    // NOT back to QUEUED_FOR_PHONE / CLAIMED automatically
  ]),
  PHONE_SEND_FAILED: new Set(['PHONE_SEND_FAILED', 'QUEUED_FOR_PHONE', 'CANCELLED']),
  TOP_UP_REQUIRED: new Set(['TOP_UP_REQUIRED', 'QUEUED_FOR_PHONE', 'CANCELLED']),
  CANCELLED: new Set(['CANCELLED', 'QUEUED_FOR_PHONE']), // reopen only via explicit ops
}

export function canTransitionCanonical(
  from: CanonicalPhoneStatus | null | undefined,
  to: CanonicalPhoneStatus
): boolean {
  if (!from) return true
  if (from === to) return true
  return ALLOWED[from]?.has(to) ?? false
}

/** True when an older attempt must not overwrite a newer attempt. */
export function isStaleAttempt(
  jobAttemptId: string | null | undefined,
  incomingAttemptId: string | null | undefined
): boolean {
  if (!incomingAttemptId) return false
  if (!jobAttemptId) return false
  return jobAttemptId !== incomingAttemptId
}

export function fallbackStatusForCanonical(
  canonical: CanonicalPhoneStatus
): string | null {
  switch (canonical) {
    case 'QUEUED_FOR_PHONE':
      return 'queued_for_phone'
    case 'CLAIMED_FOR_PHONE':
    case 'SUBMISSION_STARTED':
      return 'sending_via_phone'
    case 'SENT_VIA_PHONE':
      return 'sent_via_phone'
    case 'DELIVERED_VIA_PHONE':
      return 'delivered_via_phone'
    case 'PHONE_SEND_FAILED':
      return 'phone_failed'
    case 'TOP_UP_REQUIRED':
      return 'phone_requires_topup'
    case 'SUBMISSION_UNKNOWN':
      return 'sending_via_phone'
    case 'CANCELLED':
      return null
    default:
      return null
  }
}

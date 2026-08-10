/** Phone gateway / fallback status helpers — shared across API and UI. */

/** Confirmed handset delivery only — SENT_VIA_PHONE is not DELIVERED. */
export const PHONE_DELIVERED_FALLBACK_STATUSES = ['delivered_via_phone'] as const

export const ACTIVE_FALLBACK_JOB_STATUSES = [
  'pending',
  'claimed',
  'sending',
  'submission_unknown',
] as const

export const COMPLETED_FALLBACK_JOB_STATUSES = [
  'delivered',
  'sent',
  'failed',
  'blocked',
  'cancelled',
] as const

export function isPhoneDeliveredFallbackStatus(status?: string | null): boolean {
  if (!status) return false
  return (PHONE_DELIVERED_FALLBACK_STATUSES as readonly string[]).includes(status)
}

export function isActiveFallbackJobStatus(status?: string | null): boolean {
  if (!status) return false
  return (ACTIVE_FALLBACK_JOB_STATUSES as readonly string[]).includes(status)
}

export function isCompletedFallbackJobStatus(status?: string | null): boolean {
  if (!status) return false
  return (COMPLETED_FALLBACK_JOB_STATUSES as readonly string[]).includes(status)
}

export function getPhoneJobStatusLabel(status: string, phoneStatus?: string | null): string {
  const ps = phoneStatus || status
  switch (ps) {
    case 'pending':
    case 'QUEUED_FOR_PHONE':
      return 'Pending'
    case 'claimed':
    case 'CLAIMED_FOR_PHONE':
      return 'Claimed'
    case 'sending':
    case 'SUBMISSION_STARTED':
      return 'Sending'
    case 'submission_unknown':
    case 'SUBMISSION_UNKNOWN':
      return 'Submission Unknown'
    case 'sent':
    case 'SENT_VIA_PHONE':
    case 'sent_via_phone':
      return 'Sent via Phone'
    case 'delivered':
    case 'DELIVERED_VIA_PHONE':
    case 'delivered_via_phone':
      return 'Delivered via Phone'
    case 'requires_topup':
    case 'blocked':
    case 'TOP_UP_REQUIRED':
      return 'Phone Needs Reload'
    case 'failed':
    case 'PHONE_SEND_FAILED':
      return 'Failed via Phone'
    case 'cancelled':
    case 'CANCELLED':
      return 'Cancelled'
    default:
      return status
  }
}

export function getFallbackStatusLabel(status?: string | null, requiresPhoneTopUp?: boolean): string {
  switch (status) {
    case 'retrying_provider':
      return 'Retrying Provider'
    case 'retry_waiting_delivery':
      return 'Retry Waiting Delivery'
    case 'queued_for_phone':
      return 'Queued for Phone'
    case 'sending_via_phone':
      return 'Sending via Phone'
    case 'sent_via_phone':
      return 'Sent via Phone'
    case 'delivered_via_phone':
      return 'Delivered via Phone'
    case 'phone_requires_topup':
      return 'Phone Needs Reload'
    case 'phone_failed':
      return requiresPhoneTopUp ? 'Failed via Phone — Reload SMS' : 'Failed via Phone'
    default:
      return status || ''
  }
}

/** Phone gateway / fallback status helpers — shared across API and UI. */

export const PHONE_DELIVERED_FALLBACK_STATUSES = [
  'delivered_via_phone',
  'sent_via_phone',
] as const

export const ACTIVE_FALLBACK_JOB_STATUSES = ['pending', 'sending'] as const

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
      return 'Pending'
    case 'sending':
      return 'Sending'
    case 'delivered':
    case 'sent':
      return 'Delivered via Phone'
    case 'requires_topup':
    case 'blocked':
      return 'Phone Needs Reload'
    case 'failed':
      return 'Phone Failed'
    case 'cancelled':
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
    case 'delivered_via_phone':
    case 'sent_via_phone':
      return 'Delivered via Phone'
    case 'phone_requires_topup':
      return 'Phone Needs Reload'
    case 'phone_failed':
      return requiresPhoneTopUp ? 'Phone Send Failed - Reload SMS' : 'Phone Send Failed'
    default:
      return status || ''
  }
}

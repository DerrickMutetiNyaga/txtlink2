export function isSmsFallbackEnabled(): boolean {
  return process.env.SMS_FALLBACK_ENABLED !== 'false'
}

export function isProviderRetryEnabled(): boolean {
  return process.env.SMS_PROVIDER_RETRY_ENABLED !== 'false'
}

export function getFallbackStaleMinutes(): number {
  const n = parseInt(process.env.SMS_FALLBACK_STALE_MINUTES || '7', 10)
  return Number.isFinite(n) && n > 0 ? n : 7
}

export function getProviderRetryWaitMinutes(): number {
  const n = parseInt(process.env.SMS_PROVIDER_RETRY_WAIT_MINUTES || '7', 10)
  return Number.isFinite(n) && n > 0 ? n : 7
}

export function getCronSecret(): string | undefined {
  return process.env.CRON_SECRET?.trim() || undefined
}

export const FALLBACK_PHONE_STATUSES = [
  'queued_for_phone',
  'sending_via_phone',
  'delivered_via_phone',
  'sent_via_phone',
] as const

export const FAILED_ORIGINAL_STATUSES = [
  'failed',
  'undelivered',
  'rejected',
  'expired',
  'timeout',
  'undeliverable',
  'provider_timeout',
] as const

export const DLR_RETRY_KEYWORDS = [
  'gateway credentials',
  'sender id invalid',
  'timeout',
  'blacklisted sender id',
  'operation aborted',
  'provider unavailable',
  'invalid sender',
  'dlr failed',
] as const

export const SMS_PENDING_FOR_FALLBACK = ['queued', 'processing', 'retrying'] as const

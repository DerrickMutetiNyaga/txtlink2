export function isSmsFallbackEnabled(): boolean {
  return process.env.SMS_FALLBACK_ENABLED !== 'false'
}

export function isProviderRetryEnabled(): boolean {
  return process.env.SMS_PROVIDER_RETRY_ENABLED !== 'false'
}

/** Minutes without delivery before queuing the Android phone gateway (also used for stale sent detection). */
export function getFallbackStaleMinutes(): number {
  const n = parseInt(process.env.SMS_FALLBACK_STALE_MINUTES || '3', 10)
  return Number.isFinite(n) && n > 0 ? n : 3
}

export function getProviderRetryWaitMinutes(): number {
  const n = parseInt(process.env.SMS_PROVIDER_RETRY_WAIT_MINUTES || '3', 10)
  return Number.isFinite(n) && n > 0 ? n : 3
}

export function getCronSecret(): string | undefined {
  return process.env.CRON_SECRET?.trim() || undefined
}

/** Reuses worker BATCH_SIZE — how many SMS to claim per fallback scan round. */
export function getFallbackScanBatchSize(): number {
  const n = parseInt(process.env.BATCH_SIZE || '500', 10)
  if (!Number.isFinite(n)) return 500
  return Math.min(Math.max(n, 50), 2000)
}

/** Reuses WORKER_CONCURRENCY — parallel status pings / phone queue ops per round. */
export function getFallbackScanConcurrency(): number {
  const n = parseInt(process.env.WORKER_CONCURRENCY || '10', 10)
  if (!Number.isFinite(n)) return 10
  return Math.min(Math.max(n, 2), 50)
}

/** Max drain rounds per cron invoke so a surge can clear in one scan. */
export function getFallbackScanMaxRounds(): number {
  return 10
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
  'not_sent',
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

export const SMS_PENDING_FOR_FALLBACK = [
  'queued',
  'processing',
  'retrying',
  'sent',
  'provider_sent',
  'accepted',
  'submitted',
  'pending',
] as const

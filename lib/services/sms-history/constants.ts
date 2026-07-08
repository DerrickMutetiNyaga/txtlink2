export const DEFAULT_SMS_HISTORY_RETENTION = 10000

export const RETENTION_PRESETS = [1000, 5000, 10000, 25000, 50000, 100000] as const

export const FAILED_LIKE_STATUSES = [
  'failed',
  'expired',
  'rejected',
  'undeliverable',
  'provider_timeout',
] as const

export const ACTIVE_FALLBACK_STATUSES = [
  'queued_for_phone',
  'sending_via_phone',
  'phone_requires_topup',
  'retrying_provider',
  'retry_waiting_delivery',
] as const

export const DELETABLE_STATUSES = ['delivered', 'failed'] as const

export function deriveCampaignLabel(source?: string | null): string {
  switch (source) {
    case 'dashboard':
      return 'Send SMS'
    case 'bulk':
      return 'Bulk SMS'
    case 'api_key':
      return 'API Key'
    case 'username_password':
      return 'Username/Password Client'
    case 'external_client':
      return 'External Client'
    case 'system':
      return 'System'
    case 'test':
      return 'Test'
    default:
      return 'SMS Campaign'
  }
}

export function normalizeRetentionLimit(value: unknown): number | null {
  if (value === 'unlimited' || value === null || value === undefined || value === '') {
    return null
  }
  const n = typeof value === 'number' ? value : parseInt(String(value), 10)
  if (!Number.isFinite(n) || n < 1) return null
  return Math.min(Math.floor(n), 1_000_000)
}

export function getEffectiveRetentionLimit(userLimit?: number | null): number | null {
  if (userLimit === null) return null
  if (userLimit === undefined) return DEFAULT_SMS_HISTORY_RETENTION
  if (userLimit <= 0) return null
  return userLimit
}

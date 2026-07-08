import { ISmsMessage } from '@/lib/db/models'

/** Lowercase status from primary or delivery fields. */
export function normalizeSmsStatus(sms: Pick<ISmsMessage, 'status' | 'deliveryStatus' | 'providerStatus'>): string {
  const raw = sms.status || sms.deliveryStatus || sms.providerStatus || ''
  return String(raw).toLowerCase().trim()
}

export function normalizeRetryStatus(status?: string | null): string {
  return String(status || '').toLowerCase().trim()
}

export const SENT_PENDING_PROVIDER_STATUSES = [
  'sent',
  'provider_sent',
  'accepted',
  'submitted',
  'queued',
  'pending',
  'processing',
  'retrying',
] as const

export const DELIVERED_STATUSES = ['delivered', 'success', 'completed'] as const

export const FAILED_STATUSES = [
  'failed',
  'undelivered',
  'rejected',
  'expired',
  'timeout',
  'not_sent',
  'undeliverable',
  'provider_timeout',
] as const

export const RETRY_SENT_PENDING_STATUSES = [
  'sent',
  'accepted',
  'submitted',
  'provider_sent',
] as const

export function isSentPendingProviderState(normalizedStatus: string): boolean {
  return (SENT_PENDING_PROVIDER_STATUSES as readonly string[]).includes(normalizedStatus)
}

export function isDeliveredState(normalizedStatus: string): boolean {
  return (DELIVERED_STATUSES as readonly string[]).includes(normalizedStatus)
}

export function isFailedState(normalizedStatus: string): boolean {
  return (FAILED_STATUSES as readonly string[]).includes(normalizedStatus)
}

export function isRetrySentPending(status?: string | null): boolean {
  const normalized = normalizeRetryStatus(status)
  return (RETRY_SENT_PENDING_STATUSES as readonly string[]).includes(normalized)
}

export function isRetryFailedState(status?: string | null): boolean {
  const normalized = normalizeRetryStatus(status)
  return (
    normalized === 'failed' ||
    normalized === 'timeout' ||
    (FAILED_STATUSES as readonly string[]).includes(normalized)
  )
}

/** First available timestamp for stale sent detection. */
export function getSmsAgeDate(
  sms: Pick<ISmsMessage, 'sentAt' | 'createdAt' | 'updatedAt'> & {
    providerSentAt?: Date | null
  }
): Date | null {
  const date =
    sms.sentAt ||
    sms.providerSentAt ||
    sms.createdAt ||
    sms.updatedAt ||
    null
  return date ? new Date(date) : null
}

export function getAgeMinutes(date: Date | null | undefined, now = new Date()): number | null {
  if (!date) return null
  return Math.floor((now.getTime() - new Date(date).getTime()) / (60 * 1000))
}

export function isSmsDelivered(sms: ISmsMessage): boolean {
  if (sms.deliveredAt) return true
  if (sms.providerRetryDeliveredAt) return true
  const norm = normalizeSmsStatus(sms)
  if (isDeliveredState(norm)) return true
  const deliveryNorm = String(sms.deliveryStatus || '').toLowerCase()
  if (isDeliveredState(deliveryNorm)) return true
  return false
}

export function isStaleSentPending(sms: ISmsMessage, staleCutoff: Date): boolean {
  if (isSmsDelivered(sms)) return false
  const norm = normalizeSmsStatus(sms)
  if (!isSentPendingProviderState(norm)) return false
  const ageDate = getSmsAgeDate(sms)
  if (!ageDate) return false
  return ageDate <= staleCutoff
}

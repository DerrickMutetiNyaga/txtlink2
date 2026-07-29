/**
 * Auto-mark-delivered feature (super admin toggle).
 *
 * When `autoMarkSentAsDelivered` is enabled in SystemSettings, a message that
 * the provider accepts is immediately finalized as 'delivered' instead of
 * staying 'sent' and waiting for a DLR / status poll. When the toggle is off,
 * the normal lifecycle (sent -> DLR/poll -> delivered) is untouched.
 *
 * All send paths must build their post-accept status update via
 * `postSendStatusFields()` so the behavior stays consistent everywhere.
 */

import { SystemSettings } from '@/lib/db/models'
import { initialNextCheckAt } from './build-synchronizer'

const CACHE_TTL_MS = 30_000

let cache: { value: boolean; expiresAt: number } | null = null

/** Read the toggle from SystemSettings with a short in-memory cache. */
export async function isAutoMarkDeliveredEnabled(): Promise<boolean> {
  const now = Date.now()
  if (cache && cache.expiresAt > now) return cache.value

  try {
    const settings = await SystemSettings.findOne().select('autoMarkSentAsDelivered').lean()
    const value = settings?.autoMarkSentAsDelivered === true
    cache = { value, expiresAt: now + CACHE_TTL_MS }
    return value
  } catch (error) {
    // On a read failure, fall back to the last known value (or the safe default: off)
    console.error('Failed to read autoMarkSentAsDelivered setting:', error)
    return cache?.value ?? false
  }
}

/** Clear the cache so a settings change takes effect immediately in this process. */
export function clearAutoMarkDeliveredCache(): void {
  cache = null
}

/**
 * Status fields to apply to an SmsMessage right after the provider accepts it.
 *
 * - Toggle off (default): mark 'sent' and schedule the delivery-status worker.
 * - Toggle on: finalize as 'delivered' right away (no DLR wait, no polling).
 */
export async function postSendStatusFields(now: Date = new Date()): Promise<Record<string, any>> {
  if (await isAutoMarkDeliveredEnabled()) {
    return {
      status: 'delivered',
      providerStatus: 'SUBMITTED',
      sentAt: now,
      deliveredAt: now,
      deliveryStatus: 'delivered',
      deliveryMethod: 'provider',
      finalizedAt: now,
      lastCheckedAt: now,
      nextCheckAt: null,
    }
  }

  return {
    status: 'sent',
    providerStatus: 'SUBMITTED',
    sentAt: now,
    nextCheckAt: initialNextCheckAt(),
  }
}

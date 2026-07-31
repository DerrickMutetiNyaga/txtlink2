/**
 * Per-user "route ALL SMS via phone gateway" (super admin toggle on the account).
 *
 * When `routeAllSmsViaPhoneGateway` is enabled on a user, every SMS they send
 * skips HostPinnacle completely and is queued straight to their Android phone
 * gateway as a fallback job. Credits are deducted as usual; delivery is
 * confirmed by the phone gateway callbacks (jobs/[jobId]/sent).
 */

import mongoose from 'mongoose'
import { User, SmsMessage, type ISmsMessage } from '@/lib/db/models'
import { createOrUpdatePhoneFallbackJob } from './create-fallback-job'

const CACHE_TTL_MS = 10_000
const cache = new Map<string, { value: boolean; expiresAt: number }>()

/** Read the per-user toggle with a short in-memory cache. */
export async function isPhoneGatewayRoutingEnabled(
  userId: mongoose.Types.ObjectId | string
): Promise<boolean> {
  const key = String(userId)
  const now = Date.now()
  const cached = cache.get(key)
  if (cached && cached.expiresAt > now) return cached.value

  try {
    const user = await User.findById(userId).select('routeAllSmsViaPhoneGateway').lean()
    const value = user?.routeAllSmsViaPhoneGateway === true
    cache.set(key, { value, expiresAt: now + CACHE_TTL_MS })
    return value
  } catch (error) {
    console.error('Failed to read routeAllSmsViaPhoneGateway:', error)
    return cached?.value ?? false
  }
}

/** Clear the cache for a user (or everyone) after the toggle changes. */
export function clearPhoneGatewayRoutingCache(userId?: mongoose.Types.ObjectId | string): void {
  if (userId) cache.delete(String(userId))
  else cache.clear()
}

export interface RouteViaPhoneResult {
  ok: boolean
  jobId?: string
  error?: string
}

/**
 * Queue an already-created SmsMessage straight to the phone gateway.
 * Marks the message as pending phone delivery (no HostPinnacle involved).
 */
export async function routeSmsViaPhoneGateway(
  smsMessageId: mongoose.Types.ObjectId | string
): Promise<RouteViaPhoneResult> {
  const doc = await SmsMessage.findById(smsMessageId).lean()
  if (!doc) return { ok: false, error: 'SMS message not found' }

  const result = await createOrUpdatePhoneFallbackJob(doc as ISmsMessage & { _id: unknown })
  if (!result.ok) {
    await SmsMessage.findByIdAndUpdate(smsMessageId, {
      status: 'failed',
      errorCode: 'PHONE_ROUTE_ERROR',
      errorMessage: result.error || 'Failed to queue message to phone gateway',
      failedAt: new Date(),
      finalizedAt: new Date(),
      nextCheckAt: null,
    })
    return result
  }

  // The queue claim already set fallbackStatus 'queued_for_phone' (shown as
  // "Queued for Phone"). Keep the message pending — no HostPinnacle polling
  // (nextCheckAt stays null); the phone gateway confirms delivery/failure.
  await SmsMessage.findByIdAndUpdate(smsMessageId, {
    status: 'queued',
    deliveryMethod: 'android_phone_gateway',
    fallbackProvider: 'android_phone_gateway',
    nextCheckAt: null,
  })

  return result
}

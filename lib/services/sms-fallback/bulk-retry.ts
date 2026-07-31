/**
 * Bulk retry undelivered SMS via HostPinnacle (Sender ID / API) or Android phone gateway.
 */

import mongoose from 'mongoose'
import connectDB from '@/lib/db/connect'
import { SmsMessage, type ISmsMessage } from '@/lib/db/models'
import { isPhoneDeliveredFallbackStatus } from '@/lib/services/sms-fallback/phone-status'
import { createOrUpdatePhoneFallbackJob } from '@/lib/services/sms-fallback/create-fallback-job'
import { retryProviderForMessage } from '@/lib/services/sms-fallback/provider-retry'
import {
  buildActionableSmsFilter,
  normalizeActionableView,
  type ActionableView,
} from '@/lib/services/sms-history/actionable'
import { mapPool } from './concurrency'

export type BulkRetryChannel = 'provider' | 'phone'

export type BulkRetryResult = {
  success: boolean
  channel: BulkRetryChannel
  view: ActionableView
  attempted: number
  succeeded: number
  failed: number
  errors: Array<{ id: string; error: string }>
  message: string
}

const MAX_BULK = 500
const CONCURRENCY = 4

async function retryViaPhone(
  sms: ISmsMessage & { _id: unknown }
): Promise<{ ok: boolean; error?: string }> {
  if (sms.status === 'delivered' || isPhoneDeliveredFallbackStatus(sms.fallbackStatus)) {
    return { ok: false, error: 'Message already delivered' }
  }

  // Phone-failed jobs: reset via createOrUpdate with resetExisting
  const result = await createOrUpdatePhoneFallbackJob(sms, { resetExisting: true })
  if (!result.ok) {
    return { ok: false, error: result.error || 'Failed to queue phone fallback' }
  }
  return { ok: true }
}

export async function bulkRetryActionableSms(params: {
  userId: string
  channel: BulkRetryChannel
  view?: string
  limit?: number
}): Promise<BulkRetryResult> {
  await connectDB()

  const userId = new mongoose.Types.ObjectId(params.userId)
  const view = normalizeActionableView(params.view ?? 'failed')
  const channel: BulkRetryChannel = params.channel === 'phone' ? 'phone' : 'provider'
  const limit = Math.min(Math.max(params.limit ?? MAX_BULK, 1), MAX_BULK)

  const filter = buildActionableSmsFilter(userId, view)
  const docs = await SmsMessage.find(filter).sort({ createdAt: -1 }).limit(limit).lean()

  const errors: Array<{ id: string; error: string }> = []
  let succeeded = 0

  const results = await mapPool(
    docs as Array<ISmsMessage & { _id: unknown }>,
    CONCURRENCY,
    async (sms) => {
      const id = String(sms._id)
      try {
        if (channel === 'provider') {
          const result = await retryProviderForMessage(id, userId, { forceManual: true })
          if (!result.success) {
            errors.push({ id, error: result.error || 'Provider retry failed' })
            return false
          }
          return true
        }

        const phoneResult = await retryViaPhone(sms)
        if (!phoneResult.ok) {
          errors.push({ id, error: phoneResult.error || 'Phone queue failed' })
          return false
        }
        return true
      } catch (err) {
        errors.push({
          id,
          error: err instanceof Error ? err.message : 'Unknown error',
        })
        return false
      }
    }
  )

  succeeded = results.filter(Boolean).length
  const attempted = docs.length
  const failed = attempted - succeeded

  const channelLabel = channel === 'provider' ? 'HostPinnacle (Sender ID / API)' : 'phone gateway'
  const message =
    attempted === 0
      ? `No ${view} SMS to retry`
      : `Retried ${succeeded} of ${attempted} via ${channelLabel}` +
        (failed > 0 ? ` (${failed} failed)` : '')

  return {
    success: true,
    channel,
    view,
    attempted,
    succeeded,
    failed,
    errors: errors.slice(0, 20),
    message,
  }
}

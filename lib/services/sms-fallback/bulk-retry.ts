/**
 * Bulk retry undelivered SMS via HostPinnacle (Sender ID / API) or Android phone gateway.
 *
 * The HTTP handler returns immediately after claiming messages; actual HostPinnacle
 * / phone-queue work runs in the background so the UI does not hang on 100s of sends.
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
  started: boolean
  errors: Array<{ id: string; error: string }>
  message: string
}

const MAX_BULK = 500
/** HostPinnacle sends — keep moderate to avoid rate limits / timeouts */
const PROVIDER_CONCURRENCY = 8
/** Phone queue is DB-only — can go faster */
const PHONE_CONCURRENCY = 16

async function retryViaPhone(
  sms: ISmsMessage & { _id: unknown }
): Promise<{ ok: boolean; error?: string }> {
  if (sms.status === 'delivered' || isPhoneDeliveredFallbackStatus(sms.fallbackStatus)) {
    return { ok: false, error: 'Message already delivered' }
  }

  const result = await createOrUpdatePhoneFallbackJob(sms, { resetExisting: true })
  if (!result.ok) {
    return { ok: false, error: result.error || 'Failed to queue phone fallback' }
  }

  await SmsMessage.findByIdAndUpdate(sms._id, {
    status: 'queued',
    deliveryMethod: 'android_phone_gateway',
    fallbackStatus: 'queued_for_phone',
    fallbackQueued: true,
    nextCheckAt: null,
    failedAt: null,
    finalizedAt: null,
  })

  return { ok: true }
}

/** Prepare failed messages so provider retry can claim them again. */
async function prepareMessagesForProviderRetry(ids: mongoose.Types.ObjectId[]): Promise<void> {
  if (ids.length === 0) return
  await SmsMessage.updateMany(
    { _id: { $in: ids } },
    {
      $set: {
        providerRetryAttempted: false,
        providerRetryStatus: 'not_started',
        fallbackStatus: 'retrying_provider',
        deliveryMethod: 'provider',
        status: 'queued',
        nextCheckAt: null,
      },
      $unset: {
        providerRetryFailureReason: 1,
        failedAt: 1,
        finalizedAt: 1,
        fallbackFailedAt: 1,
        fallbackFailureReason: 1,
        fallbackFailureCode: 1,
        requiresPhoneTopUp: 1,
      },
    }
  )
}

async function prepareMessagesForPhoneQueue(ids: mongoose.Types.ObjectId[]): Promise<void> {
  if (ids.length === 0) return
  await SmsMessage.updateMany(
    { _id: { $in: ids } },
    {
      $set: {
        status: 'queued',
        deliveryMethod: 'android_phone_gateway',
        fallbackStatus: 'queued_for_phone',
        fallbackQueued: true,
        nextCheckAt: null,
      },
      $unset: {
        failedAt: 1,
        finalizedAt: 1,
        fallbackFailedAt: 1,
        fallbackFailureReason: 1,
        fallbackFailureCode: 1,
        requiresPhoneTopUp: 1,
      },
    }
  )
}

async function runBulkRetryWork(params: {
  userId: mongoose.Types.ObjectId
  channel: BulkRetryChannel
  ids: string[]
}): Promise<void> {
  const concurrency = params.channel === 'phone' ? PHONE_CONCURRENCY : PROVIDER_CONCURRENCY
  let succeeded = 0
  let failed = 0

  console.log('[bulk-retry] background start', {
    channel: params.channel,
    count: params.ids.length,
    userId: String(params.userId),
  })

  await mapPool(params.ids, concurrency, async (id) => {
    try {
      if (params.channel === 'provider') {
        const result = await retryProviderForMessage(id, params.userId, {
          forceManual: true,
          bulk: true,
        })
        if (result.success) succeeded++
        else {
          failed++
          console.warn('[bulk-retry] provider failed', { id, error: result.error })
        }
        return
      }

      const sms = await SmsMessage.findById(id).lean()
      if (!sms) {
        failed++
        return
      }
      const phoneResult = await retryViaPhone(sms as ISmsMessage & { _id: unknown })
      if (phoneResult.ok) succeeded++
      else {
        failed++
        console.warn('[bulk-retry] phone queue failed', { id, error: phoneResult.error })
      }
    } catch (err) {
      failed++
      console.error('[bulk-retry] unexpected error', {
        id,
        error: err instanceof Error ? err.message : String(err),
      })
    }
  })

  console.log('[bulk-retry] background done', {
    channel: params.channel,
    succeeded,
    failed,
    total: params.ids.length,
  })
}

/**
 * Claim actionable SMS and kick off background retries.
 * Returns immediately so the browser request does not time out.
 */
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
  const docs = await SmsMessage.find(filter)
    .sort({ createdAt: 1 }) // oldest first — drain the backlog
    .select('_id')
    .limit(limit)
    .lean()

  const ids = docs.map((d) => d._id as mongoose.Types.ObjectId)
  const idStrings = ids.map((id) => String(id))

  if (ids.length === 0) {
    return {
      success: true,
      channel,
      view,
      attempted: 0,
      succeeded: 0,
      failed: 0,
      started: false,
      errors: [],
      message: `No ${view} SMS to retry`,
    }
  }

  // Mark the whole batch immediately so history/UI show progress while sends run
  if (channel === 'provider') {
    await prepareMessagesForProviderRetry(ids)
  } else {
    await prepareMessagesForPhoneQueue(ids)
  }

  // Fire-and-forget — do not await the HostPinnacle storm inside the HTTP request
  Promise.resolve()
    .then(() =>
      runBulkRetryWork({
        userId,
        channel,
        ids: idStrings,
      })
    )
    .catch((err) => console.error('[bulk-retry] background crash', err))

  const channelLabel = channel === 'provider' ? 'HostPinnacle (Sender ID / API)' : 'phone gateway'
  return {
    success: true,
    channel,
    view,
    attempted: ids.length,
    succeeded: 0,
    failed: 0,
    started: true,
    errors: [],
    message: `Started retrying ${ids.length} SMS via ${channelLabel}. They will send in the background — refresh history in a minute.`,
  }
}

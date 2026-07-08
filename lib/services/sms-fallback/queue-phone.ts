import connectDB from '@/lib/db/connect'
import { SmsMessage, SmsFallbackJob, ISmsMessage } from '@/lib/db/models'
import { loadSmsStatusConfig } from '@/lib/config/sms-status-config'
import { createStatusClient } from '@/lib/services/sms-status/client-factory'
import { createLogger } from '@/lib/worker/logger'
import { normalizeKenyanPhone } from '@/lib/utils/phone'
import { isSmsFallbackEnabled, getProviderRetryWaitMinutes, FALLBACK_PHONE_STATUSES } from './config'
import { shouldSkipFallbackProcessing, minutesAgo, cancelFallbackJobIfDelivered } from './helpers'

async function checkRetryDeliveryStatus(sms: ISmsMessage & { _id: unknown }): Promise<void> {
  if (!sms.providerRetrySmsId || sms.providerRetryStatus !== 'sent') return

  const config = loadSmsStatusConfig()
  const logger = createLogger('info', { service: 'sms-fallback-scan' })
  const client = await createStatusClient(config, logger)
  const lookup = await client.getMessageStatus(sms.providerRetrySmsId)

  if (!lookup.ok || !lookup.result) return

  const mapped = lookup.result.status
  if (mapped === 'delivered') {
    await SmsMessage.findByIdAndUpdate(sms._id, {
      providerRetryStatus: 'delivered',
      providerRetryDeliveredAt: new Date(),
      fallbackStatus: 'not_needed',
    })
    await cancelFallbackJobIfDelivered(String(sms._id), 'Provider retry delivered')
  } else if (['failed', 'expired', 'rejected', 'undeliverable', 'provider_timeout'].includes(mapped)) {
    await SmsMessage.findByIdAndUpdate(sms._id, {
      providerRetryStatus: 'failed',
      providerRetryFailedAt: new Date(),
      providerRetryFailureReason: lookup.result.cause || lookup.result.providerStatusRaw || mapped,
    })
  }
}

async function queuePhoneFallback(sms: ISmsMessage & { _id: unknown }): Promise<boolean> {
  const phone = sms.toNumbers[0] || ''
  const normalized = normalizeKenyanPhone(phone)
  if (!normalized) return false

  const originalSmsId = String(sms._id)
  const existing = await SmsFallbackJob.findOne({ originalSmsId }).lean()
  if (existing && ['pending', 'sending', 'sent'].includes(existing.status)) {
    return false
  }

  const now = new Date()
  let job = existing
    ? await SmsFallbackJob.findOneAndUpdate(
        { originalSmsId },
        {
          status: 'pending',
          recipientPhone: phone,
          normalizedPhone: normalized,
          message: sms.message,
          originalStatus: sms.status,
          originalProviderMessageId: sms.hpTransactionId,
          originalSentAt: sms.sentAt,
          originalFailureReason: sms.deliveryCause || sms.errorMessage,
        },
        { new: true }
      )
    : await SmsFallbackJob.create({
        userId: sms.userId,
        originalSmsId,
        recipientPhone: phone,
        normalizedPhone: normalized,
        message: sms.message,
        originalStatus: sms.status,
        originalProviderMessageId: sms.hpTransactionId,
        originalSentAt: sms.sentAt,
        originalFailureReason: sms.deliveryCause || sms.errorMessage,
        retryAttempted: sms.providerRetryAttempted || false,
        retryAttemptedAt: sms.providerRetryAttemptedAt,
        retryProviderMessageId: sms.providerRetrySmsId,
        retryStatus: sms.providerRetryStatus as any,
        retrySentAt: sms.providerRetrySentAt,
        retryFailedAt: sms.providerRetryFailedAt,
        retryFailureReason: sms.providerRetryFailureReason,
        status: 'pending',
        attempts: 0,
      })

  if (!job) return false

  await SmsMessage.findByIdAndUpdate(sms._id, {
    fallbackQueued: true,
    fallbackStatus: 'queued_for_phone',
    fallbackQueuedAt: now,
    fallbackJobId: String(job._id),
  })

  return true
}

export async function scanRetryResultsAndQueuePhoneFallback(): Promise<number> {
  if (!isSmsFallbackEnabled()) return 0

  await connectDB()

  const waitMinutes = getProviderRetryWaitMinutes()
  const waitCutoff = minutesAgo(waitMinutes)

  const retriedMessages = await SmsMessage.find({
    providerRetryAttempted: true,
    status: { $ne: 'delivered' },
    fallbackStatus: {
      $nin: [...FALLBACK_PHONE_STATUSES, 'sent_via_phone', 'cancelled'],
    },
  })
    .limit(100)
    .lean()

  let queued = 0

  for (const raw of retriedMessages) {
    const sms = raw as ISmsMessage & { _id: unknown }
    if (shouldSkipFallbackProcessing(sms)) continue
    if (sms.status === 'delivered') continue
    if (sms.fallbackStatus === 'sent_via_phone') continue

    await checkRetryDeliveryStatus(sms)

    const refreshed = await SmsMessage.findById(sms._id).lean()
    if (!refreshed) continue
    const msg = refreshed as ISmsMessage

    if (msg.providerRetryStatus === 'delivered' || msg.status === 'delivered') {
      await cancelFallbackJobIfDelivered(String(sms._id))
      continue
    }

    const retryFailed =
      msg.providerRetryAttempted &&
      (msg.providerRetryStatus === 'failed' || msg.providerRetryStatus === 'timeout')

    const retryStale =
      msg.providerRetryAttempted &&
      msg.providerRetryStatus === 'sent' &&
      msg.providerRetrySentAt &&
      msg.providerRetrySentAt <= waitCutoff &&
      !msg.providerRetryDeliveredAt

    if (retryFailed || retryStale) {
      if (retryStale && msg.providerRetryStatus === 'sent') {
        await SmsMessage.findByIdAndUpdate(msg._id, {
          providerRetryStatus: 'timeout',
          providerRetryFailureReason: 'Retry not delivered within wait window',
        })
      }

      const didQueue = await queuePhoneFallback(msg as ISmsMessage & { _id: unknown })
      if (didQueue) queued++
    }
  }

  return queued
}

export async function cancelDeliveredFallbackJobs(): Promise<number> {
  await connectDB()

  const activeJobs = await SmsFallbackJob.find({
    status: { $in: ['pending', 'waiting_retry', 'retrying_provider', 'retry_sent_waiting_delivery'] },
  })
    .limit(100)
    .lean()

  let cancelled = 0
  for (const job of activeJobs) {
    const didCancel = await cancelFallbackJobIfDelivered(job.originalSmsId)
    if (didCancel) cancelled++
  }
  return cancelled
}

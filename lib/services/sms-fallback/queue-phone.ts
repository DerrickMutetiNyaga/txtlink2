import connectDB from '@/lib/db/connect'
import { SmsMessage, SmsFallbackJob, ISmsMessage } from '@/lib/db/models'
import { loadSmsStatusConfig } from '@/lib/config/sms-status-config'
import { createStatusClient } from '@/lib/services/sms-status/client-factory'
import { createLogger } from '@/lib/worker/logger'
import { normalizeKenyanPhone } from '@/lib/utils/phone'
import { isSmsFallbackEnabled, getProviderRetryWaitMinutes, FALLBACK_PHONE_STATUSES } from './config'
import { shouldSkipFallbackProcessing, minutesAgo, cancelFallbackJobIfDelivered } from './helpers'
import { isPhoneDeliveredFallbackStatus } from './phone-status'

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
      status: 'delivered',
      deliveryStatus: 'delivered',
      deliveredAt: new Date(),
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
  const normalized = sms.normalizedPhone || normalizeKenyanPhone(phone)
  if (!normalized) return false

  const originalSmsId = String(sms._id)

  if (sms.status === 'delivered' || sms.deliveryStatus === 'delivered') return false
  if (isPhoneDeliveredFallbackStatus(sms.fallbackStatus)) return false

  const existing = await SmsFallbackJob.findOne({ originalSmsId }).lean()
  if (existing && ['pending', 'sending', 'delivered', 'sent'].includes(existing.status)) {
    return false
  }

  const now = new Date()
  const jobPayload = {
    status: 'pending' as const,
    phoneStatus: 'pending' as const,
    recipientPhone: phone,
    normalizedPhone: normalized,
    message: sms.message,
    originalStatus: sms.status,
    originalProviderMessageId: sms.hpTransactionId,
    originalSentAt: sms.sentAt,
    originalFailureReason: sms.deliveryCause || sms.errorMessage,
    source: sms.source,
    apiKeyId: sms.apiKeyId,
  }

  const job = existing
    ? await SmsFallbackJob.findOneAndUpdate({ originalSmsId }, { $set: jobPayload }, { new: true })
    : await SmsFallbackJob.create({
        userId: sms.userId,
        originalSmsId,
        ...jobPayload,
        retryAttempted: sms.providerRetryAttempted || false,
        retryAttemptedAt: sms.providerRetryAttemptedAt,
        retryProviderMessageId: sms.providerRetrySmsId,
        retryStatus: sms.providerRetryStatus as ISmsFallbackJob['retryStatus'],
        retrySentAt: sms.providerRetrySentAt,
        retryFailedAt: sms.providerRetryFailedAt,
        retryFailureReason: sms.providerRetryFailureReason,
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
    deliveryStatus: { $ne: 'delivered' },
    fallbackStatus: { $nin: [...FALLBACK_PHONE_STATUSES, 'cancelled'] },
  })
    .limit(100)
    .lean()

  let queued = 0

  for (const raw of retriedMessages) {
    const sms = raw as ISmsMessage & { _id: unknown }
    if (shouldSkipFallbackProcessing(sms)) continue
    if (isPhoneDeliveredFallbackStatus(sms.fallbackStatus)) continue

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

      if (await queuePhoneFallback(msg as ISmsMessage & { _id: unknown })) {
        queued++
      }
    }
  }

  return queued
}

export async function cancelDeliveredFallbackJobs(): Promise<number> {
  await connectDB()

  const activeJobs = await SmsFallbackJob.find({
    status: {
      $in: ['pending', 'sending', 'waiting_retry', 'retrying_provider', 'retry_sent_waiting_delivery'],
    },
  })
    .limit(100)
    .lean()

  let cancelled = 0
  for (const job of activeJobs) {
    if (await cancelFallbackJobIfDelivered(job.originalSmsId)) cancelled++
  }
  return cancelled
}

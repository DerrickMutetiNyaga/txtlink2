import mongoose from 'mongoose'
import connectDB from '@/lib/db/connect'
import { SmsMessage, SmsFallbackJob, ISmsMessage } from '@/lib/db/models'
import { resolveHostPinnacleCredentials } from '@/lib/services/hostpinnacle/credentials'
import { hostPinnacleClient } from '@/lib/services/hostpinnacle/client'
import { normalizeKenyanPhone } from '@/lib/utils/phone'
import { maskPhone } from '@/lib/utils/log-sanitize'
import {
  isProviderRetryEnabled,
  getFallbackStaleMinutes,
  FAILED_ORIGINAL_STATUSES,
  DLR_RETRY_KEYWORDS,
} from './config'
import { shouldSkipFallbackProcessing, minutesAgo } from './helpers'

function failureReasonMatchesKeywords(sms: ISmsMessage): boolean {
  const text = [
    sms.deliveryCause,
    sms.errorMessage,
    sms.providerError,
    sms.errorCode,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

  return DLR_RETRY_KEYWORDS.some((kw) => text.includes(kw))
}

function qualifiesForProviderRetry(sms: ISmsMessage, staleCutoff: Date): boolean {
  if (shouldSkipFallbackProcessing(sms)) return false
  if (sms.providerRetryAttempted === true) return false

  const failedStatuses = FAILED_ORIGINAL_STATUSES as readonly string[]
  if (failedStatuses.includes(sms.status)) return true

  if (
    sms.status === 'sent' &&
    sms.sentAt &&
    sms.sentAt <= staleCutoff &&
    !sms.deliveredAt
  ) {
    return true
  }

  if (failureReasonMatchesKeywords(sms)) return true

  return false
}

async function upsertFallbackJobForRetry(
  sms: ISmsMessage & { _id: unknown },
  status: 'retrying_provider' | 'retry_sent_waiting_delivery'
): Promise<void> {
  const originalSmsId = String(sms._id)
  const phone = sms.toNumbers[0] || ''
  const normalized = normalizeKenyanPhone(phone)
  if (!normalized) return

  await SmsFallbackJob.findOneAndUpdate(
    { originalSmsId },
    {
      $setOnInsert: {
        userId: sms.userId,
        originalSmsId,
        recipientPhone: phone,
        normalizedPhone: normalized,
        message: sms.message,
        originalStatus: sms.status,
        originalProviderMessageId: sms.hpTransactionId,
        originalSentAt: sms.sentAt,
        originalFailureReason: sms.deliveryCause || sms.errorMessage,
        retryAttempted: false,
        attempts: 0,
      },
      $set: { status },
    },
    { upsert: true, new: true }
  )
}

async function retrySingleMessage(sms: ISmsMessage & { _id: unknown }): Promise<boolean> {
  const phone = sms.toNumbers[0]
  if (!phone) return false

  const normalized = normalizeKenyanPhone(phone)
  if (!normalized) {
    console.warn('SMS fallback retry skipped: invalid phone', {
      smsId: String(sms._id),
      phone: maskPhone(phone),
    })
    return false
  }

  const hpCreds = await resolveHostPinnacleCredentials(sms.userId)
  if (!hpCreds) {
    console.warn('SMS fallback retry skipped: no HostPinnacle credentials', {
      smsId: String(sms._id),
    })
    return false
  }

  const { userId: hpUserId, password, apiKey } = hpCreds
  const now = new Date()

  await SmsMessage.findByIdAndUpdate(sms._id, {
    providerRetryAttempted: true,
    providerRetryAttemptedAt: now,
    fallbackStatus: 'retrying_provider',
  })

  await upsertFallbackJobForRetry(sms, 'retrying_provider')

  try {
    const hpResult = await hostPinnacleClient.sendSms({
      mobile: normalized,
      msg: sms.message,
      senderid: sms.senderName,
      options: { apiKey, userId: hpUserId, password },
      retries: 1,
    })

    if (hpResult.success) {
      const transactionId =
        hpResult.data?.transactionId ||
        hpResult.data?.transactionid ||
        hpResult.data?.id ||
        undefined

      await SmsMessage.findByIdAndUpdate(sms._id, {
        providerRetrySmsId: transactionId ? String(transactionId) : undefined,
        providerRetryStatus: 'sent',
        providerRetrySentAt: now,
        fallbackStatus: 'retry_waiting_delivery',
      })

      await SmsFallbackJob.findOneAndUpdate(
        { originalSmsId: String(sms._id) },
        {
          retryAttempted: true,
          retryAttemptedAt: now,
          retryProviderMessageId: transactionId ? String(transactionId) : undefined,
          retryStatus: 'sent',
          retrySentAt: now,
          status: 'retry_sent_waiting_delivery',
        }
      )

      console.log('Provider retry sent', {
        smsId: String(sms._id),
        transactionId,
        phone: maskPhone(phone),
      })
      return true
    }

    const errorMsg = hpResult.error || hpResult.message || 'Provider retry failed'
    await SmsMessage.findByIdAndUpdate(sms._id, {
      providerRetryStatus: 'failed',
      providerRetryFailedAt: now,
      providerRetryFailureReason: errorMsg,
    })

    await SmsFallbackJob.findOneAndUpdate(
      { originalSmsId: String(sms._id) },
      {
        retryAttempted: true,
        retryAttemptedAt: now,
        retryStatus: 'failed',
        retryFailedAt: now,
        retryFailureReason: errorMsg,
        status: 'retry_sent_waiting_delivery',
      }
    )

    return false
  } catch (error: any) {
    const errorMsg = error?.message || 'Provider retry error'
    await SmsMessage.findByIdAndUpdate(sms._id, {
      providerRetryStatus: 'failed',
      providerRetryFailedAt: now,
      providerRetryFailureReason: errorMsg,
    })
    return false
  }
}

export async function scanAndRetryUndeliveredSms(): Promise<number> {
  if (!isProviderRetryEnabled()) return 0

  await connectDB()

  const staleMinutes = getFallbackStaleMinutes()
  const staleCutoff = minutesAgo(staleMinutes)

  const candidates = await SmsMessage.find({
    providerRetryAttempted: { $ne: true },
    status: { $ne: 'delivered' },
    fallbackStatus: {
      $nin: [
        'queued_for_phone',
        'sending_via_phone',
        'sent_via_phone',
        'cancelled',
      ],
    },
    $or: [
      { status: { $in: [...FAILED_ORIGINAL_STATUSES] } },
      {
        status: 'sent',
        sentAt: { $lte: staleCutoff },
        deliveredAt: null,
      },
    ],
  })
    .limit(50)
    .lean()

  let retried = 0
  for (const sms of candidates) {
    if (!qualifiesForProviderRetry(sms as ISmsMessage, staleCutoff)) continue

    const existingJob = await SmsFallbackJob.findOne({
      originalSmsId: String(sms._id),
    }).lean()
    if (existingJob && ['pending', 'sending', 'sent'].includes(existingJob.status)) {
      continue
    }

    const ok = await retrySingleMessage(sms as ISmsMessage & { _id: unknown })
    if (ok) retried++
  }

  // Case 3: DLR keyword failures (may not match $or above if status is processing)
  const dlrCandidates = await SmsMessage.find({
    providerRetryAttempted: { $ne: true },
    status: { $nin: ['delivered'] },
    fallbackStatus: {
      $nin: [
        'queued_for_phone',
        'sending_via_phone',
        'sent_via_phone',
        'cancelled',
      ],
    },
  })
    .limit(50)
    .lean()

  for (const sms of dlrCandidates) {
    if (!failureReasonMatchesKeywords(sms as ISmsMessage)) continue
    if (shouldSkipFallbackProcessing(sms as ISmsMessage)) continue
    if (sms.providerRetryAttempted) continue

    const ok = await retrySingleMessage(sms as ISmsMessage & { _id: unknown })
    if (ok) retried++
  }

  return retried
}

export async function retryProviderForMessage(
  messageId: string,
  userId: mongoose.Types.ObjectId
): Promise<{ success: boolean; error?: string }> {
  await connectDB()

  const sms = await SmsMessage.findOne({ _id: messageId, userId }).lean()
  if (!sms) return { success: false, error: 'Message not found' }
  if (sms.status === 'delivered') return { success: false, error: 'Message already delivered' }
  if (sms.providerRetryAttempted) return { success: false, error: 'Provider retry already attempted' }
  if (shouldSkipFallbackProcessing(sms as ISmsMessage)) {
    return { success: false, error: 'Message not eligible for retry' }
  }

  const ok = await retrySingleMessage(sms as ISmsMessage & { _id: unknown })
  return ok ? { success: true } : { success: false, error: 'Provider retry failed' }
}

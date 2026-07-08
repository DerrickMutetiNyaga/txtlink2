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
  DLR_RETRY_KEYWORDS,
  FALLBACK_PHONE_STATUSES,
} from './config'
import { shouldSkipProviderRetry, minutesAgo } from './helpers'
import { resolveSmsMessageBody } from '@/lib/services/sms/message-body'
import {
  normalizeSmsStatus,
  isFailedState,
  isStaleSentPending,
  isSmsDelivered,
  getSmsAgeDate,
  getAgeMinutes,
} from './status-normalize'
import {
  addSampleMatch,
  createScanDebugStats,
  type FallbackScanDebugStats,
} from './scan-debug'

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

export type ProviderRetryEligibility = {
  eligible: boolean
  reason?: string
  skipReason?: string
}

export function evaluateProviderRetryEligibility(
  sms: ISmsMessage,
  staleCutoff: Date
): ProviderRetryEligibility {
  if (shouldSkipProviderRetry(sms)) {
    if (sms.providerRetryAttempted === true) {
      return { eligible: false, skipReason: 'already_retried' }
    }
    if (isSmsDelivered(sms)) {
      return { eligible: false, skipReason: 'delivered' }
    }
    return { eligible: false, skipReason: 'skip_provider_retry' }
  }

  const normalized = normalizeSmsStatus(sms)

  if (isFailedState(normalized)) {
    return { eligible: true, reason: 'failed_status' }
  }

  if (isStaleSentPending(sms, staleCutoff)) {
    return { eligible: true, reason: 'sent_older_than_7_minutes' }
  }

  if (failureReasonMatchesKeywords(sms)) {
    return { eligible: true, reason: 'dlr_keyword_match' }
  }

  return { eligible: false, skipReason: 'not_eligible' }
}

function buildProviderRetryCandidateFilter(staleCutoff: Date): Record<string, unknown> {
  const phoneFallbackStatuses = [...FALLBACK_PHONE_STATUSES, 'cancelled']

  return {
    providerRetryAttempted: { $ne: true },
    deliveredAt: null,
    providerRetryDeliveredAt: null,
    status: { $nin: ['delivered'] },
    deliveryStatus: { $ne: 'delivered' },
    fallbackStatus: { $nin: phoneFallbackStatuses },
    $or: [
      { status: { $in: ['failed', 'undelivered', 'rejected', 'expired', 'timeout', 'not_sent', 'undeliverable', 'provider_timeout'] } },
      { deliveryStatus: { $in: ['failed', 'undelivered', 'rejected', 'expired', 'timeout', 'not_sent'] } },
      { sentAt: { $lte: staleCutoff } },
      { createdAt: { $lte: staleCutoff } },
      { updatedAt: { $lte: staleCutoff } },
    ],
  }
}

async function upsertFallbackJobForRetry(
  sms: ISmsMessage & { _id: unknown },
  status: 'retrying_provider' | 'retry_sent_waiting_delivery'
): Promise<void> {
  const originalSmsId = String(sms._id)
  const phone = sms.toNumbers[0] || ''
  const normalized = normalizeKenyanPhone(phone)
  if (!normalized) return

  const resolved = resolveSmsMessageBody(sms)
  const fallbackMessage = resolved?.body || sms.message

  await SmsFallbackJob.findOneAndUpdate(
    { originalSmsId },
    {
      $setOnInsert: {
        userId: sms.userId,
        originalSmsId,
        recipientPhone: phone,
        normalizedPhone: normalized,
        message: fallbackMessage,
        originalStatus: sms.status,
        originalProviderMessageId: sms.hpTransactionId,
        originalSentAt: sms.sentAt,
        originalFailureReason: sms.deliveryCause || sms.errorMessage,
        retryAttempted: false,
        attempts: 0,
        source: sms.source,
        apiKeyId: sms.apiKeyId,
        apiKeyName: sms.apiKeyName,
        clientId: sms.clientId,
        clientUsername: sms.clientUsername,
        clientName: sms.clientName,
        authMethod: sms.authMethod,
      },
      $set: { status },
    },
    { upsert: true, new: true }
  )
}

async function retrySingleMessage(sms: ISmsMessage & { _id: unknown }): Promise<boolean> {
  const phone = sms.toNumbers[0]
  if (!phone) return false

  const resolved = resolveSmsMessageBody(sms)
  if (!resolved) {
    console.warn('SMS fallback retry skipped: no message body', { smsId: String(sms._id) })
    await SmsMessage.findByIdAndUpdate(sms._id, {
      fallbackStatus: 'fallback_error_missing_message_body',
      fallbackFailureReason: 'Missing real SMS message body',
    })
    return false
  }
  const smsText = resolved.body

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
      msg: smsText,
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
      fallbackStatus: 'retry_waiting_delivery',
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
      fallbackStatus: 'retry_waiting_delivery',
    })
    return false
  }
}

function recordCandidateDebug(
  stats: FallbackScanDebugStats,
  sms: ISmsMessage & { _id: unknown },
  eligibility: ProviderRetryEligibility
): void {
  stats.scanned++

  if (eligibility.skipReason === 'delivered') {
    stats.skippedDelivered++
    return
  }
  if (eligibility.skipReason === 'already_retried') {
    stats.skippedAlreadyRetried++
    return
  }

  if (eligibility.eligible) {
    stats.eligibleForProviderRetry++
    addSampleMatch(stats, {
      id: String(sms._id),
      phone: maskPhone(sms.toNumbers[0] || ''),
      status: sms.status,
      deliveryStatus: sms.deliveryStatus || null,
      ageMinutes: getAgeMinutes(getSmsAgeDate(sms)),
      providerRetryAttempted: Boolean(sms.providerRetryAttempted),
      fallbackStatus: sms.fallbackStatus || null,
      reason: eligibility.reason || 'eligible',
    })
  }
}

export async function scanAndRetryUndeliveredSms(
  debug: FallbackScanDebugStats = createScanDebugStats()
): Promise<number> {
  if (!isProviderRetryEnabled()) return 0

  await connectDB()

  const staleMinutes = getFallbackStaleMinutes()
  const staleCutoff = minutesAgo(staleMinutes)

  const candidates = await SmsMessage.find(buildProviderRetryCandidateFilter(staleCutoff))
    .sort({ createdAt: 1 })
    .limit(200)
    .lean()

  let retried = 0
  for (const raw of candidates) {
    const sms = raw as ISmsMessage & { _id: unknown }
    const eligibility = evaluateProviderRetryEligibility(sms, staleCutoff)
    recordCandidateDebug(debug, sms, eligibility)

    if (!eligibility.eligible) continue

    const existingJob = await SmsFallbackJob.findOne({
      originalSmsId: String(sms._id),
    }).lean()
    if (
      existingJob &&
      ['pending', 'sending', 'delivered', 'sent'].includes(existingJob.status)
    ) {
      continue
    }

    const ok = await retrySingleMessage(sms)
    if (ok) {
      retried++
      debug.retriedProvider++
    }
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
  if (shouldSkipProviderRetry(sms as ISmsMessage)) {
    if (isSmsDelivered(sms as ISmsMessage)) {
      return { success: false, error: 'Message already delivered' }
    }
    if (sms.providerRetryAttempted) {
      return { success: false, error: 'Provider retry already attempted' }
    }
    return { success: false, error: 'Message not eligible for retry' }
  }

  const staleCutoff = minutesAgo(getFallbackStaleMinutes())
  const eligibility = evaluateProviderRetryEligibility(sms as ISmsMessage, staleCutoff)
  if (!eligibility.eligible) {
    return { success: false, error: 'Message not eligible for retry' }
  }

  const ok = await retrySingleMessage(sms as ISmsMessage & { _id: unknown })
  return ok ? { success: true } : { success: false, error: 'Provider retry failed' }
}

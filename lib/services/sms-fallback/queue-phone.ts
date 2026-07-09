import connectDB from '@/lib/db/connect'
import { SmsMessage, SmsFallbackJob, ISmsMessage, ISmsFallbackJob } from '@/lib/db/models'
import { loadSmsStatusConfig } from '@/lib/config/sms-status-config'
import { createStatusClient } from '@/lib/services/sms-status/client-factory'
import { createLogger } from '@/lib/worker/logger'
import { normalizeKenyanPhone } from '@/lib/utils/phone'
import { maskPhone } from '@/lib/utils/log-sanitize'
import { isSmsFallbackEnabled, getProviderRetryWaitMinutes, FALLBACK_PHONE_STATUSES } from './config'
import { shouldSkipFallbackProcessing, minutesAgo, cancelFallbackJobIfDelivered } from './helpers'
import { isPhoneDeliveredFallbackStatus } from './phone-status'
import {
  isRetryFailedState,
  isRetrySentPending,
  isSmsDelivered,
  getAgeMinutes,
} from './status-normalize'
import { createOrUpdatePhoneFallbackJob } from './create-fallback-job'
async function checkRetryDeliveryStatus(sms: ISmsMessage & { _id: unknown }): Promise<void> {
  if (!sms.providerRetrySmsId || !isRetrySentPending(sms.providerRetryStatus)) return

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
      deliveryMethod: 'provider',
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
  const result = await createOrUpdatePhoneFallbackJob(sms)
  return result.ok
}

function buildPhoneFallbackCandidateFilter(): Record<string, unknown> {
  return {
    providerRetryAttempted: true,
    status: { $ne: 'delivered' },
    deliveryStatus: { $ne: 'delivered' },
    fallbackStatus: {
      $nin: [...FALLBACK_PHONE_STATUSES, 'cancelled', 'delivered_via_phone', 'sent_via_phone'],
    },
    fallbackQueued: { $ne: true },
  }
}

export function evaluatePhoneFallbackEligibility(
  sms: ISmsMessage,
  waitCutoff: Date
): { eligible: boolean; reason?: string } {
  if (shouldSkipFallbackProcessing(sms)) {
    return { eligible: false }
  }
  if (isPhoneDeliveredFallbackStatus(sms.fallbackStatus)) {
    return { eligible: false }
  }
  if (sms.providerRetryAttempted !== true) {
    return { eligible: false }
  }

  if (isRetryFailedState(sms.providerRetryStatus)) {
    return { eligible: true, reason: 'provider_retry_failed' }
  }

  if (isRetrySentPending(sms.providerRetryStatus)) {
    const retrySentAt = sms.providerRetrySentAt || sms.providerRetryAttemptedAt
    if (retrySentAt && retrySentAt <= waitCutoff && !sms.providerRetryDeliveredAt) {
      return { eligible: true, reason: 'provider_retry_stale_sent' }
    }
  }

  return { eligible: false }
}

export async function scanRetryResultsAndQueuePhoneFallback(
  debug: FallbackScanDebugStats = createScanDebugStats()
): Promise<number> {
  if (!isSmsFallbackEnabled()) return 0

  await connectDB()

  const waitMinutes = getProviderRetryWaitMinutes()
  const waitCutoff = minutesAgo(waitMinutes)

  const retriedMessages = await SmsMessage.find(buildPhoneFallbackCandidateFilter())
    .sort({ providerRetryAttemptedAt: 1 })
    .limit(200)
    .lean()

  let queued = 0

  for (const raw of retriedMessages) {
    const sms = raw as ISmsMessage & { _id: unknown }
    debug.scanned++

    if (isSmsDelivered(sms)) {
      debug.skippedDelivered++
      await cancelFallbackJobIfDelivered(String(sms._id))
      continue
    }

    await checkRetryDeliveryStatus(sms)

    const refreshed = await SmsMessage.findById(sms._id).lean()
    if (!refreshed) continue
    const msg = refreshed as ISmsMessage

    if (isSmsDelivered(msg) || msg.providerRetryStatus === 'delivered') {
      debug.skippedDelivered++
      await cancelFallbackJobIfDelivered(String(sms._id))
      continue
    }

    const eligibility = evaluatePhoneFallbackEligibility(msg, waitCutoff)
    if (!eligibility.eligible) continue

    debug.eligibleForPhoneFallback++
    addSampleMatch(debug, {
      id: String(msg._id),
      phone: maskPhone(msg.toNumbers[0] || ''),
      status: msg.status,
      deliveryStatus: msg.deliveryStatus || null,
      ageMinutes: getAgeMinutes(msg.providerRetrySentAt || msg.providerRetryAttemptedAt),
      providerRetryAttempted: Boolean(msg.providerRetryAttempted),
      fallbackStatus: msg.fallbackStatus || null,
      reason: eligibility.reason || 'eligible_for_phone',
    })

    if (
      eligibility.reason === 'provider_retry_stale_sent' &&
      isRetrySentPending(msg.providerRetryStatus)
    ) {
      await SmsMessage.findByIdAndUpdate(msg._id, {
        providerRetryStatus: 'timeout',
        providerRetryFailureReason: 'Retry not delivered within wait window',
      })
    }

    if (await queuePhoneFallback(msg as ISmsMessage & { _id: unknown })) {
      queued++
      debug.queuedForPhone++
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

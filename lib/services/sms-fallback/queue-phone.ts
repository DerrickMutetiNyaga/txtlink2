import connectDB from '@/lib/db/connect'
import { SmsMessage, SmsFallbackJob, ISmsMessage } from '@/lib/db/models'
import { loadSmsStatusConfig } from '@/lib/config/sms-status-config'
import { createStatusClient } from '@/lib/services/sms-status/client-factory'
import { createLogger } from '@/lib/worker/logger'
import { maskPhone } from '@/lib/utils/log-sanitize'
import {
  isSmsFallbackEnabled,
  getProviderRetryWaitMinutes,
  getFallbackStaleMinutes,
  FALLBACK_PHONE_STATUSES,
  FAILED_ORIGINAL_STATUSES,
  SMS_PENDING_FOR_FALLBACK,
} from './config'
import { shouldSkipFallbackProcessing, minutesAgo, cancelFallbackJobIfDelivered } from './helpers'
import { isPhoneDeliveredFallbackStatus } from './phone-status'
import {
  isRetryFailedState,
  isRetrySentPending,
  isSmsDelivered,
  getAgeMinutes,
  getSmsAgeDate,
  isFailedState,
  isSentPendingProviderState,
  normalizeSmsStatus,
} from './status-normalize'
import { createOrUpdatePhoneFallbackJob } from './create-fallback-job'
import { syncSmsMessageById } from '@/lib/services/sms-status/sync-user-pending'
import {
  addSampleMatch,
  createScanDebugStats,
  type FallbackScanDebugStats,
} from './scan-debug'

/**
 * If DLR never arrived, ping HostPinnacle status API for the original SMS
 * and update MongoDB before deciding on phone fallback.
 */
async function pingOriginalDeliveryStatus(sms: ISmsMessage & { _id: unknown }): Promise<void> {
  if (isSmsDelivered(sms) || isFailedState(normalizeSmsStatus(sms))) return
  if (!sms.externalMsgId && !sms.hpTransactionId) return

  try {
    await syncSmsMessageById(String(sms._id))
  } catch (error) {
    console.warn('Fallback status ping failed', {
      smsId: String(sms._id),
      error: error instanceof Error ? error.message : String(error),
    })
  }
}

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

function buildPhoneFallbackCandidateFilter(phoneCutoff: Date): Record<string, unknown> {
  const blockedFallbackStatuses = [
    ...FALLBACK_PHONE_STATUSES,
    'cancelled',
    'delivered_via_phone',
    'sent_via_phone',
    'phone_requires_topup',
  ]

  return {
    status: { $ne: 'delivered' },
    deliveryStatus: { $ne: 'delivered' },
    deliveredAt: null,
    fallbackStatus: { $nin: blockedFallbackStatuses },
    fallbackQueued: { $ne: true },
    $or: [
      // Failed anywhere → phone immediately (no age wait)
      {
        status: { $in: [...FAILED_ORIGINAL_STATUSES] },
      },
      {
        deliveryStatus: { $in: [...FAILED_ORIGINAL_STATUSES] },
      },
      {
        providerRetryStatus: { $in: [...FAILED_ORIGINAL_STATUSES, 'timeout'] },
      },
      // Still pending/sent and older than N minutes → phone
      {
        $or: [{ sentAt: { $lte: phoneCutoff } }, { createdAt: { $lte: phoneCutoff } }],
        status: { $in: [...SMS_PENDING_FOR_FALLBACK] },
      },
      // Legacy path: provider retry already attempted
      {
        providerRetryAttempted: true,
      },
    ],
  }
}

export function evaluatePhoneFallbackEligibility(
  sms: ISmsMessage,
  waitCutoff: Date,
  phoneCutoff: Date
): { eligible: boolean; reason?: string } {
  if (shouldSkipFallbackProcessing(sms)) {
    return { eligible: false }
  }
  if (isPhoneDeliveredFallbackStatus(sms.fallbackStatus)) {
    return { eligible: false }
  }
  if (isSmsDelivered(sms)) {
    return { eligible: false }
  }

  const normalized = normalizeSmsStatus(sms)

  // Failed (original or retry) → phone gateway immediately
  if (isFailedState(normalized) || isRetryFailedState(sms.providerRetryStatus)) {
    return { eligible: true, reason: 'failed_immediate_phone' }
  }

  // Still pending/sent and not delivered within N minutes → phone gateway
  const ageDate = getSmsAgeDate(sms)
  if (ageDate && ageDate <= phoneCutoff && isSentPendingProviderState(normalized)) {
    return { eligible: true, reason: 'undelivered_after_phone_fallback_minutes' }
  }

  // Provider retry still "sent" past wait window → phone
  if (sms.providerRetryAttempted === true && isRetrySentPending(sms.providerRetryStatus)) {
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
  const staleMinutes = getFallbackStaleMinutes()
  const waitCutoff = minutesAgo(waitMinutes)
  const phoneCutoff = minutesAgo(staleMinutes)

  const candidates = await SmsMessage.find(buildPhoneFallbackCandidateFilter(phoneCutoff))
    .sort({ createdAt: 1 })
    .limit(200)
    .lean()

  let queued = 0

  for (const raw of candidates) {
    const sms = raw as ISmsMessage & { _id: unknown }
    debug.scanned++

    if (isSmsDelivered(sms)) {
      debug.skippedDelivered++
      await cancelFallbackJobIfDelivered(String(sms._id))
      continue
    }

    // No DLR yet? Ping HostPinnacle for the real status before phone fallback.
    await pingOriginalDeliveryStatus(sms)

    if (sms.providerRetryAttempted && sms.providerRetrySmsId) {
      await checkRetryDeliveryStatus(sms)
    }

    const refreshed = await SmsMessage.findById(sms._id).lean()
    if (!refreshed) continue
    const msg = refreshed as ISmsMessage

    if (isSmsDelivered(msg) || msg.providerRetryStatus === 'delivered') {
      debug.skippedDelivered++
      await cancelFallbackJobIfDelivered(String(sms._id))
      continue
    }

    const eligibility = evaluatePhoneFallbackEligibility(msg, waitCutoff, phoneCutoff)
    if (!eligibility.eligible) continue

    debug.eligibleForPhoneFallback++
    addSampleMatch(debug, {
      id: String(msg._id),
      phone: maskPhone(msg.toNumbers[0] || ''),
      status: msg.status,
      deliveryStatus: msg.deliveryStatus || null,
      ageMinutes: getAgeMinutes(getSmsAgeDate(msg) || msg.providerRetrySentAt || msg.providerRetryAttemptedAt),
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

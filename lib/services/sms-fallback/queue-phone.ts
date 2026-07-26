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
  getFallbackScanBatchSize,
  getFallbackScanConcurrency,
  getFallbackScanMaxRounds,
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
import { mapPool } from './concurrency'
import {
  addSampleMatch,
  createScanDebugStats,
  type FallbackScanDebugStats,
} from './scan-debug'
import type { HostPinnacleStatusClient } from '@/lib/services/hostpinnacle/status-client'

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

async function checkRetryDeliveryStatus(
  sms: ISmsMessage & { _id: unknown },
  client: HostPinnacleStatusClient
): Promise<void> {
  if (!sms.providerRetrySmsId || !isRetrySentPending(sms.providerRetryStatus)) return

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

type ProcessOutcome = {
  scanned: boolean
  skippedDelivered: boolean
  eligible: boolean
  queued: boolean
}

async function processPhoneFallbackCandidate(
  sms: ISmsMessage & { _id: unknown },
  waitCutoff: Date,
  phoneCutoff: Date,
  retryStatusClient: HostPinnacleStatusClient | null,
  debug: FallbackScanDebugStats
): Promise<ProcessOutcome> {
  const outcome: ProcessOutcome = {
    scanned: true,
    skippedDelivered: false,
    eligible: false,
    queued: false,
  }

  if (isSmsDelivered(sms)) {
    outcome.skippedDelivered = true
    await cancelFallbackJobIfDelivered(String(sms._id))
    return outcome
  }

  // No DLR yet? Ping HostPinnacle for the real status before phone fallback.
  await pingOriginalDeliveryStatus(sms)

  if (retryStatusClient && sms.providerRetryAttempted && sms.providerRetrySmsId) {
    await checkRetryDeliveryStatus(sms, retryStatusClient)
  }

  const refreshed = await SmsMessage.findById(sms._id).lean()
  if (!refreshed) return outcome
  const msg = refreshed as ISmsMessage

  if (isSmsDelivered(msg) || msg.providerRetryStatus === 'delivered') {
    outcome.skippedDelivered = true
    await cancelFallbackJobIfDelivered(String(sms._id))
    return outcome
  }

  const eligibility = evaluatePhoneFallbackEligibility(msg, waitCutoff, phoneCutoff)
  if (!eligibility.eligible) return outcome

  outcome.eligible = true
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
    outcome.queued = true
  }

  return outcome
}

async function processPhoneFallbackRound(
  waitCutoff: Date,
  phoneCutoff: Date,
  batchSize: number,
  concurrency: number,
  debug: FallbackScanDebugStats
): Promise<{ scanned: number; queued: number }> {
  const candidates = await SmsMessage.find(buildPhoneFallbackCandidateFilter(phoneCutoff))
    .sort({ createdAt: 1 })
    .limit(batchSize)
    .lean()

  if (candidates.length === 0) {
    return { scanned: 0, queued: 0 }
  }

  let retryStatusClient: HostPinnacleStatusClient | null = null
  const needsRetryClient = candidates.some(
    (c) => (c as ISmsMessage).providerRetryAttempted && (c as ISmsMessage).providerRetrySmsId
  )
  if (needsRetryClient) {
    const config = loadSmsStatusConfig()
    const logger = createLogger('info', { service: 'sms-fallback-scan' })
    retryStatusClient = await createStatusClient(config, logger)
  }

  const outcomes = await mapPool(
    candidates as Array<ISmsMessage & { _id: unknown }>,
    concurrency,
    (sms) => processPhoneFallbackCandidate(sms, waitCutoff, phoneCutoff, retryStatusClient, debug)
  )

  let queued = 0
  for (const outcome of outcomes) {
    if (outcome.scanned) debug.scanned++
    if (outcome.skippedDelivered) debug.skippedDelivered++
    if (outcome.eligible) debug.eligibleForPhoneFallback++
    if (outcome.queued) {
      queued++
      debug.queuedForPhone++
    }
  }

  return { scanned: candidates.length, queued }
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
  const batchSize = getFallbackScanBatchSize()
  const concurrency = getFallbackScanConcurrency()
  const maxRounds = getFallbackScanMaxRounds()

  let totalQueued = 0

  for (let round = 0; round < maxRounds; round++) {
    const { scanned, queued } = await processPhoneFallbackRound(
      waitCutoff,
      phoneCutoff,
      batchSize,
      concurrency,
      debug
    )
    totalQueued += queued

    // Drained this surge wave
    if (scanned === 0) break
    if (scanned < batchSize) break
  }

  return totalQueued
}

export async function cancelDeliveredFallbackJobs(): Promise<number> {
  await connectDB()

  const batchSize = getFallbackScanBatchSize()
  const concurrency = getFallbackScanConcurrency()

  const activeJobs = await SmsFallbackJob.find({
    status: {
      $in: ['pending', 'sending', 'waiting_retry', 'retrying_provider', 'retry_sent_waiting_delivery'],
    },
  })
    .limit(batchSize)
    .lean()

  const results = await mapPool(activeJobs, concurrency, async (job) =>
    cancelFallbackJobIfDelivered(job.originalSmsId)
  )

  return results.filter(Boolean).length
}

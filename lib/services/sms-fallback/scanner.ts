import connectDB from '@/lib/db/connect'
import { SmsMessage } from '@/lib/db/models'
import { scanAndRetryUndeliveredSms, evaluateProviderRetryEligibility } from './provider-retry'
import {
  scanRetryResultsAndQueuePhoneFallback,
  cancelDeliveredFallbackJobs,
} from './queue-phone'
import { resetStaleSendingJobs } from './stale-sending'
import { cleanupOldSmsHistory } from '@/lib/services/sms-history/cleanup'
import { getFallbackStaleMinutes } from './config'
import { minutesAgo } from './helpers'
import {
  createScanDebugStats,
  type FallbackScanDebugStats,
  type FallbackScanSampleMatch,
} from './scan-debug'

export interface FallbackScanResult {
  success: true
  scanned: number
  eligibleForProviderRetry: number
  retriedProvider: number
  eligibleForPhoneFallback: number
  queuedForPhone: number
  skippedDelivered: number
  skippedAlreadyRetried: number
  sampleMatches: FallbackScanSampleMatch[]
  cancelledBecauseDelivered: number
  resetStaleSending: number
  sourcesScanned: {
    dashboard: number
    bulk: number
    api_key: number
    system: number
    test: number
    unset: number
  }
  smsHistoryCleanup?: {
    usersProcessed: number
    totalDeleted: number
  }
}

async function countEligibleBySource(): Promise<FallbackScanResult['sourcesScanned']> {
  await connectDB()
  const staleCutoff = minutesAgo(getFallbackStaleMinutes())

  const sources = ['dashboard', 'bulk', 'api_key', 'system', 'test'] as const
  const counts: FallbackScanResult['sourcesScanned'] = {
    dashboard: 0,
    bulk: 0,
    api_key: 0,
    system: 0,
    test: 0,
    unset: 0,
  }

  const candidates = await SmsMessage.find({
    providerRetryAttempted: { $ne: true },
    deliveredAt: null,
    status: { $ne: 'delivered' },
    deliveryStatus: { $ne: 'delivered' },
    $or: [
      { sentAt: { $lte: staleCutoff } },
      { createdAt: { $lte: staleCutoff } },
      { updatedAt: { $lte: staleCutoff } },
    ],
  })
    .select('_id status deliveryStatus source sentAt createdAt updatedAt providerRetryAttempted fallbackStatus deliveredAt toNumbers')
    .limit(500)
    .lean()

  for (const raw of candidates) {
    const sms = raw as Parameters<typeof evaluateProviderRetryEligibility>[0]
    const eligibility = evaluateProviderRetryEligibility(sms, staleCutoff)
    if (!eligibility.eligible) continue

    const source = (raw as { source?: string }).source
    if (source && source in counts && source !== 'unset') {
      counts[source as keyof Omit<typeof counts, 'unset'>]++
    } else {
      counts.unset++
    }
  }

  // Ensure all source keys exist even if zero
  for (const source of sources) {
    if (counts[source] === undefined) counts[source] = 0
  }

  return counts
}

function mergeDebugStats(
  providerDebug: FallbackScanDebugStats,
  phoneDebug: FallbackScanDebugStats
): Pick<
  FallbackScanResult,
  | 'scanned'
  | 'eligibleForProviderRetry'
  | 'retriedProvider'
  | 'eligibleForPhoneFallback'
  | 'queuedForPhone'
  | 'skippedDelivered'
  | 'skippedAlreadyRetried'
  | 'sampleMatches'
> {
  const sampleMatches = [...providerDebug.sampleMatches, ...phoneDebug.sampleMatches].slice(0, 10)

  return {
    scanned: providerDebug.scanned + phoneDebug.scanned,
    eligibleForProviderRetry: providerDebug.eligibleForProviderRetry,
    retriedProvider: providerDebug.retriedProvider,
    eligibleForPhoneFallback: phoneDebug.eligibleForPhoneFallback,
    queuedForPhone: phoneDebug.queuedForPhone,
    skippedDelivered: providerDebug.skippedDelivered + phoneDebug.skippedDelivered,
    skippedAlreadyRetried: providerDebug.skippedAlreadyRetried,
    sampleMatches,
  }
}

export async function runSmsFallbackScan(): Promise<FallbackScanResult> {
  const providerDebug = createScanDebugStats()
  const phoneDebug = createScanDebugStats()

  const [retriedProvider, queuedForPhone, cancelledBecauseDelivered, resetStaleSending, sourcesScanned, smsHistoryCleanup] =
    await Promise.all([
      scanAndRetryUndeliveredSms(providerDebug),
      scanRetryResultsAndQueuePhoneFallback(phoneDebug),
      cancelDeliveredFallbackJobs(),
      resetStaleSendingJobs(),
      countEligibleBySource(),
      cleanupOldSmsHistory(),
    ])

  const merged = mergeDebugStats(providerDebug, phoneDebug)

  return {
    success: true,
    ...merged,
    retriedProvider: retriedProvider || merged.retriedProvider,
    queuedForPhone: queuedForPhone || merged.queuedForPhone,
    cancelledBecauseDelivered,
    resetStaleSending,
    sourcesScanned,
    smsHistoryCleanup: {
      usersProcessed: smsHistoryCleanup.usersProcessed,
      totalDeleted: smsHistoryCleanup.totalDeleted,
    },
  }
}

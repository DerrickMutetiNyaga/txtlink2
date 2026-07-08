import connectDB from '@/lib/db/connect'
import { SmsMessage } from '@/lib/db/models'
import { scanAndRetryUndeliveredSms } from './provider-retry'
import {
  scanRetryResultsAndQueuePhoneFallback,
  cancelDeliveredFallbackJobs,
} from './queue-phone'
import { resetStaleSendingJobs } from './stale-sending'
import { getFallbackStaleMinutes } from './config'
import { minutesAgo } from './helpers'
import { FAILED_ORIGINAL_STATUSES, SMS_PENDING_FOR_FALLBACK } from './config'

export interface FallbackScanResult {
  retriedProvider: number
  queuedForPhone: number
  cancelledBecauseDelivered: number
  resetStaleSending: number
  sourcesScanned: {
    dashboard: number
    bulk: number
    api_key: number
    system: number
    test: number
  }
}

async function countEligibleBySource(): Promise<FallbackScanResult['sourcesScanned']> {
  await connectDB()
  const staleCutoff = minutesAgo(getFallbackStaleMinutes())

  const baseFilter = {
    providerRetryAttempted: { $ne: true },
    status: { $ne: 'delivered' },
    deliveryStatus: { $ne: 'delivered' },
    fallbackStatus: {
      $nin: ['queued_for_phone', 'sending_via_phone', 'delivered_via_phone', 'sent_via_phone', 'cancelled'],
    },
  }

  async function countForSource(source: string | null): Promise<number> {
    const filter: Record<string, unknown> = { ...baseFilter }
    if (source) {
      filter.source = source
    } else {
      filter.$or = [{ source: { $exists: false } }, { source: null }]
    }
    filter.$and = [
      {
        $or: [
          { status: { $in: [...FAILED_ORIGINAL_STATUSES] } },
          { status: 'sent', sentAt: { $lte: staleCutoff }, deliveredAt: null },
          {
            status: { $in: [...SMS_PENDING_FOR_FALLBACK] },
            createdAt: { $lte: staleCutoff },
            deliveredAt: null,
          },
        ],
      },
    ]
    return SmsMessage.countDocuments(filter)
  }

  const [dashboard, bulk, api_key, system, test, unset] = await Promise.all([
    countForSource('dashboard'),
    countForSource('bulk'),
    countForSource('api_key'),
    countForSource('system'),
    countForSource('test'),
    countForSource(null),
  ])

  return {
    dashboard: dashboard + unset,
    bulk,
    api_key,
    system,
    test,
  }
}

export async function runSmsFallbackScan(): Promise<FallbackScanResult> {
  const [retriedProvider, queuedForPhone, cancelledBecauseDelivered, resetStaleSending, sourcesScanned] =
    await Promise.all([
      scanAndRetryUndeliveredSms(),
      scanRetryResultsAndQueuePhoneFallback(),
      cancelDeliveredFallbackJobs(),
      resetStaleSendingJobs(),
      countEligibleBySource(),
    ])

  return {
    retriedProvider,
    queuedForPhone,
    cancelledBecauseDelivered,
    resetStaleSending,
    sourcesScanned,
  }
}

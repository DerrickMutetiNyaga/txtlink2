import { scanAndRetryUndeliveredSms } from './provider-retry'
import {
  scanRetryResultsAndQueuePhoneFallback,
  cancelDeliveredFallbackJobs,
} from './queue-phone'
import { resetStaleSendingJobs } from './stale-sending'

export interface FallbackScanResult {
  retriedProvider: number
  queuedForPhone: number
  cancelledBecauseDelivered: number
  resetStaleSending: number
}

export async function runSmsFallbackScan(): Promise<FallbackScanResult> {
  const retriedProvider = await scanAndRetryUndeliveredSms()
  const queuedForPhone = await scanRetryResultsAndQueuePhoneFallback()
  const cancelledBecauseDelivered = await cancelDeliveredFallbackJobs()
  const resetStaleSending = await resetStaleSendingJobs()

  return {
    retriedProvider,
    queuedForPhone,
    cancelledBecauseDelivered,
    resetStaleSending,
  }
}

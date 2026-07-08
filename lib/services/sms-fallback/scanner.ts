import { scanAndRetryUndeliveredSms } from './provider-retry'
import {
  scanRetryResultsAndQueuePhoneFallback,
  cancelDeliveredFallbackJobs,
} from './queue-phone'

export interface FallbackScanResult {
  retriedProvider: number
  queuedForPhone: number
  cancelledBecauseDelivered: number
}

export async function runSmsFallbackScan(): Promise<FallbackScanResult> {
  const retriedProvider = await scanAndRetryUndeliveredSms()
  const queuedForPhone = await scanRetryResultsAndQueuePhoneFallback()
  const cancelledBecauseDelivered = await cancelDeliveredFallbackJobs()

  return {
    retriedProvider,
    queuedForPhone,
    cancelledBecauseDelivered,
  }
}

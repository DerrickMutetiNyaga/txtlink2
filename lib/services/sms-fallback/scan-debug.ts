export interface FallbackScanSampleMatch {
  id: string
  phone: string
  status: string
  deliveryStatus: string | null
  ageMinutes: number | null
  providerRetryAttempted: boolean
  fallbackStatus: string | null
  reason: string
}

export interface FallbackScanDebugStats {
  scanned: number
  eligibleForProviderRetry: number
  retriedProvider: number
  eligibleForPhoneFallback: number
  queuedForPhone: number
  skippedDelivered: number
  skippedAlreadyRetried: number
  sampleMatches: FallbackScanSampleMatch[]
}

export function createScanDebugStats(): FallbackScanDebugStats {
  return {
    scanned: 0,
    eligibleForProviderRetry: 0,
    retriedProvider: 0,
    eligibleForPhoneFallback: 0,
    queuedForPhone: 0,
    skippedDelivered: 0,
    skippedAlreadyRetried: 0,
    sampleMatches: [],
  }
}

export function addSampleMatch(
  stats: FallbackScanDebugStats,
  match: FallbackScanSampleMatch,
  maxSamples = 10
): void {
  if (stats.sampleMatches.length >= maxSamples) return
  stats.sampleMatches.push(match)
}

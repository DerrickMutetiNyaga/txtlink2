/**
 * Central claim-lease configuration for Android gateway atomic claims.
 * Do not hardcode lease durations elsewhere — import from here.
 *
 * Production default: 600s (10 minutes) to cover ~50 jobs × ~3s pacing.
 * Override: SMS_GATEWAY_CLAIM_LEASE_SECONDS
 */

const DEFAULT_CLAIM_LEASE_SECONDS = 600
const MIN_RECOMMENDED_CLAIM_LEASE_SECONDS = 600

export function getClaimLeaseSeconds(): number {
  const raw = parseInt(process.env.SMS_GATEWAY_CLAIM_LEASE_SECONDS || '', 10)
  if (Number.isFinite(raw) && raw > 0) {
    return raw
  }
  return DEFAULT_CLAIM_LEASE_SECONDS
}

export function getClaimLeaseMs(): number {
  return getClaimLeaseSeconds() * 1000
}

/** Default lease supports a 50-job batch at ~3s/job (150s) with headroom. */
export function claimLeaseSupportsBatch(jobCount: number, secondsPerJob = 3): boolean {
  return getClaimLeaseSeconds() >= jobCount * secondsPerJob
}

export function computeClaimExpiresAt(from: Date = new Date()): Date {
  return new Date(from.getTime() + getClaimLeaseMs())
}

export function getMinRecommendedClaimLeaseSeconds(): number {
  return MIN_RECOMMENDED_CLAIM_LEASE_SECONDS
}

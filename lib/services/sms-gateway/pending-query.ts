/** Pending-job poll helpers for Android HTTPS gateway. */

export const PENDING_JOB_DEFAULT_LIMIT = 40
export const PENDING_JOB_MAX_LIMIT = 50

/**
 * Clamp Android batch size.
 * Maximum is always 50 unless intentionally changed here.
 */
export function clampPendingJobLimit(raw: string | null | undefined): number {
  const parsed = parseInt(raw || String(PENDING_JOB_DEFAULT_LIMIT), 10)
  const base = Number.isFinite(parsed) && parsed > 0 ? parsed : PENDING_JOB_DEFAULT_LIMIT
  return Math.min(base, PENDING_JOB_MAX_LIMIT)
}

/**
 * Max atomic claim attempts per poll when some claims are released after body checks.
 * Never exceeds PENDING_JOB_MAX_LIMIT * 2, and never implies a response batch > 50.
 */
export function pendingClaimAttemptBudget(limit: number): number {
  return Math.min(Math.max(limit * 2, limit), PENDING_JOB_MAX_LIMIT * 2)
}

/** @deprecated Prefer atomic claim loop — kept for tests/docs. */
export function pendingFetchLimit(limit: number): number {
  return pendingClaimAttemptBudget(limit)
}

/** Indexed query used before atomic claim (eligibility). */
export function buildPendingJobsQuery(userId: unknown, deviceId?: string) {
  const base: Record<string, unknown> = { userId, status: 'pending' as const }
  if (!deviceId) return base
  return {
    ...base,
    $or: [
      { assignedDeviceId: { $exists: false } },
      { assignedDeviceId: null },
      { assignedDeviceId: '' },
      { assignedDeviceId: deviceId },
    ],
  }
}

export const PENDING_JOBS_SORT = { createdAt: 1 as const }

export const PENDING_QUERY_INDEX_HINTS = [
  { userId: 1, status: 1, createdAt: 1 },
  { userId: 1, status: 1, claimExpiresAt: 1 },
  { userId: 1, status: 1, sendingAt: 1 },
  { userId: 1, assignedDeviceId: 1, status: 1, createdAt: 1 },
] as const

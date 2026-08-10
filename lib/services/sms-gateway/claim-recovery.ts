import { SmsFallbackJob } from '@/lib/db/models'
import { getClaimLeaseMs } from '@/lib/services/sms-gateway/claim-lease'
import { JOB_STATUS_BY_CANONICAL } from '@/lib/services/sms-gateway/canonical-status'

export { computeClaimExpiresAt, getClaimLeaseSeconds, getClaimLeaseMs } from '@/lib/services/sms-gateway/claim-lease'

export interface ClaimRecoveryResult {
  safeReclaimed: number
  markedUnknown: number
}

/**
 * Expired claim safety:
 *
 * SAFE — claim expired AND modem submission never started
 *   → return to pending (QUEUED_FOR_PHONE)
 *
 * UNSAFE — /sending was received OR submission may have occurred
 *   → SUBMISSION_UNKNOWN (never auto-return to pending)
 */
export async function reclaimExpiredClaims(userId: unknown): Promise<ClaimRecoveryResult> {
  const now = new Date()
  const legacyCutoff = new Date(now.getTime() - getClaimLeaseMs())

  // SAFE: CLAIMED_FOR_PHONE, expired, submission never started
  const safe = await SmsFallbackJob.updateMany(
    {
      userId,
      status: 'claimed',
      claimExpiresAt: { $lte: now },
      $or: [{ submissionStartedAt: null }, { submissionStartedAt: { $exists: false } }],
    },
    {
      $set: {
        status: JOB_STATUS_BY_CANONICAL.QUEUED_FOR_PHONE,
        phoneStatus: 'pending',
        canonicalStatus: 'QUEUED_FOR_PHONE',
        resetReason: 'safe_expired_claim_reclaim',
      },
      $unset: {
        claimToken: 1,
        attemptId: 1,
        claimedAt: 1,
        claimedByDeviceId: 1,
        claimExpiresAt: 1,
        lockedAt: 1,
        lockedBy: 1,
        sendingAt: 1,
        submissionStartedAt: 1,
      },
      $inc: { serverRevision: 1 },
    }
  )

  // UNSAFE: submission started (sending) and lease expired → SUBMISSION_UNKNOWN
  const unknownFromSending = await SmsFallbackJob.updateMany(
    {
      userId,
      status: 'sending',
      $or: [
        { claimExpiresAt: { $lte: now } },
        {
          claimExpiresAt: null,
          sendingAt: { $lte: legacyCutoff },
        },
        {
          claimExpiresAt: { $exists: false },
          sendingAt: { $lte: legacyCutoff },
        },
      ],
    },
    {
      $set: {
        status: JOB_STATUS_BY_CANONICAL.SUBMISSION_UNKNOWN,
        phoneStatus: 'sending',
        canonicalStatus: 'SUBMISSION_UNKNOWN',
        resetReason: 'unsafe_expired_submission',
      },
      $inc: { serverRevision: 1 },
    }
  )

  // UNSAFE: claimed but somehow has submissionStartedAt and expired
  const unknownFromClaimed = await SmsFallbackJob.updateMany(
    {
      userId,
      status: 'claimed',
      claimExpiresAt: { $lte: now },
      submissionStartedAt: { $ne: null },
    },
    {
      $set: {
        status: JOB_STATUS_BY_CANONICAL.SUBMISSION_UNKNOWN,
        phoneStatus: 'sending',
        canonicalStatus: 'SUBMISSION_UNKNOWN',
        resetReason: 'unsafe_expired_claim_after_submission',
      },
      $inc: { serverRevision: 1 },
    }
  )

  return {
    safeReclaimed: safe.modifiedCount || 0,
    markedUnknown:
      (unknownFromSending.modifiedCount || 0) + (unknownFromClaimed.modifiedCount || 0),
  }
}

/** @deprecated Use reclaimExpiredClaims — blind reclaim of sending jobs is unsafe. */
export async function reclaimStaleSendingClaims(userId: unknown): Promise<number> {
  const result = await reclaimExpiredClaims(userId)
  return result.safeReclaimed
}

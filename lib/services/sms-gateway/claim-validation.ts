import { SmsFallbackJob, SmsMessage, type ISmsFallbackJob } from '@/lib/db/models'
import { isSmsFullyDelivered } from '@/lib/services/sms-fallback/is-fully-delivered'
import { computeClaimExpiresAt } from '@/lib/services/sms-gateway/claim-lease'
import {
  canTransitionCanonical,
  toCanonicalStatus,
  type CanonicalPhoneStatus,
} from '@/lib/services/sms-gateway/canonical-status'

export interface ClaimValidationInput {
  jobId: unknown
  userId: unknown
  deviceId: string
  claimToken?: string | null
  attemptId?: string | null
  /** When true, extend claimExpiresAt if the claim is valid. */
  renew?: boolean
}

export interface ClaimValidationResult {
  valid: boolean
  reason?: string
  job?: ISmsFallbackJob | null
  canonicalStatus?: CanonicalPhoneStatus | null
  claimExpiresAt?: Date | null
  serverRevision?: number | null
}

export async function validateJobClaim(
  input: ClaimValidationInput
): Promise<ClaimValidationResult> {
  const job = await SmsFallbackJob.findOne({
    _id: input.jobId,
    userId: input.userId,
  })

  if (!job) {
    return { valid: false, reason: 'JOB_NOT_FOUND' }
  }

  const canonical = toCanonicalStatus(job.status, job.canonicalStatus)

  if (canonical === 'CANCELLED' || job.status === 'cancelled') {
    return {
      valid: false,
      reason: 'CANCELLED',
      job,
      canonicalStatus: canonical,
      claimExpiresAt: job.claimExpiresAt || null,
      serverRevision: job.serverRevision ?? null,
    }
  }

  if (canonical === 'SENT_VIA_PHONE' || job.status === 'sent') {
    return {
      valid: false,
      reason: 'ALREADY_SENT',
      job,
      canonicalStatus: canonical,
      claimExpiresAt: job.claimExpiresAt || null,
      serverRevision: job.serverRevision ?? null,
    }
  }

  if (canonical === 'DELIVERED_VIA_PHONE' || job.status === 'delivered') {
    return {
      valid: false,
      reason: 'ALREADY_DELIVERED',
      job,
      canonicalStatus: canonical,
      claimExpiresAt: job.claimExpiresAt || null,
      serverRevision: job.serverRevision ?? null,
    }
  }

  const owner =
    job.claimedByDeviceId || job.assignedDeviceId || job.lockedBy || job.deviceId || null
  if (owner && owner !== input.deviceId) {
    return {
      valid: false,
      reason: 'WRONG_DEVICE',
      job,
      canonicalStatus: canonical,
      claimExpiresAt: job.claimExpiresAt || null,
      serverRevision: job.serverRevision ?? null,
    }
  }

  if (input.claimToken) {
    if (!job.claimToken || job.claimToken !== input.claimToken) {
      return {
        valid: false,
        reason: 'CLAIM_TOKEN_MISMATCH',
        job,
        canonicalStatus: canonical,
        claimExpiresAt: job.claimExpiresAt || null,
        serverRevision: job.serverRevision ?? null,
      }
    }
  }

  if (input.attemptId) {
    if (!job.attemptId || job.attemptId !== input.attemptId) {
      return {
        valid: false,
        reason: 'ATTEMPT_ID_MISMATCH',
        job,
        canonicalStatus: canonical,
        claimExpiresAt: job.claimExpiresAt || null,
        serverRevision: job.serverRevision ?? null,
      }
    }
  }

  if (job.claimExpiresAt && new Date(job.claimExpiresAt).getTime() < Date.now()) {
    return {
      valid: false,
      reason: 'CLAIM_EXPIRED',
      job,
      canonicalStatus: canonical,
      claimExpiresAt: job.claimExpiresAt,
      serverRevision: job.serverRevision ?? null,
    }
  }

  if (!job.isTest && job.originalSmsId) {
    const sms = await SmsMessage.findById(job.originalSmsId)
      .select('status deliveryStatus deliveryMethod fallbackStatus deliveredAt')
      .lean()
    if (sms && isSmsFullyDelivered(sms as any)) {
      return {
        valid: false,
        reason: 'PROVIDER_ALREADY_DELIVERED',
        job,
        canonicalStatus: canonical,
        claimExpiresAt: job.claimExpiresAt || null,
        serverRevision: job.serverRevision ?? null,
      }
    }
  }

  if (input.renew && (canonical === 'CLAIMED_FOR_PHONE' || canonical === 'SUBMISSION_STARTED')) {
    job.claimExpiresAt = computeClaimExpiresAt(new Date())
    job.serverRevision = (job.serverRevision || 0) + 1
    await job.save()
  }

  return {
    valid: true,
    job,
    canonicalStatus: canonical,
    claimExpiresAt: job.claimExpiresAt || null,
    serverRevision: job.serverRevision ?? null,
  }
}

export function assertTransition(
  from: CanonicalPhoneStatus | null | undefined,
  to: CanonicalPhoneStatus
): boolean {
  return canTransitionCanonical(from, to)
}

import crypto from 'crypto'
import { SmsFallbackJob, type ISmsFallbackJob } from '@/lib/db/models'
import { computeClaimExpiresAt } from '@/lib/services/sms-gateway/claim-lease'
import {
  JOB_STATUS_BY_CANONICAL,
  type CanonicalPhoneStatus,
} from '@/lib/services/sms-gateway/canonical-status'

export function generateClaimToken(): string {
  return `clm_${crypto.randomBytes(24).toString('hex')}`
}

export function generateAttemptId(): string {
  return `att_${crypto.randomBytes(16).toString('hex')}`
}

export interface AtomicClaimParams {
  userId: unknown
  deviceId: string
  deviceName?: string
  simLabel?: string
  assignedSubscriptionId?: string | null
  /** Skip jobs already considered in this poll loop (body validation rejects). */
  excludeJobIds?: unknown[]
}

/**
 * Atomically claim one eligible pending job for a gateway device.
 * Two concurrent callers can never both succeed on the same job.
 */
export async function atomicClaimNextPendingJob(
  params: AtomicClaimParams
): Promise<ISmsFallbackJob | null> {
  const now = new Date()
  const claimToken = generateClaimToken()
  const attemptId = generateAttemptId()
  const claimExpiresAt = computeClaimExpiresAt(now)
  const deviceId = params.deviceId

  const filter: Record<string, unknown> = {
    userId: params.userId,
    status: 'pending',
    $and: [
      {
        $or: [
          { assignedDeviceId: { $exists: false } },
          { assignedDeviceId: null },
          { assignedDeviceId: '' },
          { assignedDeviceId: deviceId },
        ],
      },
    ],
  }

  if (params.excludeJobIds?.length) {
    filter._id = { $nin: params.excludeJobIds }
  }

  const update = {
    $set: {
      status: JOB_STATUS_BY_CANONICAL.CLAIMED_FOR_PHONE,
      phoneStatus: 'sending',
      canonicalStatus: 'CLAIMED_FOR_PHONE' satisfies CanonicalPhoneStatus,
      claimedByDeviceId: deviceId,
      claimedAt: now,
      claimToken,
      attemptId,
      claimExpiresAt,
      lockedAt: now,
      lockedBy: deviceId,
      deviceId,
      deviceName: params.deviceName || undefined,
      simLabel: params.simLabel || undefined,
      assignedDeviceId: deviceId,
      assignedSubscriptionId: params.assignedSubscriptionId || undefined,
    },
    $inc: {
      attempts: 1,
      serverRevision: 1,
    },
    $unset: {
      resetReason: 1,
      failureReason: 1,
      failureCode: 1,
      failedAt: 1,
      submissionStartedAt: 1,
      sendingAt: 1,
    },
  }

  const job = await SmsFallbackJob.findOneAndUpdate(filter, update, {
    sort: { createdAt: 1 },
    new: true,
  })

  return job
}

/** Release a just-claimed job back to pending when body/eligibility checks fail. */
export async function releaseClaimedJobToPending(
  jobId: unknown,
  claimToken: string,
  reason: string
): Promise<void> {
  await SmsFallbackJob.findOneAndUpdate(
    {
      _id: jobId,
      status: 'claimed',
      claimToken,
      submissionStartedAt: null,
    },
    {
      $set: {
        status: 'pending',
        phoneStatus: 'pending',
        canonicalStatus: 'QUEUED_FOR_PHONE',
        resetReason: reason,
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
}

export function formatClaimedJobForAndroid(job: ISmsFallbackJob) {
  return {
    // Legacy fields (do not remove)
    id: String(job._id),
    recipientPhone: job.normalizedPhone || job.recipientPhone,
    message: job.message,
    status: 'pending',
    isTest: Boolean(job.isTest),
    createdAt: job.createdAt,
    attempts: job.attempts || 0,
    // Atomic-claim fields for newer Android builds
    claimToken: job.claimToken || null,
    attemptId: job.attemptId || null,
    attemptNumber: job.attempts || 0,
    claimExpiresAt: job.claimExpiresAt ? new Date(job.claimExpiresAt).toISOString() : null,
    serverJobId: String(job._id),
    originalSmsId: job.originalSmsId || null,
    canonicalStatus: job.canonicalStatus || 'CLAIMED_FOR_PHONE',
    assignedDeviceId: job.assignedDeviceId || job.claimedByDeviceId || null,
    assignedSubscriptionId: job.assignedSubscriptionId || null,
    serverRevision: job.serverRevision ?? null,
  }
}

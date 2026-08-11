import connectDB from '@/lib/db/connect'
import { SmsFallbackJob, SmsMessage } from '@/lib/db/models'
import { JOB_STATUS_BY_CANONICAL } from '@/lib/services/sms-gateway/canonical-status'
import { getFallbackScanBatchSize, getFallbackScanConcurrency } from './config'
import { mapPool } from './concurrency'

/**
 * After /sending has been acknowledged, missing SENT/DELIVERED callbacks do NOT
 * mean the modem failed — SMS may already be on the radio.
 *
 * Stuck SUBMISSION_STARTED jobs therefore become SUBMISSION_UNKNOWN
 * (never pending, never PHONE_SEND_FAILED, never auto-resend).
 */
export const GATEWAY_SENDING_TIMEOUT_MS = 2 * 60 * 1000

/**
 * Mark stale SUBMISSION_STARTED jobs as SUBMISSION_UNKNOWN.
 *
 * SAFE reclaim of CLAIMED_FOR_PHONE (no submissionStartedAt) is handled by
 * reclaimExpiredClaims — this function must NOT return sending jobs to pending.
 */
export async function resetStaleSendingJobs(): Promise<number> {
  await connectDB()

  const cutoff = new Date(Date.now() - GATEWAY_SENDING_TIMEOUT_MS)
  const batchSize = getFallbackScanBatchSize()
  const concurrency = getFallbackScanConcurrency()

  const stuckJobs = await SmsFallbackJob.find({
    status: 'sending',
    $or: [
      { sendingAt: { $lte: cutoff } },
      { submissionStartedAt: { $lte: cutoff } },
    ],
  })
    .limit(batchSize)
    .lean()

  if (stuckJobs.length === 0) return 0

  const results = await mapPool(stuckJobs, concurrency, async (job) => {
    // Atomic: only transition while still in SUBMISSION_STARTED
    const updated = await SmsFallbackJob.findOneAndUpdate(
      {
        _id: job._id,
        status: 'sending',
      },
      {
        $set: {
          status: JOB_STATUS_BY_CANONICAL.SUBMISSION_UNKNOWN,
          phoneStatus: 'sending',
          canonicalStatus: 'SUBMISSION_UNKNOWN',
          resetReason: 'submission_started_status_timeout',
        },
        // Keep attemptId + device ownership for late authoritative callbacks.
        // Do NOT clear claimToken either — optional validation if Android still has it.
        $inc: { serverRevision: 1 },
      },
      { new: true }
    )

    if (!updated) return false

    if (!job.isTest && job.originalSmsId) {
      // Projection only — do not mark SmsMessage as failed / finalized.
      // Canonical uncertainty lives on SmsFallbackJob.
      await SmsMessage.findByIdAndUpdate(job.originalSmsId, {
        $set: {
          fallbackStatus: 'sending_via_phone',
          fallbackFailureReason: 'Submission started — SENT/DELIVERED confirmation pending or delayed',
          fallbackFailureCode: 'SUBMISSION_UNKNOWN',
        },
        $unset: {
          // Ensure we never leave a false failed projection from older timeout logic
          finalizedAt: 1,
        },
      }).catch(() => undefined)
    }

    return true
  })

  return results.filter(Boolean).length
}

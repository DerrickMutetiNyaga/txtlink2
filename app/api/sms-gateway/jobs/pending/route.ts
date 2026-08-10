import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db/connect'
import { SmsFallbackJob, SmsMessage, ISmsMessage, SmsGatewayDevice } from '@/lib/db/models'
import {
  validateGatewayDevice,
  gatewayAuthErrorResponse,
} from '@/lib/services/sms-gateway/auth'
import { cancelFallbackJobIfDelivered } from '@/lib/services/sms-fallback/helpers'
import { isSmsFullyDelivered } from '@/lib/services/sms-fallback/is-fully-delivered'
import { logGatewayJobAction } from '@/lib/services/sms-gateway/job-logger'
import { isPhoneDeliveredFallbackStatus } from '@/lib/services/sms-fallback/phone-status'
import {
  resolveFallbackMessageForSms,
  buildMetadataFromSms,
  isMetadataUsedAsMessageBody,
} from '@/lib/services/sms/message-body'
import { reclaimExpiredClaims } from '@/lib/services/sms-gateway/claim-recovery'
import {
  clampPendingJobLimit,
  pendingClaimAttemptBudget,
} from '@/lib/services/sms-gateway/pending-query'
import {
  atomicClaimNextPendingJob,
  formatClaimedJobForAndroid,
  releaseClaimedJobToPending,
} from '@/lib/services/sms-gateway/atomic-claim'
import { recordGatewayConnectionDiagnostic } from '@/lib/services/sms-gateway/diagnostics'
import { buildServerTimingHeader, elapsedMs, nowMs } from '@/lib/services/sms-gateway/timing'
import { getClaimLeaseSeconds } from '@/lib/services/sms-gateway/claim-lease'

const ROUTE = 'GET /api/sms-gateway/jobs/pending'

function jsonWithTiming(
  body: Record<string, unknown>,
  status: number,
  timing: { totalMs: number; dbMs: number }
) {
  const response = NextResponse.json(body, { status })
  response.headers.set(
    'Server-Timing',
    buildServerTimingHeader({ db: timing.dbMs, total: timing.totalMs })
  )
  response.headers.set('X-Gateway-Db-Ms', String(timing.dbMs))
  response.headers.set('X-Gateway-Total-Ms', String(timing.totalMs))
  return response
}

/**
 * Atomic pending acquisition:
 * for each slot in the batch, findOneAndUpdate one eligible pending job → CLAIMED_FOR_PHONE.
 * Concurrent polls cannot claim the same job.
 */
export async function GET(request: NextRequest) {
  const startedAt = nowMs()
  let dbMs = 0
  let deviceId: unknown = null
  let gatewayDeviceIdHeader: string | null = request.headers.get('x-gateway-device-id')

  try {
    const auth = await validateGatewayDevice(request, { route: ROUTE })
    if (!auth.ok) {
      const totalMs = elapsedMs(startedAt)
      await recordGatewayConnectionDiagnostic({
        deviceId: null,
        route: ROUTE,
        httpStatus: auth.status,
        durationMs: totalMs,
        dbQueryDurationMs: dbMs,
        jobsReturned: 0,
        kind: 'pending',
        gatewayDeviceIdHeader,
      }).catch(() => undefined)
      return gatewayAuthErrorResponse(auth)
    }

    deviceId = auth.device._id
    const claimedByDeviceId = String(auth.device._id)
    gatewayDeviceIdHeader =
      auth.identity.deviceId || request.headers.get('x-gateway-device-id')

    await connectDB()

    if (auth.device.requiresTopUp) {
      const totalMs = elapsedMs(startedAt)
      await recordGatewayConnectionDiagnostic({
        deviceId,
        route: ROUTE,
        httpStatus: 200,
        durationMs: totalMs,
        dbQueryDurationMs: dbMs,
        jobsReturned: 0,
        kind: 'pending',
        gatewayDeviceIdHeader,
      })
      return jsonWithTiming(
        {
          success: true,
          jobs: [],
          gatewayPaused: true,
          requiresTopUp: true,
          message: 'Phone gateway paused — reload SMS bundle or airtime on the device',
          timing: { dbMs, totalMs },
          claimLeaseSeconds: getClaimLeaseSeconds(),
        },
        200,
        { dbMs, totalMs }
      )
    }

    const { searchParams } = new URL(request.url)
    const limit = clampPendingJobLimit(searchParams.get('limit'))
    const userId = auth.device.userId
    const assignedSubscriptionId =
      searchParams.get('subscriptionId') ||
      searchParams.get('assignedSubscriptionId') ||
      auth.device.boundSimLabel ||
      null

    // Cheap maintenance: notified → pending; safe expired reclaim only
    const maintStart = nowMs()
    await SmsFallbackJob.updateMany(
      { userId, status: 'notified' },
      {
        $set: {
          status: 'pending',
          phoneStatus: 'pending',
          canonicalStatus: 'QUEUED_FOR_PHONE',
        },
      }
    )
    const recovery = await reclaimExpiredClaims(userId)
    dbMs += elapsedMs(maintStart)

    const activeJobs = []
    const excludeJobIds: unknown[] = []
    const budget = pendingClaimAttemptBudget(limit)

    for (let i = 0; i < budget && activeJobs.length < limit; i++) {
      const claimStart = nowMs()
      const job = await atomicClaimNextPendingJob({
        userId,
        deviceId: claimedByDeviceId,
        deviceName: auth.device.boundDeviceName,
        simLabel: auth.device.boundSimLabel,
        assignedSubscriptionId,
        excludeJobIds,
      })
      dbMs += elapsedMs(claimStart)

      if (!job) break

      excludeJobIds.push(job._id)

      // Eligibility / body checks after atomic claim — release if unusable
      if (!job.isTest && job.originalSmsId) {
        const cancelled = await cancelFallbackJobIfDelivered(
          job.originalSmsId,
          'Original SMS delivered before phone fallback'
        )
        if (cancelled) {
          await releaseClaimedJobToPending(
            job._id,
            job.claimToken || '',
            'released_provider_already_delivered'
          )
          // cancelFallbackJobIfDelivered may have cancelled — ensure not left claimed
          await SmsFallbackJob.findOneAndUpdate(
            { _id: job._id, status: 'claimed' },
            {
              $set: {
                status: 'cancelled',
                phoneStatus: 'cancelled',
                canonicalStatus: 'CANCELLED',
                cancelReason: 'Original SMS delivered before phone fallback',
              },
              $unset: {
                claimToken: 1,
                attemptId: 1,
                claimExpiresAt: 1,
                claimedAt: 1,
                claimedByDeviceId: 1,
              },
            }
          )
          continue
        }

        const sms = await SmsMessage.findById(job.originalSmsId)
          .select(
            'status deliveryStatus deliveryMethod fallbackStatus deliveredAt message messageBody renderedMessageBody originalMessageBody messageRedacted apiKeyName clientUsername clientName campaignName senderName email'
          )
          .lean()

        if (!sms) {
          await SmsFallbackJob.findByIdAndUpdate(job._id, {
            $set: {
              status: 'cancelled',
              phoneStatus: 'cancelled',
              canonicalStatus: 'CANCELLED',
              cancelReason: 'Original SMS not found',
            },
            $unset: {
              claimToken: 1,
              attemptId: 1,
              claimExpiresAt: 1,
            },
          })
          continue
        }

        const smsDoc = sms as ISmsMessage
        if (isSmsFullyDelivered(smsDoc) || isPhoneDeliveredFallbackStatus(sms.fallbackStatus)) {
          await SmsFallbackJob.findByIdAndUpdate(job._id, {
            status: 'cancelled',
            phoneStatus: 'cancelled',
            canonicalStatus: 'CANCELLED',
            cancelReason: 'Original SMS delivered before phone fallback',
          })
          continue
        }

        const resolved = resolveFallbackMessageForSms(smsDoc)
        if (resolved) {
          if (job.message !== resolved.body) {
            job.message = resolved.body
            await SmsFallbackJob.findByIdAndUpdate(job._id, { message: resolved.body })
          }
        } else if (isMetadataUsedAsMessageBody(job.message, buildMetadataFromSms(smsDoc))) {
          await releaseClaimedJobToPending(
            job._id,
            job.claimToken || '',
            'released_invalid_message_body'
          )
          continue
        }

        await SmsMessage.findByIdAndUpdate(job.originalSmsId, {
          fallbackStatus: 'sending_via_phone',
        })
      }

      if (!job.message?.trim()) {
        await releaseClaimedJobToPending(
          job._id,
          job.claimToken || '',
          'released_empty_message'
        )
        continue
      }

      activeJobs.push(formatClaimedJobForAndroid(job))
    }

    const syncStart = nowMs()
    await SmsGatewayDevice.updateOne({ _id: deviceId }, { $set: { lastSyncAt: new Date() } })
    dbMs += elapsedMs(syncStart)

    const totalMs = elapsedMs(startedAt)
    await recordGatewayConnectionDiagnostic({
      deviceId,
      route: ROUTE,
      httpStatus: 200,
      durationMs: totalMs,
      dbQueryDurationMs: dbMs,
      jobsReturned: activeJobs.length,
      kind: 'pending',
      gatewayDeviceIdHeader,
    })

    logGatewayJobAction({
      route: ROUTE,
      jobId: '-',
      deviceName: auth.device.boundDeviceName,
      responseCode: 200,
      message: `Atomically claimed ${activeJobs.length} jobs`,
      extra: {
        returned: activeJobs.length,
        safeReclaimed: recovery.safeReclaimed,
        markedUnknown: recovery.markedUnknown,
        limit,
        dbMs,
        totalMs,
        claimLeaseSeconds: getClaimLeaseSeconds(),
      },
    })

    return jsonWithTiming(
      {
        success: true,
        jobs: activeJobs,
        reclaimed: recovery.safeReclaimed,
        markedUnknown: recovery.markedUnknown,
        claimLeaseSeconds: getClaimLeaseSeconds(),
        timing: { dbMs, totalMs },
      },
      200,
      { dbMs, totalMs }
    )
  } catch (error: any) {
    console.error('SMS gateway pending jobs error:', error)
    const totalMs = elapsedMs(startedAt)
    await recordGatewayConnectionDiagnostic({
      deviceId,
      route: ROUTE,
      httpStatus: 500,
      durationMs: totalMs,
      dbQueryDurationMs: dbMs,
      jobsReturned: 0,
      kind: 'pending',
      gatewayDeviceIdHeader,
    }).catch(() => undefined)
    return jsonWithTiming(
      { success: false, message: 'Internal server error', timing: { dbMs, totalMs } },
      500,
      { dbMs, totalMs }
    )
  }
}

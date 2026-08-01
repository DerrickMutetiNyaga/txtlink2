import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db/connect'
import { SmsFallbackJob, SmsMessage, ISmsMessage } from '@/lib/db/models'
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

const ROUTE = 'GET /api/sms-gateway/jobs/pending'

/** Stuck "sending" jobs older than this are re-queued immediately on poll. */
const STALE_SENDING_RECLAIM_MS = 90 * 1000

async function finalizeDeliveredJob(jobId: unknown, deliveredAt: Date): Promise<void> {
  await SmsFallbackJob.findByIdAndUpdate(jobId, {
    status: 'delivered',
    phoneStatus: 'delivered',
    deliveredAt,
    sentAt: deliveredAt,
  })
}

/**
 * Unstick older jobs so the phone can drain the queue oldest-first:
 * - reclaim stale "sending" claims
 * - reopen jobs wrongly cancelled/closed while the SMS still needs phone send
 */
async function reclaimStuckPhoneJobs(userId: unknown): Promise<number> {
  const now = new Date()
  const staleCutoff = new Date(now.getTime() - STALE_SENDING_RECLAIM_MS)

  const staleSending = await SmsFallbackJob.updateMany(
    {
      userId,
      status: 'sending',
      sendingAt: { $lte: staleCutoff },
    },
    {
      $set: {
        status: 'pending',
        phoneStatus: 'pending',
        resetReason: 'reclaimed_on_pending_poll',
      },
      $unset: { sendingAt: 1, lockedAt: 1, lockedBy: 1 },
    }
  )

  // Jobs closed as "delivered/cancelled" while the SMS was only queued to phone
  // (deliveryMethod was set at queue time — not confirmation).
  const candidates = await SmsFallbackJob.find({
    userId,
    status: { $in: ['cancelled', 'delivered', 'failed'] },
    isTest: { $ne: true },
    $or: [
      { cancelReason: /delivered before phone/i },
      { resetReason: 'reclaimed_on_pending_poll' },
      {
        status: 'delivered',
        phoneStatus: { $in: ['delivered', 'pending', 'sending', null] },
      },
      { status: 'failed', failureCode: 'SENDING_TIMEOUT' },
    ],
  })
    .sort({ createdAt: 1 })
    .limit(150)
    .select('_id originalSmsId status')
    .lean()

  let reopened = 0
  for (const job of candidates) {
    if (!job.originalSmsId) continue
    const sms = await SmsMessage.findById(job.originalSmsId)
      .select('status deliveryStatus deliveryMethod fallbackStatus deliveredAt')
      .lean()
    if (!sms) continue
    if (isSmsFullyDelivered(sms as ISmsMessage)) continue

    // Still needs phone send
    const needsPhone =
      sms.fallbackStatus === 'queued_for_phone' ||
      sms.fallbackStatus === 'sending_via_phone' ||
      sms.fallbackStatus === 'phone_failed' ||
      sms.deliveryMethod === 'android_phone_gateway' ||
      sms.deliveryMethod === 'android_phone_gateway_failed' ||
      (sms.status !== 'delivered' &&
        ['queued', 'sent', 'failed', 'processing', 'retrying'].includes(String(sms.status)))

    if (!needsPhone) continue

    await SmsFallbackJob.findByIdAndUpdate(job._id, {
      $set: {
        status: 'pending',
        phoneStatus: 'pending',
        resetReason: 'reopened_undelivered_queue',
      },
      $unset: {
        sendingAt: 1,
        lockedAt: 1,
        lockedBy: 1,
        failedAt: 1,
        failureReason: 1,
        failureCode: 1,
        cancelReason: 1,
        deliveredAt: 1,
        sentAt: 1,
      },
    })

    await SmsMessage.findByIdAndUpdate(job.originalSmsId, {
      $set: {
        status: sms.status === 'delivered' ? 'queued' : sms.status,
        fallbackStatus: 'queued_for_phone',
        fallbackQueued: true,
        deliveryMethod: 'android_phone_gateway',
        nextCheckAt: null,
      },
      $unset: {
        fallbackFailedAt: 1,
        fallbackFailureReason: 1,
        fallbackFailureCode: 1,
        failedAt: 1,
        finalizedAt: 1,
        requiresPhoneTopUp: 1,
      },
    })

    reopened++
  }

  return (staleSending.modifiedCount || 0) + reopened
}

export async function GET(request: NextRequest) {
  try {
    const auth = await validateGatewayDevice(request, { route: ROUTE })
    if (!auth.ok) {
      return gatewayAuthErrorResponse(auth)
    }

    await connectDB()

    if (auth.device.requiresTopUp && auth.device.pauseScope !== 'SIM') {
      return NextResponse.json({
        success: true,
        jobs: [],
        gatewayPaused: false,
        simPaused: true,
        requiresTopUp: true,
        message: 'Phone gateway SIM paused — reload SMS bundle or airtime on the device',
        keepRunning: true,
      })
    }

    // SIM-scoped top-up: still return jobs (other SIMs may handle them)
    // Android assigns by available SIM; website does not pause whole gateway.

    const { searchParams } = new URL(request.url)
    // Higher default so a connected phone can drain a surge / backlog faster
    const limit = Math.min(parseInt(searchParams.get('limit') || '40', 10) || 40, 100)
    const userId = auth.device.userId

    await SmsFallbackJob.updateMany(
      { userId, status: 'notified' },
      { $set: { status: 'pending', phoneStatus: 'pending' } }
    )

    // Do NOT promote status "sent" → "delivered" here.
    // Sent via phone without a delivery report must remain sent (delivery unconfirmed).

    const reclaimed = await reclaimStuckPhoneJobs(userId)

    // Over-fetch: some candidates get skipped (delivered SMS, bad body) —
    // keep scanning oldest-first until we fill `limit` or run out.
    const fetchLimit = Math.min(Math.max(limit * 3, 60), 200)
    const jobs = await SmsFallbackJob.find({ userId, status: 'pending' })
      .sort({ createdAt: 1 })
      .limit(fetchLimit)
      .lean()

    const activeJobs = []
    for (const job of jobs) {
      if (activeJobs.length >= limit) break
      if (job.status !== 'pending') continue
      // Confirmed delivery stamp only — sentAt alone means delivery unconfirmed
      if (job.phoneStatus === 'delivered' || job.deliveredAt) {
        if (!job.isTest && job.originalSmsId) {
          const smsCheck = await SmsMessage.findById(job.originalSmsId)
            .select('status fallbackStatus deliveredAt')
            .lean()
          if (smsCheck && !isSmsFullyDelivered(smsCheck as ISmsMessage)) {
            await SmsFallbackJob.findByIdAndUpdate(job._id, {
              $unset: { deliveredAt: 1 },
              $set: { phoneStatus: job.sentAt ? 'sent' : 'pending' },
            })
          } else {
            await finalizeDeliveredJob(job._id, job.deliveredAt || new Date())
            continue
          }
        } else {
          await finalizeDeliveredJob(job._id, job.deliveredAt || new Date())
          continue
        }
      }
      // Stale pending row with a send stamp should not re-enter the send queue
      if (job.sentAt) {
        continue
      }

      let jobMessage = job.message
      let smsForBody: ISmsMessage | null = null

      if (!job.isTest) {
        const cancelled = await cancelFallbackJobIfDelivered(
          job.originalSmsId,
          'Original SMS delivered before phone fallback'
        )
        if (cancelled) continue

        const sms = await SmsMessage.findById(job.originalSmsId).lean()
        if (!sms) {
          await SmsFallbackJob.findByIdAndUpdate(job._id, {
            status: 'cancelled',
            phoneStatus: 'cancelled',
            cancelReason: 'Original SMS not found',
          })
          continue
        }
        smsForBody = sms as ISmsMessage

        // Only skip when delivery is confirmed — NOT when merely queued to phone
        if (isSmsFullyDelivered(smsForBody) || isPhoneDeliveredFallbackStatus(sms.fallbackStatus)) {
          await SmsFallbackJob.findByIdAndUpdate(job._id, {
            status: 'cancelled',
            phoneStatus: 'cancelled',
            cancelReason: 'Original SMS delivered before phone fallback',
          })
          continue
        }
      }

      if (smsForBody) {
        const resolved = resolveFallbackMessageForSms(smsForBody)
        if (resolved) {
          jobMessage = resolved.body
          if (job.message !== resolved.body) {
            await SmsFallbackJob.findByIdAndUpdate(job._id, { message: resolved.body })
          }
        } else if (isMetadataUsedAsMessageBody(job.message, buildMetadataFromSms(smsForBody))) {
          console.error('Pending job has invalid message body — skipping', {
            jobId: String(job._id),
            originalSmsId: job.originalSmsId,
          })
          continue
        }
      }

      if (!jobMessage?.trim()) continue

      activeJobs.push({
        id: String(job._id),
        recipientPhone: job.normalizedPhone || job.recipientPhone,
        message: jobMessage,
        status: 'pending',
        isTest: Boolean(job.isTest),
        createdAt: job.createdAt,
        attempts: job.attempts || 0,
      })
    }

    auth.device.lastSyncAt = new Date()
    auth.device.lastJobFetchedAt = new Date()
    await auth.device.save()

    logGatewayJobAction({
      route: ROUTE,
      jobId: '-',
      deviceName: auth.device.boundDeviceName,
      responseCode: 200,
      message: `Returned ${activeJobs.length} pending jobs`,
      extra: { returned: activeJobs.length, reclaimed, limit },
    })

    return NextResponse.json({
      success: true,
      jobs: activeJobs,
      reclaimed,
      gatewayPaused: false,
      keepRunning: true,
      requiresTopUp: Boolean(auth.device.requiresTopUp),
      pauseScope: auth.device.pauseScope || null,
      pausedSubscriptionId: auth.device.pausedSubscriptionId || null,
    })
  } catch (error: any) {
    console.error('SMS gateway pending jobs error:', error)
    // Fetch failure must never pause the gateway or fail jobs
    return NextResponse.json(
      {
        success: false,
        message: 'Internal server error',
        jobs: [],
        gatewayPaused: false,
        keepRunning: true,
      },
      { status: 500 }
    )
  }
}

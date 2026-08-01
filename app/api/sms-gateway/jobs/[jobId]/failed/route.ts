import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db/connect'
import { SmsFallbackJob, SmsMessage } from '@/lib/db/models'
import {
  validateGatewayDevice,
  gatewayAuthErrorResponse,
} from '@/lib/services/sms-gateway/auth'
import { logGatewayJobAction } from '@/lib/services/sms-gateway/job-logger'
import { parseGatewayJobId } from '@/lib/services/sms-gateway/job-lifecycle'
import { classifyGatewayFailure } from '@/lib/services/sms-gateway/failure-classify'
import {
  beginGatewayStatusEvent,
  completeGatewayStatusEvent,
} from '@/lib/services/sms-gateway/idempotency'
import { canTransitionPhoneJobStatus } from '@/lib/services/sms-gateway/phone-status-transitions'
import { logGatewayAudit } from '@/lib/services/sms-gateway/audit'
import { GATEWAY_SETUP_DEFAULTS } from '@/lib/services/sms-gateway/config'

type RouteContext = { params: Promise<{ jobId: string }> }

const ROUTE = 'POST /api/sms-gateway/jobs/[jobId]/failed'

export async function POST(request: NextRequest, context: RouteContext) {
  const { jobId: rawJobId } = await context.params
  const jobId = parseGatewayJobId(rawJobId)

  try {
    const body = await request.json().catch(() => ({}))
    const deviceName = body.deviceName || ''
    const simLabel = body.simLabel || ''

    const auth = await validateGatewayDevice(request, {
      route: ROUTE,
      body: { deviceName, simLabel, deviceId: body.deviceId },
    })
    if (!auth.ok) {
      return gatewayAuthErrorResponse(auth)
    }

    if (!jobId) {
      return NextResponse.json({ success: false, message: 'Invalid job ID' }, { status: 400 })
    }

    await connectDB()

    const idempotency = await beginGatewayStatusEvent({
      userId: auth.device.userId,
      jobId: rawJobId,
      eventId: body.eventId,
      idempotencyKey: body.idempotencyKey,
      attemptId: body.attemptId,
      eventType: body.eventType || 'failed',
      eventTimestamp: body.eventTimestamp || body.failedAt,
      partIndex: body.partIndex,
      totalParts: body.totalParts,
    })
    if (idempotency.duplicate) {
      await logGatewayAudit(String(auth.device.userId), 'GATEWAY_STATUS_DUPLICATE', rawJobId, {
        eventType: 'failed',
      })
      return NextResponse.json(idempotency.previousResponse)
    }

    const existing = await SmsFallbackJob.findOne({
      _id: jobId,
      userId: auth.device.userId,
    })
      .select('status isTest')
      .lean()

    const statusBefore = existing?.status ?? null

    if (existing?.status === 'delivered' || existing?.status === 'sent') {
      const response = {
        success: false,
        message: 'Job already delivered/sent — failure ignored',
        jobStatus: existing.status,
      }
      await completeGatewayStatusEvent(auth.device.userId, idempotency.key, response)
      return NextResponse.json(response, { status: 409 })
    }

    if (existing?.status === 'blocked' || existing?.status === 'failed') {
      const response = {
        success: true,
        message: 'Job already marked as failed',
        jobStatus: existing.status,
      }
      await completeGatewayStatusEvent(auth.device.userId, idempotency.key, response)
      return NextResponse.json(response)
    }

    const failedAt = body.failedAt ? new Date(body.failedAt) : new Date()
    const failureReason =
      body.failureReason || 'SMS permission denied or network unavailable'
    const failureCode = body.failureCode || undefined
    const needsTopUp = body.requiresTopUp === true

    const classification = classifyGatewayFailure({
      failureReason,
      failureCode,
      requiresTopUp: needsTopUp,
      resultCode: body.resultCode,
      httpStatus: body.httpStatus,
    })

    // Ambiguous / transient: do not mark permanently failed; requeue for retry
    if (
      !needsTopUp &&
      (classification.category === 'AMBIGUOUS_RESULT' ||
        classification.category === 'TRANSIENT_CONNECTIVITY' ||
        classification.category === 'TRANSIENT_SYNC' ||
        classification.category === 'TRANSIENT_SERVER')
    ) {
      await SmsFallbackJob.findOneAndUpdate(
        { _id: jobId, userId: auth.device.userId, status: { $in: ['sending', 'pending'] } },
        {
          $set: {
            status: 'pending',
            phoneStatus: 'pending',
            resetReason: 'ambiguous_or_transient_failure',
          },
          $unset: { sendingAt: 1, lockedAt: 1, lockedBy: 1 },
          $inc: { attempts: 0 },
        }
      )

      auth.device.lastTransientError = classification.label
      auth.device.consecutiveTransientFailures =
        (auth.device.consecutiveTransientFailures || 0) + 1
      auth.device.lastFailureAt = failedAt
      auth.device.lastFailureReason = failureReason
      auth.device.lastFailureCode = failureCode
      auth.device.failureCategory = classification.category
      auth.device.syncHealth = 'RETRYING'
      // Never pause gateway for transient / ambiguous results
      await auth.device.save()

      const jobDoc = await SmsFallbackJob.findById(jobId).select('originalSmsId isTest').lean()
      if (jobDoc && !jobDoc.isTest) {
        await SmsMessage.findByIdAndUpdate(jobDoc.originalSmsId, {
          $set: {
            fallbackStatus: 'queued_for_phone',
            fallbackQueued: true,
            deliveryMethod: 'android_phone_gateway',
          },
          $unset: {
            fallbackFailedAt: 1,
            fallbackFailureReason: 1,
            finalizedAt: 1,
          },
        })
      }

      const response = {
        success: true,
        message: 'Transient/ambiguous failure recorded — job remains queued (not permanently failed)',
        jobStatus: 'pending',
        failureCategory: classification.category,
        gatewayPaused: false,
      }
      await completeGatewayStatusEvent(auth.device.userId, idempotency.key, response)
      await logGatewayAudit(String(auth.device.userId), 'GATEWAY_TRANSIENT_ERROR', rawJobId, {
        category: classification.category,
        label: classification.label,
      })
      return NextResponse.json(response)
    }

    const targetJobStatus = needsTopUp ? 'blocked' : 'failed'
    const transition = canTransitionPhoneJobStatus(existing?.status, targetJobStatus)
    if (!transition.ok && statusBefore === 'delivered') {
      const response = {
        success: false,
        message: 'Cannot fail an already delivered job',
        jobStatus: statusBefore,
      }
      await completeGatewayStatusEvent(auth.device.userId, idempotency.key, response)
      return NextResponse.json(response, { status: 409 })
    }

    const jobUpdate = needsTopUp
      ? {
          status: 'blocked' as const,
          phoneStatus: 'requires_topup' as const,
          failedAt,
          failureReason,
          failureCode,
          requiresTopUp: true,
          deviceName: deviceName || auth.device.boundDeviceName,
          simLabel: simLabel || auth.device.boundSimLabel,
        }
      : {
          status: 'failed' as const,
          phoneStatus: 'failed' as const,
          failedAt,
          failureReason,
          failureCode,
          requiresTopUp: false,
          deviceName: deviceName || auth.device.boundDeviceName,
          simLabel: simLabel || auth.device.boundSimLabel,
        }

    const job = await SmsFallbackJob.findOneAndUpdate(
      {
        _id: jobId,
        userId: auth.device.userId,
        status: { $in: ['sending', 'pending'] },
      },
      {
        $set: jobUpdate,
        $unset: { resetReason: 1 },
      },
      { new: true }
    )

    if (!job) {
      return NextResponse.json(
        { success: false, message: 'Job not found or already processed' },
        { status: 409 }
      )
    }

    if (!job.isTest) {
      await SmsMessage.findByIdAndUpdate(job.originalSmsId, {
        status: 'failed',
        fallbackStatus: needsTopUp ? 'phone_requires_topup' : 'phone_failed',
        fallbackFailedAt: failedAt,
        fallbackFailureReason: failureReason,
        fallbackFailureCode: failureCode,
        requiresPhoneTopUp: needsTopUp,
        deliveryMethod: 'android_phone_gateway_failed',
        failedAt,
        finalizedAt: failedAt,
        nextCheckAt: null,
        errorMessage: failureReason,
        errorCode: failureCode || 'PHONE_GATEWAY_FAILED',
      })
    }

    auth.device.lastFailureAt = failedAt
    auth.device.lastFailureReason = failureReason
    auth.device.lastFailureCode = failureCode
    auth.device.failureCategory = classification.category

    if (needsTopUp || classification.pauseScope === 'SIM') {
      // Pause only the affected SIM — gateway service stays eligible for other SIMs
      auth.device.requiresTopUp = needsTopUp
      auth.device.topUpAlertDismissed = false
      auth.device.pauseScope = 'SIM'
      auth.device.pausedSubscriptionId =
        body.subscriptionId || body.simSubscriptionId || simLabel || 'default'
      auth.device.pausedAt = failedAt
      auth.device.pauseReason = failureReason
      // Do NOT set isGatewayRunning = false for SIM-only pauses
      auth.device.consecutiveFailureCount = (auth.device.consecutiveFailureCount || 0) + 1
      await logGatewayAudit(String(auth.device.userId), 'GATEWAY_SIM_PAUSED', String(auth.device._id), {
        subscriptionId: auth.device.pausedSubscriptionId,
        category: classification.category,
      })
    } else if (
      classification.countsAsModemFailure &&
      (auth.device.consecutiveFailureCount || 0) + 1 >=
        (auth.device.clientMaxFailuresBeforePause || GATEWAY_SETUP_DEFAULTS.maxFailuresBeforePause)
    ) {
      // Only after repeated confirmed modem failures — still SIM-scoped when possible
      auth.device.pauseScope = 'SIM'
      auth.device.pausedSubscriptionId =
        body.subscriptionId || body.simSubscriptionId || simLabel || 'default'
      auth.device.pausedAt = failedAt
      auth.device.pauseReason = failureReason
      auth.device.consecutiveFailureCount = (auth.device.consecutiveFailureCount || 0) + 1
    } else if (classification.countsAsModemFailure) {
      auth.device.consecutiveFailureCount = (auth.device.consecutiveFailureCount || 0) + 1
    }

    // Explicit user stop from Android only
    if (body.isGatewayRunning === false && body.userStopped === true) {
      auth.device.isGatewayRunning = false
      auth.device.serviceState = 'STOPPED_BY_USER'
      auth.device.pauseScope = 'GATEWAY'
      auth.device.pausedAt = failedAt
      auth.device.pauseReason = 'Stopped by user'
    }

    await auth.device.save()

    const response = {
      success: true,
      message: needsTopUp
        ? 'Job blocked — affected SIM needs SMS bundle or airtime'
        : 'Job marked as failed',
      jobStatus: needsTopUp ? 'blocked' : 'failed',
      failureCategory: classification.category,
      pauseScope: auth.device.pauseScope || null,
      gatewayPaused: auth.device.pauseScope === 'GATEWAY',
    }

    await completeGatewayStatusEvent(auth.device.userId, idempotency.key, response)

    logGatewayJobAction({
      route: ROUTE,
      jobId: rawJobId,
      deviceName: job.deviceName,
      statusBefore: statusBefore || 'sending',
      statusAfter: needsTopUp ? 'blocked' : 'failed',
      responseCode: 200,
      extra: {
        failureReason,
        failureCode,
        requiresTopUp: needsTopUp,
        category: classification.category,
      },
    })

    return NextResponse.json(response)
  } catch (error: any) {
    console.error('SMS gateway job failed error:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    )
  }
}

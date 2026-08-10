import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db/connect'
import { SmsFallbackJob, SmsMessage, SmsGatewayDevice } from '@/lib/db/models'
import {
  validateGatewayDevice,
  gatewayAuthErrorResponse,
} from '@/lib/services/sms-gateway/auth'
import { logGatewayJobAction } from '@/lib/services/sms-gateway/job-logger'
import { parseGatewayJobId } from '@/lib/services/sms-gateway/job-lifecycle'
import { recordGatewayConnectionDiagnostic } from '@/lib/services/sms-gateway/diagnostics'
import { elapsedMs, nowMs } from '@/lib/services/sms-gateway/timing'

type RouteContext = { params: Promise<{ jobId: string }> }

const ROUTE = 'POST /api/sms-gateway/jobs/[jobId]/failed'

export async function POST(request: NextRequest, context: RouteContext) {
  const { jobId: rawJobId } = await context.params
  const jobId = parseGatewayJobId(rawJobId)
  const startedAt = nowMs()
  let deviceId: unknown = null
  let gatewayDeviceIdHeader: string | null = request.headers.get('x-gateway-device-id')

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

    deviceId = auth.device._id
    gatewayDeviceIdHeader =
      (typeof body.deviceId === 'string' ? body.deviceId : null) ||
      auth.identity.deviceId ||
      gatewayDeviceIdHeader

    if (!jobId) {
      return NextResponse.json({ success: false, message: 'Invalid job ID' }, { status: 400 })
    }

    await connectDB()

    const existing = await SmsFallbackJob.findOne({
      _id: jobId,
      userId: auth.device.userId,
    })
      .select('status isTest')
      .lean()

    const statusBefore = existing?.status ?? null

    // Idempotent: duplicate failure reports are safe.
    if (existing?.status === 'blocked' || existing?.status === 'failed') {
      await recordGatewayConnectionDiagnostic({
        deviceId,
        route: ROUTE,
        httpStatus: 200,
        durationMs: elapsedMs(startedAt),
        kind: 'status',
        gatewayDeviceIdHeader,
      })
      return NextResponse.json({
        success: true,
        message: 'Job already marked as failed',
        jobStatus: existing.status,
        canonicalStatus: existing.status === 'blocked' ? 'TOP_UP_REQUIRED' : 'PHONE_SEND_FAILED',
        duplicate: true,
      })
    }

    if (existing?.status === 'delivered') {
      return NextResponse.json(
        {
          success: false,
          code: 'STATUS_REGRESSION',
          message: 'Job already delivered',
          canonicalStatus: 'DELIVERED_VIA_PHONE',
        },
        { status: 409 }
      )
    }

    const failedAt = body.failedAt ? new Date(body.failedAt) : new Date()
    const failureReason =
      body.failureReason || 'SMS permission denied or network unavailable'
    const failureCode = body.failureCode || undefined
    const needsTopUp = body.requiresTopUp === true

    const jobUpdate = needsTopUp
      ? {
          status: 'blocked' as const,
          phoneStatus: 'requires_topup' as const,
          canonicalStatus: 'TOP_UP_REQUIRED',
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
          canonicalStatus: 'PHONE_SEND_FAILED',
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
        status: { $in: ['sending', 'claimed', 'pending', 'submission_unknown', 'sent'] },
      },
      {
        $set: jobUpdate,
        $unset: {
          resetReason: 1,
          claimExpiresAt: 1,
          lockedAt: 1,
          lockedBy: 1,
          claimToken: 1,
        },
        $inc: { serverRevision: 1 },
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

    const deviceSet: Record<string, unknown> = {
      lastFailureAt: failedAt,
      lastFailureReason: failureReason,
      lastFailureCode: failureCode,
    }

    if (needsTopUp) {
      deviceSet.requiresTopUp = true
      deviceSet.topUpAlertDismissed = false
      deviceSet.isGatewayRunning = false
      deviceSet.pausedAt = failedAt
      deviceSet.pauseReason = 'SMS bundle or airtime may be depleted'
    } else if (body.isGatewayRunning === false || body.gatewayPaused === true) {
      deviceSet.isGatewayRunning = false
      deviceSet.pausedAt = failedAt
      deviceSet.pauseReason = failureReason
    }

    await SmsGatewayDevice.updateOne({ _id: deviceId }, { $set: deviceSet })

    logGatewayJobAction({
      route: ROUTE,
      jobId: rawJobId,
      deviceName: job.deviceName,
      statusBefore: statusBefore || 'sending',
      statusAfter: needsTopUp ? 'blocked' : 'failed',
      responseCode: 200,
      extra: { failureReason, failureCode, requiresTopUp: needsTopUp },
    })

    await recordGatewayConnectionDiagnostic({
      deviceId,
      route: ROUTE,
      httpStatus: 200,
      durationMs: elapsedMs(startedAt),
      kind: 'status',
      gatewayDeviceIdHeader,
    })

    return NextResponse.json({
      success: true,
      message: needsTopUp
        ? 'Job blocked — phone gateway needs SMS bundle or airtime'
        : 'Job marked as failed',
      jobStatus: needsTopUp ? 'blocked' : 'failed',
      canonicalStatus: needsTopUp ? 'TOP_UP_REQUIRED' : 'PHONE_SEND_FAILED',
    })
  } catch (error: any) {
    console.error('SMS gateway job failed error:', error)
    await recordGatewayConnectionDiagnostic({
      deviceId,
      route: ROUTE,
      httpStatus: 500,
      durationMs: elapsedMs(startedAt),
      kind: 'status',
      gatewayDeviceIdHeader,
    }).catch(() => undefined)
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    )
  }
}

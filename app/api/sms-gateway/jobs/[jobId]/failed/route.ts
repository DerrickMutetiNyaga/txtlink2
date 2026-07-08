import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db/connect'
import { SmsFallbackJob, SmsMessage } from '@/lib/db/models'
import {
  validateGatewayDevice,
  gatewayAuthErrorResponse,
} from '@/lib/services/sms-gateway/auth'
import { logGatewayJobAction } from '@/lib/services/sms-gateway/job-logger'
import { parseGatewayJobId } from '@/lib/services/sms-gateway/job-lifecycle'

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

    const existing = await SmsFallbackJob.findOne({
      _id: jobId,
      userId: auth.device.userId,
    })
      .select('status isTest')
      .lean()

    const statusBefore = existing?.status ?? null

    if (existing?.status === 'blocked' || existing?.status === 'failed') {
      return NextResponse.json({
        success: true,
        message: 'Job already marked as failed',
        jobStatus: existing.status,
      })
    }

    if (existing?.status === 'delivered' || existing?.status === 'sent') {
      return NextResponse.json(
        { success: false, message: 'Job already delivered' },
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
        fallbackStatus: needsTopUp ? 'phone_requires_topup' : 'phone_failed',
        fallbackFailedAt: failedAt,
        fallbackFailureReason: failureReason,
        fallbackFailureCode: failureCode,
        requiresPhoneTopUp: needsTopUp,
        deliveryMethod: needsTopUp ? undefined : 'android_phone_gateway_failed',
      })
    }

    auth.device.lastFailureAt = failedAt
    auth.device.lastFailureReason = failureReason
    auth.device.lastFailureCode = failureCode

    if (needsTopUp) {
      auth.device.requiresTopUp = true
      auth.device.topUpAlertDismissed = false
      auth.device.isGatewayRunning = false
      auth.device.pausedAt = failedAt
      auth.device.pauseReason = 'SMS bundle or airtime may be depleted'
    } else if (body.isGatewayRunning === false || body.gatewayPaused === true) {
      auth.device.isGatewayRunning = false
      auth.device.pausedAt = failedAt
      auth.device.pauseReason = failureReason
    }

    await auth.device.save()

    logGatewayJobAction({
      route: ROUTE,
      jobId: rawJobId,
      deviceName: job.deviceName,
      statusBefore: statusBefore || 'sending',
      statusAfter: needsTopUp ? 'blocked' : 'failed',
      responseCode: 200,
      extra: { failureReason, failureCode, requiresTopUp: needsTopUp },
    })

    return NextResponse.json({
      success: true,
      message: needsTopUp
        ? 'Job blocked — phone gateway needs SMS bundle or airtime'
        : 'Job marked as failed',
      jobStatus: needsTopUp ? 'blocked' : 'failed',
    })
  } catch (error: any) {
    console.error('SMS gateway job failed error:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    )
  }
}

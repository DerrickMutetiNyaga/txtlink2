import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db/connect'
import { SmsFallbackJob, SmsMessage } from '@/lib/db/models'
import { authenticateGatewayDevice } from '@/lib/services/sms-gateway/auth'
import { logGatewayJobAction } from '@/lib/services/sms-gateway/job-logger'

type RouteContext = { params: Promise<{ jobId: string }> }

const ROUTE = 'POST /api/sms-gateway/jobs/[jobId]/failed'

export async function POST(request: NextRequest, context: RouteContext) {
  const { jobId } = await context.params

  try {
    const body = await request.json().catch(() => ({}))
    const deviceName = body.deviceName || ''
    const simLabel = body.simLabel || ''

    const auth = await authenticateGatewayDevice(request, deviceName, simLabel)
    if (!auth.ok) {
      logGatewayJobAction({
        route: ROUTE,
        jobId,
        deviceName,
        responseCode: auth.status,
        message: auth.message,
      })
      return NextResponse.json(
        { success: false, message: auth.message },
        { status: auth.status }
      )
    }

    await connectDB()

    const existing = await SmsFallbackJob.findOne({
      _id: jobId,
      userId: auth.device.userId,
    })
      .select('status')
      .lean()

    const statusBefore = existing?.status ?? null
    const failedAt = body.failedAt ? new Date(body.failedAt) : new Date()
    const failureReason =
      body.failureReason || 'SMS permission denied or network unavailable'
    const failureCode = body.failureCode || undefined
    const needsTopUp = body.requiresTopUp === true
    const gatewayPaused =
      body.isGatewayRunning === false || body.gatewayPaused === true || needsTopUp

    const job = await SmsFallbackJob.findOneAndUpdate(
      {
        _id: jobId,
        userId: auth.device.userId,
        status: 'sending',
      },
      {
        $set: {
          status: 'failed',
          failedAt,
          failureReason,
          failureCode,
          requiresTopUp: needsTopUp,
          deviceName: deviceName || auth.device.boundDeviceName,
          simLabel: simLabel || auth.device.boundSimLabel,
        },
      },
      { new: true }
    )

    if (!job) {
      logGatewayJobAction({
        route: ROUTE,
        jobId,
        deviceName: deviceName || auth.device.boundDeviceName,
        statusBefore,
        statusAfter: statusBefore,
        responseCode: 409,
        message: 'Job not found or already processed',
      })
      return NextResponse.json(
        { success: false, message: 'Job not found or already processed' },
        { status: 409 }
      )
    }

    if (!job.isTest) {
      await SmsMessage.findByIdAndUpdate(job.originalSmsId, {
        fallbackStatus: 'phone_failed',
        fallbackFailedAt: failedAt,
        fallbackFailureReason: failureReason,
        fallbackFailureCode: failureCode,
        requiresPhoneTopUp: needsTopUp,
        deliveryMethod: 'android_phone_gateway_failed',
      })
    }

    auth.device.lastFailureAt = failedAt
    auth.device.lastFailureReason = failureReason
    auth.device.lastFailureCode = failureCode
    if (needsTopUp) {
      auth.device.requiresTopUp = true
      auth.device.topUpAlertDismissed = false
    }
    if (gatewayPaused) {
      auth.device.isGatewayRunning = false
      auth.device.pausedAt = failedAt
      auth.device.pauseReason = failureReason
    }
    await auth.device.save()

    logGatewayJobAction({
      route: ROUTE,
      jobId,
      deviceName: job.deviceName,
      statusBefore: 'sending',
      statusAfter: 'failed',
      responseCode: 200,
      extra: { failureReason, failureCode, requiresTopUp: needsTopUp },
    })

    return NextResponse.json({
      success: true,
      message: needsTopUp
        ? 'Job failed — phone gateway needs SMS bundle or airtime'
        : 'Job marked as failed',
    })
  } catch (error: any) {
    console.error('SMS gateway job failed error:', error)
    logGatewayJobAction({
      route: ROUTE,
      jobId,
      responseCode: 500,
      message: error?.message,
    })
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    )
  }
}

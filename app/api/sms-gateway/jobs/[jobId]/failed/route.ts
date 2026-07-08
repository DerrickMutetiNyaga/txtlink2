import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db/connect'
import { SmsFallbackJob, SmsMessage } from '@/lib/db/models'
import { authenticateGatewayDevice } from '@/lib/services/sms-gateway/auth'
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

    const auth = await authenticateGatewayDevice(request, deviceName, simLabel)
    if (!auth.ok) {
      logGatewayJobAction({
        route: ROUTE,
        jobId: rawJobId,
        deviceName,
        responseCode: auth.status,
        message: auth.message,
      })
      return NextResponse.json(
        { success: false, message: auth.message },
        { status: auth.status }
      )
    }

    if (!jobId) {
      logGatewayJobAction({
        route: ROUTE,
        jobId: rawJobId,
        deviceName,
        responseCode: 400,
        message: 'Invalid job ID',
      })
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

    if (existing?.status === 'failed') {
      logGatewayJobAction({
        route: ROUTE,
        jobId: rawJobId,
        deviceName: deviceName || auth.device.boundDeviceName,
        statusBefore: 'failed',
        statusAfter: 'failed',
        responseCode: 200,
        message: 'Job already marked failed',
      })
      return NextResponse.json({
        success: true,
        message: 'Job already marked as failed',
        jobStatus: 'failed',
      })
    }

    if (existing?.status === 'sent') {
      logGatewayJobAction({
        route: ROUTE,
        jobId: rawJobId,
        deviceName: deviceName || auth.device.boundDeviceName,
        statusBefore: 'sent',
        statusAfter: 'sent',
        responseCode: 409,
        message: 'Job already sent',
      })
      return NextResponse.json(
        { success: false, message: 'Job already sent' },
        { status: 409 }
      )
    }

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
        status: { $in: ['sending', 'pending'] },
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
        $unset: {
          resetReason: 1,
        },
      },
      { new: true }
    )

    if (!job) {
      logGatewayJobAction({
        route: ROUTE,
        jobId: rawJobId,
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
      jobId: rawJobId,
      deviceName: job.deviceName,
      statusBefore: statusBefore || 'sending',
      statusAfter: 'failed',
      responseCode: 200,
      extra: { failureReason, failureCode, requiresTopUp: needsTopUp },
    })

    return NextResponse.json({
      success: true,
      message: needsTopUp
        ? 'Job failed — phone gateway needs SMS bundle or airtime'
        : 'Job marked as failed',
      jobStatus: 'failed',
    })
  } catch (error: any) {
    console.error('SMS gateway job failed error:', error)
    logGatewayJobAction({
      route: ROUTE,
      jobId: rawJobId,
      responseCode: 500,
      message: error?.message,
    })
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    )
  }
}

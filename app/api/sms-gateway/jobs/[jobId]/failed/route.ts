import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db/connect'
import { SmsFallbackJob, SmsMessage } from '@/lib/db/models'
import { authenticateGatewayDevice } from '@/lib/services/sms-gateway/auth'

type RouteContext = { params: Promise<{ jobId: string }> }

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { jobId } = await context.params
    const body = await request.json().catch(() => ({}))
    const deviceName = body.deviceName || ''
    const simLabel = body.simLabel || ''

    const auth = await authenticateGatewayDevice(request, deviceName, simLabel)
    if (!auth.ok) {
      return NextResponse.json(
        { success: false, message: auth.message },
        { status: auth.status }
      )
    }

    await connectDB()

    const job = await SmsFallbackJob.findOne({
      _id: jobId,
      userId: auth.device.userId,
      status: { $in: ['pending', 'sending'] },
    })

    if (!job) {
      return NextResponse.json(
        { success: false, message: 'Job not found or already processed' },
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

    job.status = 'failed'
    job.failedAt = failedAt
    job.failureReason = failureReason
    job.failureCode = failureCode
    job.requiresTopUp = needsTopUp
    job.deviceName = deviceName || auth.device.boundDeviceName
    job.simLabel = simLabel || auth.device.boundSimLabel
    await job.save()

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

    return NextResponse.json({
      success: true,
      message: needsTopUp
        ? 'Job failed — phone gateway needs SMS bundle or airtime'
        : 'Job marked as failed',
    })
  } catch (error: any) {
    console.error('SMS gateway job failed error:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    )
  }
}

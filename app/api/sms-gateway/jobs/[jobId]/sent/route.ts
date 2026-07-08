import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db/connect'
import { SmsFallbackJob, SmsMessage, SmsGatewayDevice } from '@/lib/db/models'
import { authenticateGatewayDevice } from '@/lib/services/sms-gateway/auth'
import { logAuditAction } from '@/lib/utils/audit'

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

    const sentAt = body.sentAt ? new Date(body.sentAt) : new Date()

    job.status = 'sent'
    job.sentAt = sentAt
    job.deviceName = deviceName || auth.device.boundDeviceName
    job.simLabel = simLabel || auth.device.boundSimLabel
    job.localMessageId = body.localMessageId
    await job.save()

    if (!job.isTest) {
      await SmsMessage.findByIdAndUpdate(job.originalSmsId, {
        status: 'delivered',
        deliveredAt: sentAt,
        deliveryMethod: 'android_phone_gateway',
        fallbackStatus: 'sent_via_phone',
        fallbackSentAt: sentAt,
        fallbackProvider: 'android_phone_gateway',
        fallbackJobId: jobId,
        fallbackFailedAt: null,
        fallbackFailureReason: null,
        fallbackFailureCode: null,
        requiresPhoneTopUp: false,
        finalizedAt: sentAt,
        nextCheckAt: null,
      })

      await logAuditAction(
        String(auth.device.userId),
        'PHONE_GATEWAY_SMS_DELIVERED',
        'SmsMessage',
        job.originalSmsId,
        {
          jobId,
          deviceName: job.deviceName,
          simLabel: job.simLabel,
          localMessageId: job.localMessageId,
        }
      )
    }

    auth.device.requiresTopUp = false
    auth.device.topUpAlertDismissed = false
    auth.device.isGatewayRunning = body.isGatewayRunning !== false ? true : auth.device.isGatewayRunning
    auth.device.pausedAt = undefined
    auth.device.pauseReason = undefined
    await auth.device.save()

    return NextResponse.json({
      success: true,
      message: job.isTest
        ? 'Test job marked sent via phone gateway'
        : 'SMS marked delivered via phone gateway',
    })
  } catch (error: any) {
    console.error('SMS gateway job sent error:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    )
  }
}

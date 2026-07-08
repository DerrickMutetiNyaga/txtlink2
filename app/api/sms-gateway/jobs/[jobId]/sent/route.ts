import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db/connect'
import { SmsFallbackJob, SmsMessage } from '@/lib/db/models'
import { authenticateGatewayDevice } from '@/lib/services/sms-gateway/auth'
import { logAuditAction } from '@/lib/utils/audit'
import { logGatewayJobAction } from '@/lib/services/sms-gateway/job-logger'

type RouteContext = { params: Promise<{ jobId: string }> }

const ROUTE = 'POST /api/sms-gateway/jobs/[jobId]/sent'

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
    const sentAt = body.sentAt ? new Date(body.sentAt) : new Date()

    const job = await SmsFallbackJob.findOneAndUpdate(
      {
        _id: jobId,
        userId: auth.device.userId,
        status: 'sending',
      },
      {
        $set: {
          status: 'sent',
          sentAt,
          deviceName: deviceName || auth.device.boundDeviceName,
          simLabel: simLabel || auth.device.boundSimLabel,
          localMessageId: body.localMessageId,
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
    auth.device.isGatewayRunning =
      body.isGatewayRunning !== false ? true : auth.device.isGatewayRunning
    auth.device.pausedAt = undefined
    auth.device.pauseReason = undefined
    await auth.device.save()

    logGatewayJobAction({
      route: ROUTE,
      jobId,
      deviceName: job.deviceName,
      statusBefore: 'sending',
      statusAfter: 'sent',
      responseCode: 200,
    })

    return NextResponse.json({
      success: true,
      message: job.isTest
        ? 'Test job marked sent via phone gateway'
        : 'SMS marked delivered via phone gateway',
    })
  } catch (error: any) {
    console.error('SMS gateway job sent error:', error)
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

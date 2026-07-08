import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db/connect'
import { SmsFallbackJob, SmsMessage } from '@/lib/db/models'
import {
  validateGatewayDevice,
  gatewayAuthErrorResponse,
} from '@/lib/services/sms-gateway/auth'
import { logAuditAction } from '@/lib/utils/audit'
import { logGatewayJobAction } from '@/lib/services/sms-gateway/job-logger'
import { parseGatewayJobId } from '@/lib/services/sms-gateway/job-lifecycle'

type RouteContext = { params: Promise<{ jobId: string }> }

const ROUTE = 'POST /api/sms-gateway/jobs/[jobId]/sent'

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
      logGatewayJobAction({
        route: ROUTE,
        jobId: rawJobId,
        deviceName,
        responseCode: auth.status,
        message: auth.message,
        extra: { code: auth.code },
      })
      return gatewayAuthErrorResponse(auth)
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

    if (existing?.status === 'sent') {
      logGatewayJobAction({
        route: ROUTE,
        jobId: rawJobId,
        deviceName: deviceName || auth.device.boundDeviceName,
        statusBefore: 'sent',
        statusAfter: 'sent',
        responseCode: 200,
        message: 'Job already marked sent',
      })
      return NextResponse.json({
        success: true,
        message: existing.isTest
          ? 'Test job already marked sent via phone gateway'
          : 'SMS marked delivered via phone gateway',
        jobStatus: 'sent',
      })
    }

    const sentAt = body.sentAt ? new Date(body.sentAt) : new Date()

    const job = await SmsFallbackJob.findOneAndUpdate(
      {
        _id: jobId,
        userId: auth.device.userId,
        status: { $in: ['sending', 'pending'] },
      },
      {
        $set: {
          status: 'sent',
          sentAt,
          deviceName: deviceName || auth.device.boundDeviceName,
          simLabel: simLabel || auth.device.boundSimLabel,
          localMessageId: body.localMessageId,
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
        status: 'delivered',
        deliveredAt: sentAt,
        deliveryMethod: 'android_phone_gateway',
        fallbackStatus: 'sent_via_phone',
        fallbackSentAt: sentAt,
        fallbackProvider: 'android_phone_gateway',
        fallbackJobId: rawJobId,
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
          jobId: rawJobId,
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
      jobId: rawJobId,
      deviceName: job.deviceName,
      statusBefore: statusBefore || 'sending',
      statusAfter: 'sent',
      responseCode: 200,
    })

    return NextResponse.json({
      success: true,
      message: job.isTest
        ? 'Test job marked sent via phone gateway'
        : 'SMS marked delivered via phone gateway',
      jobStatus: 'sent',
    })
  } catch (error: any) {
    console.error('SMS gateway job sent error:', error)
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

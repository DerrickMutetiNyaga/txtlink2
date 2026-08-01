import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db/connect'
import { SmsFallbackJob, SmsMessage } from '@/lib/db/models'
import {
  validateGatewayDevice,
  gatewayAuthErrorResponse,
} from '@/lib/services/sms-gateway/auth'
import { logGatewayJobAction } from '@/lib/services/sms-gateway/job-logger'
import {
  isTerminalFallbackJobStatus,
  parseGatewayJobId,
} from '@/lib/services/sms-gateway/job-lifecycle'

type RouteContext = { params: Promise<{ jobId: string }> }

const ROUTE = 'POST /api/sms-gateway/jobs/[jobId]/sending'

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

    if (auth.device.requiresTopUp) {
      return NextResponse.json(
        {
          success: false,
          code: 'GATEWAY_REQUIRES_TOPUP',
          message: 'Phone gateway paused — reload SMS bundle or airtime before claiming jobs',
        },
        { status: 403 }
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
      .select('status lockedBy attempts')
      .lean()

    const statusBefore = existing?.status ?? null
    const lockedBy = String(auth.device._id)

    if (existing && isTerminalFallbackJobStatus(existing.status)) {
      logGatewayJobAction({
        route: ROUTE,
        jobId: rawJobId,
        deviceName: deviceName || auth.device.boundDeviceName,
        statusBefore,
        statusAfter: statusBefore,
        responseCode: 409,
        message: 'Already claimed or already processed',
      })
      return NextResponse.json(
        { success: false, message: 'Already claimed or already processed' },
        { status: 409 }
      )
    }

    if (existing?.status === 'sending') {
      if (existing.lockedBy === lockedBy) {
        logGatewayJobAction({
          route: ROUTE,
          jobId: rawJobId,
          deviceName: deviceName || auth.device.boundDeviceName,
          statusBefore: 'sending',
          statusAfter: 'sending',
          responseCode: 200,
          message: 'Already claimed by this device',
        })
        return NextResponse.json({
          success: true,
          message: 'Job already claimed by this device',
          jobStatus: 'sending',
        })
      }

      logGatewayJobAction({
        route: ROUTE,
        jobId: rawJobId,
        deviceName: deviceName || auth.device.boundDeviceName,
        statusBefore: 'sending',
        statusAfter: 'sending',
        responseCode: 409,
        message: 'Already claimed or already processed',
      })
      return NextResponse.json(
        { success: false, message: 'Already claimed or already processed' },
        { status: 409 }
      )
    }

    const now = new Date()

    const job = await SmsFallbackJob.findOneAndUpdate(
      {
        _id: jobId,
        userId: auth.device.userId,
        status: 'pending',
      },
      {
        $set: {
          status: 'sending',
          phoneStatus: 'sending',
          sendingAt: now,
          lockedAt: now,
          lockedBy,
          deviceId: lockedBy,
          deviceName: deviceName || auth.device.boundDeviceName,
          simLabel: simLabel || auth.device.boundSimLabel,
        },
        $inc: { attempts: 1 },
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
        message: 'Already claimed or already processed',
      })
      return NextResponse.json(
        { success: false, message: 'Already claimed or already processed' },
        { status: 409 }
      )
    }

    if (!job.isTest) {
      await SmsMessage.findByIdAndUpdate(job.originalSmsId, {
        fallbackStatus: 'sending_via_phone',
      })
    }

    logGatewayJobAction({
      route: ROUTE,
      jobId: rawJobId,
      deviceName: job.deviceName,
      statusBefore: 'pending',
      statusAfter: 'sending',
      responseCode: 200,
      extra: { attempts: job.attempts },
    })

    return NextResponse.json({
      success: true,
      message: 'Job marked as sending',
      jobStatus: 'sending',
    })
  } catch (error: any) {
    console.error('SMS gateway job sending error:', error)
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

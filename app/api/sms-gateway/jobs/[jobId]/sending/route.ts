import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db/connect'
import { SmsFallbackJob, SmsMessage } from '@/lib/db/models'
import { authenticateGatewayDevice } from '@/lib/services/sms-gateway/auth'
import { logGatewayJobAction } from '@/lib/services/sms-gateway/job-logger'

type RouteContext = { params: Promise<{ jobId: string }> }

const ROUTE = 'POST /api/sms-gateway/jobs/[jobId]/sending'

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
    const lockedBy = String(auth.device._id)
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
        jobId,
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
      jobId,
      deviceName: job.deviceName,
      statusBefore: 'pending',
      statusAfter: 'sending',
      responseCode: 200,
      extra: { attempts: job.attempts },
    })

    return NextResponse.json({ success: true, message: 'Job marked as sending' })
  } catch (error: any) {
    console.error('SMS gateway job sending error:', error)
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

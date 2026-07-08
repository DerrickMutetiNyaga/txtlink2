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

    const job = await SmsFallbackJob.findOneAndUpdate(
      {
        _id: jobId,
        userId: auth.device.userId,
        status: { $in: ['pending'] },
      },
      {
        $set: {
          status: 'sending',
          sendingAt: new Date(),
          deviceId: String(auth.device._id),
          deviceName: deviceName || auth.device.boundDeviceName,
          simLabel: simLabel || auth.device.boundSimLabel,
        },
        $inc: { attempts: 1 },
      },
      { new: true }
    )

    if (!job) {
      return NextResponse.json(
        { success: false, message: 'Already processed' },
        { status: 409 }
      )
    }

    if (!job.isTest) {
      await SmsMessage.findByIdAndUpdate(job.originalSmsId, {
        fallbackStatus: 'sending_via_phone',
      })
    }

    return NextResponse.json({ success: true, message: 'Job marked as sending' })
  } catch (error: any) {
    console.error('SMS gateway job sending error:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    )
  }
}

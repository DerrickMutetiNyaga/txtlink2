import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db/connect'
import { SmsMessage, SmsFallbackJob } from '@/lib/db/models'
import { requireAuth } from '@/lib/auth/middleware'
import mongoose from 'mongoose'

type RouteContext = { params: Promise<{ messageId: string }> }

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    await connectDB()
    const user = requireAuth(request)
    const { messageId } = await context.params
    const userId = new mongoose.Types.ObjectId(user.userId)

    const sms = await SmsMessage.findOne({ _id: messageId, userId })
    if (!sms) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 })
    }

    if (sms.status === 'delivered' && sms.deliveryMethod !== 'android_phone_gateway') {
      return NextResponse.json({ error: 'Message delivered via provider' }, { status: 400 })
    }

    const job = await SmsFallbackJob.findOne({ originalSmsId: String(sms._id) })
    if (!job) {
      return NextResponse.json({ error: 'No fallback job found' }, { status: 404 })
    }

    if (job.status === 'sent') {
      return NextResponse.json({ error: 'Phone fallback already sent successfully' }, { status: 400 })
    }

    job.status = 'pending'
    job.attempts = 0
    job.sendingAt = undefined
    job.sentAt = undefined
    job.failedAt = undefined
    job.failureReason = undefined
    await job.save()

    await SmsMessage.findByIdAndUpdate(sms._id, {
      status: sms.status === 'delivered' && sms.deliveryMethod === 'android_phone_gateway'
        ? 'failed'
        : sms.status,
      deliveredAt: sms.deliveryMethod === 'android_phone_gateway' ? null : sms.deliveredAt,
      deliveryMethod: undefined,
      fallbackStatus: 'queued_for_phone',
      fallbackQueued: true,
      fallbackSentAt: undefined,
      fallbackFailedAt: undefined,
      fallbackFailureReason: undefined,
    })

    return NextResponse.json({ success: true, message: 'Phone fallback re-queued' })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

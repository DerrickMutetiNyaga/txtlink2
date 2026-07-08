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

    if (sms.fallbackStatus === 'sent_via_phone' || sms.status === 'delivered') {
      return NextResponse.json({ error: 'Cannot cancel — already delivered' }, { status: 400 })
    }

    const job = await SmsFallbackJob.findOne({ originalSmsId: String(sms._id) })
    if (job && ['sent'].includes(job.status)) {
      return NextResponse.json({ error: 'Phone fallback already sent' }, { status: 400 })
    }

    if (job) {
      job.status = 'cancelled'
      job.cancelReason = 'Cancelled by user'
      await job.save()
    }

    await SmsMessage.findByIdAndUpdate(sms._id, {
      fallbackStatus: 'cancelled',
      fallbackQueued: false,
    })

    return NextResponse.json({ success: true, message: 'Phone fallback cancelled' })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

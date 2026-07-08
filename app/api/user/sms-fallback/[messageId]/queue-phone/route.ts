import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db/connect'
import { SmsMessage } from '@/lib/db/models'
import { requireAuth } from '@/lib/auth/middleware'
import { isPhoneDeliveredFallbackStatus } from '@/lib/services/sms-fallback/phone-status'
import { createOrUpdatePhoneFallbackJob } from '@/lib/services/sms-fallback/create-fallback-job'
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

    if (sms.status === 'delivered' || isPhoneDeliveredFallbackStatus(sms.fallbackStatus)) {
      return NextResponse.json({ error: 'Message already delivered' }, { status: 400 })
    }

    const result = await createOrUpdatePhoneFallbackJob(sms, { resetExisting: true })
    if (!result.ok) {
      return NextResponse.json({ error: result.error || 'Failed to queue phone fallback' }, { status: 400 })
    }

    return NextResponse.json({ success: true, message: 'Queued for phone fallback', jobId: result.jobId })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

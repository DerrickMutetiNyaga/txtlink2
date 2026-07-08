import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db/connect'
import { SmsMessage, SmsFallbackJob } from '@/lib/db/models'
import { requireAuth } from '@/lib/auth/middleware'
import { normalizeKenyanPhone } from '@/lib/utils/phone'
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

    if (sms.status === 'delivered' || sms.fallbackStatus === 'sent_via_phone') {
      return NextResponse.json({ error: 'Message already delivered' }, { status: 400 })
    }

    const phone = sms.toNumbers[0] || ''
    const normalized = normalizeKenyanPhone(phone)
    if (!normalized) {
      return NextResponse.json({ error: 'Invalid phone number' }, { status: 400 })
    }

    const originalSmsId = String(sms._id)
    let job = await SmsFallbackJob.findOne({ originalSmsId })

    if (job && ['pending', 'sending', 'sent'].includes(job.status)) {
      return NextResponse.json({ error: 'Fallback job already queued' }, { status: 400 })
    }

    const now = new Date()
    if (job) {
      job.status = 'pending'
      job.recipientPhone = phone
      job.normalizedPhone = normalized
      job.message = sms.message
      await job.save()
    } else {
      job = await SmsFallbackJob.create({
        userId,
        originalSmsId,
        recipientPhone: phone,
        normalizedPhone: normalized,
        message: sms.message,
        originalStatus: sms.status,
        originalProviderMessageId: sms.hpTransactionId,
        originalSentAt: sms.sentAt,
        originalFailureReason: sms.deliveryCause || sms.errorMessage,
        retryAttempted: sms.providerRetryAttempted || false,
        status: 'pending',
        attempts: 0,
      })
    }

    await SmsMessage.findByIdAndUpdate(sms._id, {
      fallbackQueued: true,
      fallbackStatus: 'queued_for_phone',
      fallbackQueuedAt: now,
      fallbackJobId: String(job._id),
    })

    return NextResponse.json({ success: true, message: 'Queued for phone fallback' })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db/connect'
import { SmsFallbackJob, SmsMessage } from '@/lib/db/models'
import { authenticateGatewayDevice } from '@/lib/services/sms-gateway/auth'
import { cancelFallbackJobIfDelivered } from '@/lib/services/sms-fallback/helpers'

/** Jobs stuck in "sending" longer than this are returned to pending for retry. */
const STALE_SENDING_MINUTES = 10

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateGatewayDevice(request)
    if (!auth.ok) {
      return NextResponse.json(
        { success: false, message: auth.message },
        { status: auth.status }
      )
    }

    await connectDB()

    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '5', 10) || 5, 50)
    const userId = auth.device.userId

    const staleCutoff = new Date(Date.now() - STALE_SENDING_MINUTES * 60 * 1000)

    // Legacy "notified" jobs (from removed FCM flow) → pending
    await SmsFallbackJob.updateMany(
      { userId, status: 'notified' },
      { $set: { status: 'pending' } }
    )

    // Stale sending claims → back to pending so the app can retry safely
    await SmsFallbackJob.updateMany(
      {
        userId,
        status: 'sending',
        sendingAt: { $lte: staleCutoff },
      },
      { $set: { status: 'pending' }, $unset: { sendingAt: 1 } }
    )

    const jobs = await SmsFallbackJob.find({
      userId,
      status: 'pending',
    })
      .sort({ createdAt: 1 })
      .limit(limit)
      .lean()

    const activeJobs = []
    for (const job of jobs) {
      if (!job.isTest) {
        const cancelled = await cancelFallbackJobIfDelivered(
          job.originalSmsId,
          'Original SMS delivered before phone fallback'
        )
        if (cancelled) continue

        const sms = await SmsMessage.findById(job.originalSmsId).lean()
        if (!sms || sms.status === 'delivered' || sms.fallbackStatus === 'sent_via_phone') {
          await SmsFallbackJob.findByIdAndUpdate(job._id, {
            status: 'cancelled',
            cancelReason: 'Original SMS delivered before phone fallback',
          })
          continue
        }
      }

      activeJobs.push({
        id: String(job._id),
        recipientName: job.recipientName || null,
        recipientPhone: job.normalizedPhone || job.recipientPhone,
        message: job.message,
        status: 'pending',
        isTest: Boolean(job.isTest),
        createdAt: job.createdAt,
        attempts: job.attempts || 0,
      })
    }

    auth.device.lastSyncAt = new Date()
    await auth.device.save()

    return NextResponse.json({
      success: true,
      jobs: activeJobs,
    })
  } catch (error: any) {
    console.error('SMS gateway pending jobs error:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    )
  }
}

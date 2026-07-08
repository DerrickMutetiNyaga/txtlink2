import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db/connect'
import { SmsFallbackJob, SmsMessage } from '@/lib/db/models'
import { requireAuth } from '@/lib/auth/middleware'
import mongoose from 'mongoose'

export async function POST(request: NextRequest) {
  try {
    await connectDB()
    const user = requireAuth(request)
    const userId = new mongoose.Types.ObjectId(user.userId)

    const blockedJobs = await SmsFallbackJob.find({
      userId,
      status: 'blocked',
      requiresTopUp: true,
    }).lean()

    let requeued = 0

    for (const job of blockedJobs) {
      await SmsFallbackJob.findByIdAndUpdate(job._id, {
        status: 'pending',
        phoneStatus: 'pending',
        requiresTopUp: false,
        $unset: {
          failedAt: 1,
          failureReason: 1,
          failureCode: 1,
          sendingAt: 1,
          lockedAt: 1,
          lockedBy: 1,
        },
      })

      if (!job.isTest) {
        await SmsMessage.findByIdAndUpdate(job.originalSmsId, {
          fallbackStatus: 'queued_for_phone',
          fallbackQueued: true,
          requiresPhoneTopUp: false,
          fallbackFailedAt: undefined,
          fallbackFailureReason: undefined,
          fallbackFailureCode: undefined,
        })
      }

      requeued++
    }

    return NextResponse.json({
      success: true,
      message: `Re-queued ${requeued} blocked phone fallback job(s) for retry.`,
      requeued,
    })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Retry blocked gateway jobs error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

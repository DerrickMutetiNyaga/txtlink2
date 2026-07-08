import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db/connect'
import { SmsFallbackJob } from '@/lib/db/models'
import { requireAuth } from '@/lib/auth/middleware'
import mongoose from 'mongoose'

export async function GET(request: NextRequest) {
  try {
    await connectDB()
    const user = requireAuth(request)
    const userId = new mongoose.Types.ObjectId(user.userId)

    const jobs = await SmsFallbackJob.find({ userId })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean()

    return NextResponse.json({
      success: true,
      jobs: jobs.map((job) => ({
        id: String(job._id),
        originalSmsId: job.originalSmsId,
        recipientPhone: job.recipientPhone,
        message: job.message,
        originalStatus: job.originalStatus,
        retryStatus: job.retryStatus,
        status: job.status,
        attempts: job.attempts,
        maxAttempts: job.maxAttempts ?? 3,
        isTest: Boolean(job.isTest),
        createdAt: job.createdAt,
        sendingAt: job.sendingAt,
        sentAt: job.sentAt,
        failedAt: job.failedAt,
        deviceName: job.deviceName,
        simLabel: job.simLabel,
        failureReason: job.failureReason,
        failureCode: job.failureCode,
        resetReason: job.resetReason,
        lockedBy: job.lockedBy,
      })),
    })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

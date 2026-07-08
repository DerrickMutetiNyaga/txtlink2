import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db/connect'
import { SmsFallbackJob } from '@/lib/db/models'
import { requireAuth } from '@/lib/auth/middleware'
import {
  ACTIVE_FALLBACK_JOB_STATUSES,
  COMPLETED_FALLBACK_JOB_STATUSES,
} from '@/lib/services/sms-fallback/phone-status'
import mongoose from 'mongoose'

export async function GET(request: NextRequest) {
  try {
    await connectDB()
    const user = requireAuth(request)
    const userId = new mongoose.Types.ObjectId(user.userId)

    const { searchParams } = new URL(request.url)
    const filter = searchParams.get('filter') || 'active'

    let statusFilter: Record<string, unknown> = {}
    if (filter === 'active') {
      statusFilter = { status: { $in: [...ACTIVE_FALLBACK_JOB_STATUSES] } }
    } else if (filter === 'completed') {
      statusFilter = { status: { $in: [...COMPLETED_FALLBACK_JOB_STATUSES] } }
    }

    const jobs = await SmsFallbackJob.find({ userId, ...statusFilter })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean()

    return NextResponse.json({
      success: true,
      filter,
      jobs: jobs.map((job) => ({
        id: String(job._id),
        originalSmsId: job.originalSmsId,
        recipientPhone: job.recipientPhone,
        message: job.message,
        source: job.source || (job.isTest ? 'test' : 'dashboard'),
        originalStatus: job.originalStatus,
        retryStatus: job.retryStatus,
        status: job.status === 'sent' ? 'delivered' : job.status,
        phoneStatus: job.phoneStatus || job.status,
        attempts: job.attempts,
        maxAttempts: job.maxAttempts ?? 3,
        isTest: Boolean(job.isTest),
        createdAt: job.createdAt,
        sendingAt: job.sendingAt,
        sentAt: job.sentAt,
        deliveredAt: job.deliveredAt,
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

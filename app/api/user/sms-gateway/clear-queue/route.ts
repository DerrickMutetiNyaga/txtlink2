import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db/connect'
import { SmsFallbackJob, SmsMessage, SMS_PENDING_STATUSES } from '@/lib/db/models'
import { requireAuth } from '@/lib/auth/middleware'
import { PHONE_DELIVERED_FALLBACK_STATUSES } from '@/lib/services/sms-fallback/phone-status'
import {
  buildActionableSmsFilter,
  MANUAL_COMPLETED_CAUSE,
} from '@/lib/services/sms-history/actionable'
import mongoose from 'mongoose'

/**
 * Manually purge the entire phone fallback queue for the authenticated user.
 * POST body: { markCompleted?: boolean }
 * When markCompleted is true, also marks all pending/failed SMS as completed.
 */
export async function POST(request: NextRequest) {
  try {
    await connectDB()
    const user = requireAuth(request)
    const userId = new mongoose.Types.ObjectId(user.userId)
    const body = await request.json().catch(() => ({}))
    const markCompleted = body?.markCompleted === true

    const jobs = await SmsFallbackJob.find({ userId })
      .select('_id originalSmsId isTest')
      .lean()

    const jobIds = jobs.map((job) => String(job._id))
    const originalSmsIds = jobs
      .filter((job) => !job.isTest && job.originalSmsId)
      .map((job) => job.originalSmsId)
      .filter((id) => mongoose.Types.ObjectId.isValid(id))

    const now = new Date()
    let markedCount = 0

    if (markCompleted) {
      const actionable = await SmsMessage.find(buildActionableSmsFilter(userId, 'all'))
        .select('_id')
        .lean()
      const actionableIds = actionable.map((msg) => msg._id)
      const allIds = [
        ...new Set([
          ...actionableIds.map((id) => String(id)),
          ...originalSmsIds,
        ]),
      ].filter((id) => mongoose.Types.ObjectId.isValid(id))

      if (allIds.length > 0) {
        const result = await SmsMessage.updateMany(
          {
            _id: { $in: allIds },
            userId,
            status: { $ne: 'delivered' },
          },
          {
            $set: {
              status: 'delivered',
              deliveryStatus: 'delivered',
              deliveryCause: MANUAL_COMPLETED_CAUSE,
              deliveredAt: now,
              finalizedAt: now,
              nextCheckAt: null,
              statusCheckLockedUntil: null,
              statusCheckWorkerId: null,
              awaitingProviderConfirmation: false,
              fallbackQueued: false,
              fallbackStatus: 'cancelled',
              fallbackJobId: null,
              requiresPhoneTopUp: false,
            },
          }
        )
        markedCount = result.modifiedCount || 0
      }
    } else if (originalSmsIds.length > 0 && jobIds.length > 0) {
      await SmsMessage.updateMany(
        {
          _id: { $in: originalSmsIds },
          userId,
          fallbackJobId: { $in: jobIds },
          status: { $ne: 'delivered' },
          fallbackStatus: { $nin: [...PHONE_DELIVERED_FALLBACK_STATUSES] },
        },
        {
          $set: {
            fallbackStatus: 'cancelled',
            fallbackQueued: false,
            fallbackJobId: null,
          },
        }
      )
    }

    // Also stop status polling for any still-pending messages linked only by job ids
    if (!markCompleted && originalSmsIds.length > 0) {
      await SmsMessage.updateMany(
        {
          _id: { $in: originalSmsIds },
          userId,
          status: { $in: [...SMS_PENDING_STATUSES] },
        },
        {
          $set: {
            fallbackQueued: false,
            fallbackJobId: null,
          },
        }
      )
    }

    const result = await SmsFallbackJob.deleteMany({ userId })
    const deletedCount = result.deletedCount || 0

    const message = markCompleted
      ? `Cleared entire phone fallback queue (${deletedCount} job(s)) and marked ${markedCount} SMS as completed.`
      : `Cleared entire phone fallback queue — removed ${deletedCount} job(s).`

    return NextResponse.json({
      success: true,
      message,
      deletedCount,
      markedCount,
      markCompleted,
    })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Clear phone fallback queue error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

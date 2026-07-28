/**
 * Manually mark pending/failed SMS as completed and optionally wipe the phone fallback queue.
 * POST /api/user/sms/history/mark-completed
 * body: { view?: 'all'|'pending'|'failed', clearQueue?: boolean }
 *
 * When view is "all" (default), clearQueue defaults to true so the phone fallback
 * queue is fully emptied for a fresh start.
 */
import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db/connect'
import { SmsFallbackJob, SmsMessage } from '@/lib/db/models'
import { requireAuth } from '@/lib/auth/middleware'
import mongoose from 'mongoose'
import {
  buildActionableSmsFilter,
  MANUAL_COMPLETED_CAUSE,
  normalizeActionableView,
} from '@/lib/services/sms-history/actionable'

export async function POST(request: NextRequest) {
  try {
    await connectDB()
    const user = requireAuth(request)
    const userId = new mongoose.Types.ObjectId(user.userId)

    const body = await request.json().catch(() => ({}))
    const view = normalizeActionableView(body?.view)
    const clearQueue =
      typeof body?.clearQueue === 'boolean' ? body.clearQueue : view === 'all'
    const filter = buildActionableSmsFilter(userId, view)

    const messages = await SmsMessage.find(filter).select('_id fallbackJobId').lean()
    const ids = messages.map((msg) => msg._id)
    const idStrings = ids.map((id) => String(id))
    const jobIds = messages
      .map((msg) => msg.fallbackJobId)
      .filter((id): id is string => Boolean(id) && mongoose.Types.ObjectId.isValid(id))

    const now = new Date()
    let markedCount = 0

    if (ids.length > 0) {
      const result = await SmsMessage.updateMany(
        { _id: { $in: ids }, userId },
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
            fallbackQueued: false,
            fallbackStatus: 'cancelled',
            fallbackJobId: null,
            requiresPhoneTopUp: false,
          },
        }
      )
      markedCount = result.modifiedCount || 0
    }

    let deletedJobs = 0
    if (clearQueue) {
      const queueResult = await SmsFallbackJob.deleteMany({ userId })
      deletedJobs = queueResult.deletedCount || 0
    } else if (jobIds.length > 0 || idStrings.length > 0) {
      const relatedResult = await SmsFallbackJob.deleteMany({
        userId,
        $or: [
          ...(jobIds.length > 0 ? [{ _id: { $in: jobIds } }] : []),
          ...(idStrings.length > 0 ? [{ originalSmsId: { $in: idStrings } }] : []),
        ],
      })
      deletedJobs = relatedResult.deletedCount || 0
    }

    if (markedCount === 0 && deletedJobs === 0) {
      return NextResponse.json({
        success: true,
        message: 'Nothing to mark completed — queue and retry list are already clear.',
        markedCount: 0,
        deletedJobs: 0,
        ids: [],
      })
    }

    const scope =
      view === 'all' ? 'pending and failed' : view === 'pending' ? 'pending' : 'failed'
    const queueNote = clearQueue
      ? deletedJobs > 0
        ? ` Cleared ${deletedJobs} phone fallback job(s).`
        : ' Phone fallback queue cleared.'
      : deletedJobs > 0
        ? ` Removed ${deletedJobs} related phone fallback job(s).`
        : ''

    return NextResponse.json({
      success: true,
      message: `Marked ${markedCount} ${scope} SMS as completed.${queueNote}`,
      markedCount,
      deletedJobs,
      clearQueue,
      view,
      ids: idStrings,
    })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Mark SMS completed error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

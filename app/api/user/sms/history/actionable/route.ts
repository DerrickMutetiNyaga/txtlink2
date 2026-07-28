/**
 * Pending + failed SMS that may need manual retry (Sender ID or phone gateway).
 * GET /api/user/sms/history/actionable?view=all|pending|failed&limit=50
 */
import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db/connect'
import { SmsMessage, SMS_PENDING_STATUSES } from '@/lib/db/models'
import { requireAuth } from '@/lib/auth/middleware'
import mongoose from 'mongoose'
import { formatSmsHistoryRow } from '@/lib/services/sms-history/format'
import { FAILED_LIKE_STATUSES } from '@/lib/services/sms-history/constants'

const PHONE_ATTENTION_STATUSES = ['phone_failed', 'phone_requires_topup'] as const

export async function GET(request: NextRequest) {
  try {
    await connectDB()
    const user = requireAuth(request)
    const userId = new mongoose.Types.ObjectId(user.userId)

    const { searchParams } = new URL(request.url)
    const view = (searchParams.get('view') || 'all').toLowerCase()
    const limitRaw = parseInt(searchParams.get('limit') || '50', 10)
    const limit = Math.min(Math.max(Number.isFinite(limitRaw) ? limitRaw : 50, 1), 100)

    const query =
      view === 'pending'
        ? {
            userId,
            deliveryMethod: { $ne: 'android_phone_gateway' },
            status: { $in: [...SMS_PENDING_STATUSES] },
          }
        : view === 'failed'
          ? {
              userId,
              deliveryMethod: { $ne: 'android_phone_gateway' },
              status: { $ne: 'delivered' },
              $or: [
                { status: { $in: [...FAILED_LIKE_STATUSES] } },
                { fallbackStatus: { $in: [...PHONE_ATTENTION_STATUSES] } },
              ],
            }
          : {
              userId,
              deliveryMethod: { $ne: 'android_phone_gateway' },
              $or: [
                { status: { $in: [...SMS_PENDING_STATUSES] } },
                { status: { $in: [...FAILED_LIKE_STATUSES] } },
                { fallbackStatus: { $in: [...PHONE_ATTENTION_STATUSES] } },
              ],
            }

    const [messages, pendingCount, failedCount] = await Promise.all([
      SmsMessage.find(query).sort({ createdAt: -1 }).limit(limit).lean(),
      SmsMessage.countDocuments({
        userId,
        deliveryMethod: { $ne: 'android_phone_gateway' },
        status: { $in: [...SMS_PENDING_STATUSES] },
      }),
      SmsMessage.countDocuments({
        userId,
        deliveryMethod: { $ne: 'android_phone_gateway' },
        status: { $ne: 'delivered' },
        $or: [
          { status: { $in: [...FAILED_LIKE_STATUSES] } },
          { fallbackStatus: { $in: [...PHONE_ATTENTION_STATUSES] } },
        ],
      }),
    ])

    const data = messages.map((msg) =>
      formatSmsHistoryRow(msg as Parameters<typeof formatSmsHistoryRow>[0])
    )

    return NextResponse.json({
      success: true,
      view,
      data,
      counts: {
        pending: pendingCount,
        failed: failedCount,
        total: pendingCount + failedCount,
      },
    })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Get actionable SMS history error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

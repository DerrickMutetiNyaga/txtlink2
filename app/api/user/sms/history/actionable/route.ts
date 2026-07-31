/**
 * Pending + failed SMS that may need manual retry (Sender ID or phone gateway).
 * GET /api/user/sms/history/actionable?view=all|pending|failed&limit=50
 */
import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db/connect'
import { SmsMessage } from '@/lib/db/models'
import { requireAuth } from '@/lib/auth/middleware'
import mongoose from 'mongoose'
import { formatSmsHistoryRow } from '@/lib/services/sms-history/format'
import {
  buildActionableSmsFilter,
  normalizeActionableView,
} from '@/lib/services/sms-history/actionable'

export async function GET(request: NextRequest) {
  try {
    await connectDB()
    const user = requireAuth(request)
    const userId = new mongoose.Types.ObjectId(user.userId)

    const { searchParams } = new URL(request.url)
    const view = normalizeActionableView(searchParams.get('view'))
    const limitRaw = parseInt(searchParams.get('limit') || '100', 10)
    const limit = Math.min(Math.max(Number.isFinite(limitRaw) ? limitRaw : 100, 1), 200)

    const query = buildActionableSmsFilter(userId, view)

    const pendingFilter = buildActionableSmsFilter(userId, 'pending')
    const failedFilter = buildActionableSmsFilter(userId, 'failed')

    const [messages, pendingCount, failedCount] = await Promise.all([
      SmsMessage.find(query).sort({ createdAt: -1 }).limit(limit).lean(),
      SmsMessage.countDocuments(pendingFilter),
      SmsMessage.countDocuments(failedFilter),
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

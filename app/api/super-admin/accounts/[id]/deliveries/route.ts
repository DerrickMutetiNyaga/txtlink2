/**
 * Super Admin: one customer's SMS deliveries
 * GET /api/super-admin/accounts/[id]/deliveries
 */

import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'
import connectDB from '@/lib/db/connect'
import { SmsMessage, User } from '@/lib/db/models'
import { requireOwner } from '@/lib/auth/middleware'
import { parseSmsHistoryQuery } from '@/lib/services/sms-history/query'
import { formatSmsHistoryRow } from '@/lib/services/sms-history/format'
import { getUserDeliveryStats, deliveryHealth } from '@/lib/services/sms-history/admin-delivery-stats'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    await connectDB()
    await requireOwner(request)
    const resolvedParams = await Promise.resolve(params)
    const userId = resolvedParams.id

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return NextResponse.json({ error: 'Invalid account id' }, { status: 400 })
    }

    const user = await User.findById(userId).select('_id')
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const objectId = new mongoose.Types.ObjectId(userId)
    const { searchParams } = new URL(request.url)
    const { filter, page, limit, skip } = parseSmsHistoryQuery({
      userId: objectId,
      page: searchParams.get('page') || undefined,
      limit: searchParams.get('limit') || undefined,
      status: searchParams.get('status') || 'all',
      search: searchParams.get('search') || '',
    })

    const [messages, total, stats] = await Promise.all([
      SmsMessage.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      SmsMessage.countDocuments(filter),
      getUserDeliveryStats(objectId),
    ])

    const totalPages = Math.max(Math.ceil(total / limit), 1)

    return NextResponse.json({
      success: true,
      stats,
      health: deliveryHealth(stats),
      messages: messages.map((msg) =>
        formatSmsHistoryRow(msg as Parameters<typeof formatSmsHistoryRow>[0])
      ),
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    })
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message?.includes('Forbidden')) {
      return NextResponse.json(
        { error: error.message },
        { status: error.message.includes('Forbidden') ? 403 : 401 }
      )
    }
    console.error('Get account deliveries error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

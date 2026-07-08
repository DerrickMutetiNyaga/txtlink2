import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db/connect'
import { SmsMessage, SMS_PENDING_STATUSES } from '@/lib/db/models'
import { requireAuth } from '@/lib/auth/middleware'
import mongoose from 'mongoose'
import { parseSmsHistoryQuery } from '@/lib/services/sms-history/query'
import { formatSmsHistoryRow } from '@/lib/services/sms-history/format'
import { FAILED_LIKE_STATUSES } from '@/lib/services/sms-history/constants'

function readQueryParams(request: NextRequest, userId: mongoose.Types.ObjectId) {
  const { searchParams } = new URL(request.url)
  return {
    userId,
    page: searchParams.get('page') || undefined,
    limit: searchParams.get('limit') || undefined,
    status: searchParams.get('status') || 'all',
    senderId: searchParams.get('senderId') || 'all',
    campaign: searchParams.get('campaign') || 'all',
    country: searchParams.get('country') || 'all',
    fromDate: searchParams.get('fromDate') || searchParams.get('startDate'),
    toDate: searchParams.get('toDate') || searchParams.get('endDate'),
    search: searchParams.get('search') || '',
  }
}

export async function GET(request: NextRequest) {
  try {
    await connectDB()
    const user = requireAuth(request)
    const userId = new mongoose.Types.ObjectId(user.userId)
    const params = readQueryParams(request, userId)
    const { filter, page, limit, skip } = parseSmsHistoryQuery(params)

    const [messages, total, senderIds, statsAgg, failureReasons, totalMessages] = await Promise.all([
      SmsMessage.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      SmsMessage.countDocuments(filter),
      SmsMessage.distinct('senderName', { userId }),
      SmsMessage.aggregate([
        { $match: { userId } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      SmsMessage.aggregate([
        { $match: { userId, status: { $in: [...FAILED_LIKE_STATUSES] } } },
        {
          $group: {
            _id: { $ifNull: ['$deliveryCause', '$errorMessage'] },
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
        { $limit: 5 },
      ]),
      SmsMessage.countDocuments({ userId }),
    ])

    const statusCounts: Record<string, number> = {}
    for (const stat of statsAgg) {
      statusCounts[stat._id] = stat.count
    }

    const deliveredCount = statusCounts.delivered || 0
    const failedCount = FAILED_LIKE_STATUSES.reduce((sum, s) => sum + (statusCounts[s] || 0), 0)
    const pendingCount = SMS_PENDING_STATUSES.reduce((sum, s) => sum + (statusCounts[s] || 0), 0)

    const totalPages = Math.max(Math.ceil(total / limit), 1)
    const data = messages.map((msg) => formatSmsHistoryRow(msg as Parameters<typeof formatSmsHistoryRow>[0]))

    const failureInsights = failureReasons.map((reason) => {
      const base = reason._id || 'Unknown error'
      return {
        reason:
          base === 'Unknown error'
            ? 'Unknown error from SMS gateway (check number format, sender ID, or gateway credentials)'
            : base,
        count: reason.count,
        percentage: totalMessages > 0 ? Math.round((reason.count / totalMessages) * 100) : 0,
      }
    })

    return NextResponse.json({
      success: true,
      data,
      messages: data,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
      filters: {
        availableSenderIds: senderIds.filter(Boolean).sort(),
        availableCampaigns: ['Send SMS', 'Bulk SMS', 'API', 'System', 'Test'],
      },
      stats: {
        delivered: {
          count: deliveredCount,
          percentage: totalMessages > 0 ? Math.round((deliveredCount / totalMessages) * 100) : 0,
        },
        failed: {
          count: failedCount,
          percentage: totalMessages > 0 ? Math.round((failedCount / totalMessages) * 100) : 0,
        },
        pending: {
          count: pendingCount,
          percentage: totalMessages > 0 ? Math.round((pendingCount / totalMessages) * 100) : 0,
        },
      },
      failureInsights,
    })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Get SMS history error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

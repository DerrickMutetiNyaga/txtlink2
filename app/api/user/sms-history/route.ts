/**
 * Get User SMS History
 * GET /api/user/sms-history
 */

import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db/connect'
import { SmsMessage, SMS_PENDING_STATUSES } from '@/lib/db/models'
import { requireAuth } from '@/lib/auth/middleware'
import mongoose from 'mongoose'

// Final statuses that are surfaced as "failed" in user-facing stats
const FAILED_LIKE_STATUSES = ['failed', 'expired', 'rejected', 'undeliverable', 'provider_timeout']

export async function GET(request: NextRequest) {
  try {
    await connectDB()
    const user = requireAuth(request)

    const userId = new mongoose.Types.ObjectId(user.userId)
    const { searchParams } = new URL(request.url)
    
    // Query parameters
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const status = searchParams.get('status') || 'all'
    const senderId = searchParams.get('senderId') || 'all'
    const search = searchParams.get('search') || ''
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    // Build query
    const query: any = { userId }

    // Status filter
    if (status !== 'all') {
      if (status === 'pending') {
        // Pending includes all in-flight statuses
        query.status = { $in: [...SMS_PENDING_STATUSES] }
      } else if (status === 'failed') {
        // Failed filter includes all non-delivered final statuses
        query.status = { $in: FAILED_LIKE_STATUSES }
      } else {
        query.status = status
      }
    }

    // Sender ID filter
    if (senderId !== 'all') {
      query.senderName = senderId
    }

    // Search filter (recipient or message)
    if (search) {
      query.$or = [
        { toNumbers: { $regex: search, $options: 'i' } },
        { message: { $regex: search, $options: 'i' } },
      ]
    }

    // Date range filter
    if (startDate || endDate) {
      query.createdAt = {}
      if (startDate) {
        query.createdAt.$gte = new Date(startDate)
      }
      if (endDate) {
        query.createdAt.$lte = new Date(endDate)
      }
    }

    // Calculate pagination
    const skip = (page - 1) * limit

    // Fetch messages
    const messages = await SmsMessage.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean()

    // Get total count for pagination
    const total = await SmsMessage.countDocuments(query)

    // Get statistics
    const stats = await SmsMessage.aggregate([
      { $match: { userId } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ])

    const statusCounts: Record<string, number> = {}
    stats.forEach((stat) => {
      statusCounts[stat._id] = stat.count
    })

    const totalMessages = await SmsMessage.countDocuments({ userId })
    const deliveredCount = statusCounts.delivered || 0
    const failedCount = FAILED_LIKE_STATUSES.reduce((sum, s) => sum + (statusCounts[s] || 0), 0)
    const pendingCount = SMS_PENDING_STATUSES.reduce((sum, s) => sum + (statusCounts[s] || 0), 0)

    // Helper to normalize failure reasons so we don't show a useless "Unknown error"
    const normalizeFailureReason = (baseReason?: string | null): string | undefined => {
      if (!baseReason) return undefined
      if (baseReason !== 'Unknown error') return baseReason

      // Provide a more helpful generic explanation
      return 'The SMS gateway returned an unknown error. Common causes are: invalid phone number format, inactive sender ID, or gateway credentials/credits issues.'
    }

    // Format messages for frontend
    const formattedMessages = messages.map((msg) => {
      const createdAt = new Date(msg.createdAt)
      const now = new Date()
      const diffInSeconds = Math.floor((now.getTime() - createdAt.getTime()) / 1000)
      
      let timeAgo = ''
      if (diffInSeconds < 60) {
        timeAgo = 'Just now'
      } else if (diffInSeconds < 3600) {
        const minutes = Math.floor(diffInSeconds / 60)
        timeAgo = `${minutes}m ago`
      } else if (diffInSeconds < 86400) {
        const hours = Math.floor(diffInSeconds / 3600)
        timeAgo = `${hours}h ago`
      } else {
        const days = Math.floor(diffInSeconds / 86400)
        timeAgo = `${days}d ago`
      }

      // Check for invalid phone number first
      const isInvalidPhone = msg.status === 'failed' && (
        msg.errorCode === 'INVALID_PHONE_NUMBER' ||
        (msg.errorMessage && (
          msg.errorMessage.toLowerCase().includes('invalid phone') ||
          msg.errorMessage.toLowerCase().includes('invalid number') ||
          msg.errorMessage.toLowerCase().includes('phone number format')
        ))
      )

      // Use deliveryCause (from status check) if available, otherwise fall back to errorMessage
      const failureReason = msg.status === 'failed'
        ? (isInvalidPhone 
            ? 'Invalid number'
            : ((msg as any).deliveryCause || msg.errorMessage || msg.errorCode || 'Unknown error'))
        : undefined

      return {
        id: msg._id?.toString(),
        time: timeAgo,
        recipient: msg.toNumbers.join(', '),
        senderId: msg.senderName,
        campaign: 'SMS Campaign', // You might want to add campaign field to the model
        message: msg.message,
        status: msg.status,
        failureReason: isInvalidPhone ? 'Invalid number' : normalizeFailureReason(failureReason),
        messageId: msg.hpTransactionId || msg._id?.toString(),
        sentAt: msg.sentAt || msg.createdAt,
        cost: msg.totalCost || 0,
        retryCount: (msg as any).statusCheckAttempts || 0,
        lastAttemptAt: msg.failedAt || msg.sentAt || null,
        toNumbers: msg.toNumbers,
        segments: msg.segments || 1,
      }
    })

    // Get failure insights (use deliveryCause if available, otherwise errorMessage)
    const failureReasons = await SmsMessage.aggregate([
      { $match: { userId, status: { $in: FAILED_LIKE_STATUSES } } },
      {
        $group: {
          _id: { $ifNull: ['$deliveryCause', '$errorMessage'] },
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ])

    const failureInsights = failureReasons.map((reason) => {
      const base = reason._id || 'Unknown error'
      return {
        reason: base === 'Unknown error'
          ? 'Unknown error from SMS gateway (check number format, sender ID, or gateway credentials)'
          : base,
        count: reason.count,
        percentage: totalMessages > 0 ? Math.round((reason.count / totalMessages) * 100) : 0,
      }
    })

    return NextResponse.json({
      success: true,
      messages: formattedMessages,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
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


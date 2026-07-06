/**
 * Get User Reports/Statistics
 * GET /api/user/reports
 */

import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db/connect'
import { SmsMessage } from '@/lib/db/models'
import { requireAuth } from '@/lib/auth/middleware'
import mongoose from 'mongoose'

export async function GET(request: NextRequest) {
  try {
    await connectDB()
    const user = requireAuth(request)

    const userId = new mongoose.Types.ObjectId(user.userId)
    const { searchParams } = new URL(request.url)
    
    // Query parameters
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const senderId = searchParams.get('senderId') || 'all'
    const status = searchParams.get('status') || 'all'

    // Build date range query
    const dateQuery: any = {}
    if (startDate) {
      dateQuery.$gte = new Date(startDate)
    }
    if (endDate) {
      const end = new Date(endDate)
      end.setHours(23, 59, 59, 999) // Include the entire end date
      dateQuery.$lte = end
    }

    // Build base query
    const query: any = { userId }
    if (Object.keys(dateQuery).length > 0) {
      query.createdAt = dateQuery
    }
    if (senderId !== 'all') {
      query.senderName = senderId
    }
    if (status !== 'all') {
      if (status === 'Delivered') {
        query.status = 'delivered'
      } else if (status === 'Pending') {
        query.status = { $in: ['queued', 'sent'] }
      } else if (status === 'Failed') {
        query.status = 'failed'
      }
    }

    // Get all messages matching the query
    const messages = await SmsMessage.find(query).lean()

    // Calculate summary statistics
    const totalSms = messages.length
    const delivered = messages.filter((m) => m.status === 'delivered').length
    const failed = messages.filter((m) => m.status === 'failed').length
    const deliveryRate = totalSms > 0 ? ((delivered / totalSms) * 100).toFixed(1) : '0'
    const totalCost = messages.reduce((sum, m) => sum + (m.totalCost || 0), 0)

    // Group by date and sender ID for detailed reports
    const reportsByDate: Record<string, Record<string, any>> = {}

    messages.forEach((msg) => {
      const date = new Date(msg.createdAt).toISOString().split('T')[0]
      const senderName = msg.senderName

      if (!reportsByDate[date]) {
        reportsByDate[date] = {}
      }
      if (!reportsByDate[date][senderName]) {
        reportsByDate[date][senderName] = {
          date,
          senderID: senderName,
          status: 'Delivered', // We'll calculate this
          count: 0,
          cost: 0,
        }
      }

      const report = reportsByDate[date][senderName]
      report.count += msg.toNumbers.length // Count recipients
      report.cost += msg.totalCost || 0

      // Determine status (if all delivered, show delivered, etc.)
      if (msg.status === 'delivered') {
        report.deliveredCount = (report.deliveredCount || 0) + msg.toNumbers.length
      } else if (msg.status === 'failed') {
        report.failedCount = (report.failedCount || 0) + msg.toNumbers.length
      } else {
        report.pendingCount = (report.pendingCount || 0) + msg.toNumbers.length
      }
    })

    // Convert to array and determine status
    const reports = Object.values(reportsByDate)
      .flatMap((dateReports) => Object.values(dateReports))
      .map((report: any) => {
        const total = report.count
        const delivered = report.deliveredCount || 0
        const failed = report.failedCount || 0
        const pending = report.pendingCount || 0

        // Determine primary status
        let status = 'Delivered'
        if (failed > delivered && failed > pending) {
          status = 'Failed'
        } else if (pending > delivered && pending > failed) {
          status = 'Pending'
        }

        return {
          id: `${report.date}-${report.senderID}`,
          date: report.date,
          senderID: report.senderID,
          status,
          count: total,
          cost: report.cost,
        }
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    // Get unique sender IDs for filter
    const uniqueSenderIds = [...new Set(messages.map((m) => m.senderName))]

    return NextResponse.json({
      success: true,
      summary: {
        totalSms,
        deliveryRate: parseFloat(deliveryRate),
        failed,
        totalCost,
      },
      reports,
      availableSenderIds: uniqueSenderIds,
    })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Get reports error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}


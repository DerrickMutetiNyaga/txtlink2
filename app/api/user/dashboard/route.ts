/**
 * Get User Dashboard Statistics
 * GET /api/user/dashboard
 */

import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db/connect'
import { SmsMessage, SystemSettings, UserWebhook } from '@/lib/db/models'
import { requireAuth } from '@/lib/auth/middleware'
import mongoose from 'mongoose'

type StatusTone = 'operational' | 'degraded' | 'down'
type StatusLabel = 'Operational' | 'Degraded' | 'Down'

function toneLabel(tone: StatusTone): StatusLabel {
  if (tone === 'operational') return 'Operational'
  if (tone === 'degraded') return 'Degraded'
  return 'Down'
}

function worstTone(...tones: StatusTone[]): StatusTone {
  if (tones.includes('down')) return 'down'
  if (tones.includes('degraded')) return 'degraded'
  return 'operational'
}

function overallSummary(tone: StatusTone): string {
  if (tone === 'operational') return 'All systems operational'
  if (tone === 'degraded') return 'Some systems degraded'
  return 'Service disruption detected'
}

export async function GET(request: NextRequest) {
  try {
    await connectDB()
    const user = requireAuth(request)

    const userId = new mongoose.Types.ObjectId(user.userId)
    const { searchParams } = new URL(request.url)
    const dateRange = searchParams.get('range') || '7D'

    // Calculate date range
    const now = new Date()
    let startDate: Date
    switch (dateRange) {
      case 'Today':
        startDate = new Date(now)
        startDate.setHours(0, 0, 0, 0)
        break
      case '30D':
        startDate = new Date(now)
        startDate.setDate(startDate.getDate() - 30)
        startDate.setHours(0, 0, 0, 0)
        break
      case '90D':
        startDate = new Date(now)
        startDate.setDate(startDate.getDate() - 90)
        startDate.setHours(0, 0, 0, 0)
        break
      default: // 7D
        startDate = new Date(now)
        startDate.setDate(startDate.getDate() - 7)
        startDate.setHours(0, 0, 0, 0)
    }

    // Get today's date for "today" metrics
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const todayEnd = new Date()
    todayEnd.setHours(23, 59, 59, 999)

    // Get yesterday's date for comparison
    const yesterdayStart = new Date(todayStart)
    yesterdayStart.setDate(yesterdayStart.getDate() - 1)
    const yesterdayEnd = new Date(todayEnd)
    yesterdayEnd.setDate(yesterdayEnd.getDate() - 1)

    // SMS Sent Today
    const smsSentToday = await SmsMessage.countDocuments({
      userId,
      createdAt: { $gte: todayStart, $lte: todayEnd },
    })

    // SMS Sent Yesterday (for comparison)
    const smsSentYesterday = await SmsMessage.countDocuments({
      userId,
      createdAt: { $gte: yesterdayStart, $lte: yesterdayEnd },
    })

    // Calculate percentage change
    const smsChangePercent =
      smsSentYesterday > 0
        ? (((smsSentToday - smsSentYesterday) / smsSentYesterday) * 100).toFixed(1)
        : smsSentToday > 0
        ? '100'
        : '0'

    // Delivery Rate (last 7 days)
    const last7DaysStart = new Date()
    last7DaysStart.setDate(last7DaysStart.getDate() - 7)
    
    const totalSent = await SmsMessage.countDocuments({
      userId,
      createdAt: { $gte: last7DaysStart },
      status: { $in: ['sent', 'delivered', 'failed'] },
    })

    const delivered = await SmsMessage.countDocuments({
      userId,
      createdAt: { $gte: last7DaysStart },
      status: 'delivered',
    })

    const deliveryRate = totalSent > 0 ? ((delivered / totalSent) * 100).toFixed(1) : '0'

    // Previous week for comparison
    const prevWeekStart = new Date(last7DaysStart)
    prevWeekStart.setDate(prevWeekStart.getDate() - 7)
    const prevWeekEnd = new Date(last7DaysStart)

    const prevWeekTotal = await SmsMessage.countDocuments({
      userId,
      createdAt: { $gte: prevWeekStart, $lt: prevWeekEnd },
      status: { $in: ['sent', 'delivered', 'failed'] },
    })

    const prevWeekDelivered = await SmsMessage.countDocuments({
      userId,
      createdAt: { $gte: prevWeekStart, $lt: prevWeekEnd },
      status: 'delivered',
    })

    const prevWeekDeliveryRate = prevWeekTotal > 0 ? (prevWeekDelivered / prevWeekTotal) * 100 : 0
    const deliveryChangePercent = (
      parseFloat(deliveryRate) - prevWeekDeliveryRate
    ).toFixed(1)

    // Failed Messages Today
    const failedToday = await SmsMessage.countDocuments({
      userId,
      createdAt: { $gte: todayStart, $lte: todayEnd },
      status: 'failed',
    })

    const failedYesterday = await SmsMessage.countDocuments({
      userId,
      createdAt: { $gte: yesterdayStart, $lte: yesterdayEnd },
      status: 'failed',
    })

    const failedChangePercent =
      failedYesterday > 0
        ? (((failedToday - failedYesterday) / failedYesterday) * 100).toFixed(1)
        : failedToday > 0
        ? '-100'
        : '0'

    // Chart data - SMS volume over the date range
    const chartData: Array<{ date: string; sent: number; delivered: number }> = []
    const days = dateRange === 'Today' ? 1 : dateRange === '7D' ? 7 : dateRange === '30D' ? 30 : 90

    for (let i = days - 1; i >= 0; i--) {
      const dayStart = new Date(startDate)
      dayStart.setDate(dayStart.getDate() + i)
      dayStart.setHours(0, 0, 0, 0)
      const dayEnd = new Date(dayStart)
      dayEnd.setHours(23, 59, 59, 999)

      const sent = await SmsMessage.countDocuments({
        userId,
        createdAt: { $gte: dayStart, $lte: dayEnd },
      })

      const delivered = await SmsMessage.countDocuments({
        userId,
        createdAt: { $gte: dayStart, $lte: dayEnd },
        status: 'delivered',
      })

      const dayName = dayStart.toLocaleDateString('en-US', { weekday: 'short' })
      chartData.push({
        date: dayName,
        sent,
        delivered,
      })
    }

    // Delivery breakdown (last 7 days)
    const pending = await SmsMessage.countDocuments({
      userId,
      createdAt: { $gte: last7DaysStart },
      status: { $in: ['queued', 'sent'] },
    })

    const failed = await SmsMessage.countDocuments({
      userId,
      createdAt: { $gte: last7DaysStart },
      status: 'failed',
    })

    // Recent activities (last 10 activities)
    const recentActivities = await SmsMessage.find({
      userId,
    })
      .sort({ createdAt: -1 })
      .limit(10)
      .select('senderName toNumbers message status createdAt')
      .lean()

    const activities = recentActivities.map((msg) => {
      const timeAgo = getTimeAgo(msg.createdAt)
      let title = ''
      let subtitle = ''
      let category = ''
      let icon = 'MessageSquare'

      if (msg.status === 'delivered') {
        title = `SMS sent to ${msg.toNumbers.length} recipient${msg.toNumbers.length > 1 ? 's' : ''}`
        subtitle = `${msg.toNumbers.length} message${msg.toNumbers.length > 1 ? 's' : ''} delivered successfully`
        category = 'Campaigns'
      } else if (msg.status === 'failed') {
        title = `SMS delivery failed`
        subtitle = `Failed to send to ${msg.toNumbers.length} recipient${msg.toNumbers.length > 1 ? 's' : ''}`
        category = 'Campaigns'
      } else if (msg.status === 'sent') {
        title = `SMS sent`
        subtitle = `${msg.toNumbers.length} message${msg.toNumbers.length > 1 ? 's' : ''} sent, pending delivery`
        category = 'Campaigns'
      } else {
        title = `SMS queued`
        subtitle = `${msg.toNumbers.length} message${msg.toNumbers.length > 1 ? 's' : ''} queued for sending`
        category = 'Campaigns'
      }

      return {
        id: msg._id?.toString(),
        icon: 'MessageSquare',
        title,
        subtitle,
        time: timeAgo,
        status: msg.status === 'delivered' ? 'completed' : msg.status === 'failed' ? 'failed' : 'pending',
        category,
      }
    })

    // Sparkline data for SMS Sent (last 6 data points)
    const sparklineData: Array<{ value: number }> = []
    for (let i = 5; i >= 0; i--) {
      const pointStart = new Date(todayStart)
      pointStart.setDate(pointStart.getDate() - i)
      pointStart.setHours(0, 0, 0, 0)
      const pointEnd = new Date(pointStart)
      pointEnd.setHours(23, 59, 59, 999)

      const count = await SmsMessage.countDocuments({
        userId,
        createdAt: { $gte: pointStart, $lte: pointEnd },
      })

      sparklineData.push({ value: count })
    }

    // Sparkline data for delivery rate (last 6 data points)
    const deliverySparklineData: Array<{ value: number }> = []
    for (let i = 5; i >= 0; i--) {
      const pointStart = new Date(todayStart)
      pointStart.setDate(pointStart.getDate() - i)
      pointStart.setHours(0, 0, 0, 0)
      const pointEnd = new Date(pointStart)
      pointEnd.setHours(23, 59, 59, 999)

      const total = await SmsMessage.countDocuments({
        userId,
        createdAt: { $gte: pointStart, $lte: pointEnd },
        status: { $in: ['sent', 'delivered', 'failed'] },
      })

      const delivered = await SmsMessage.countDocuments({
        userId,
        createdAt: { $gte: pointStart, $lte: pointEnd },
        status: 'delivered',
      })

      const rate = total > 0 ? (delivered / total) * 100 : 0
      deliverySparklineData.push({ value: rate })
    }

    // Sparkline data for failed messages (last 6 data points)
    const failedSparklineData: Array<{ value: number }> = []
    for (let i = 5; i >= 0; i--) {
      const pointStart = new Date(todayStart)
      pointStart.setDate(pointStart.getDate() - i)
      pointStart.setHours(0, 0, 0, 0)
      const pointEnd = new Date(pointStart)
      pointEnd.setHours(23, 59, 59, 999)

      const count = await SmsMessage.countDocuments({
        userId,
        createdAt: { $gte: pointStart, $lte: pointEnd },
        status: 'failed',
      })

      failedSparklineData.push({ value: count })
    }

    // ---------- System status + alerts (user-scoped, no heavy provider probes) ----------
    const settings = await SystemSettings.findOne()
      .select('smsSendingEnabled autoMarkSentAsDelivered deliveryReportWebhookEnabled')
      .lean()

    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const stuckCutoff = new Date(Date.now() - 60 * 60 * 1000) // stuck > 1 hour waiting on DLR

    const [recentTotal, recentProviderFails, stuckPending, activeUserWebhooks] = await Promise.all([
      SmsMessage.countDocuments({ userId, createdAt: { $gte: last24h } }),
      SmsMessage.countDocuments({
        userId,
        createdAt: { $gte: last24h },
        status: 'failed',
        errorCode: { $in: ['HP_API_ERROR', 'ASYNC_ERROR'] },
      }),
      SmsMessage.countDocuments({
        userId,
        status: { $in: ['sent', 'processing', 'retrying'] },
        sentAt: { $lte: stuckCutoff },
        createdAt: { $gte: last24h },
      }),
      UserWebhook.countDocuments({ userId, status: 'active' }),
    ])

    // API Services — this request reached Mongo, so the API path is up
    const apiTone: StatusTone =
      mongoose.connection.readyState === 1 ? 'operational' : 'down'

    // SMS Gateway — platform kill switch + this user's recent provider send failures
    let gatewayTone: StatusTone = 'operational'
    if (settings?.smsSendingEnabled === false) {
      gatewayTone = 'down'
    } else if (recentTotal >= 5 && recentProviderFails / recentTotal >= 0.2) {
      gatewayTone = 'degraded'
    }

    // Webhooks / DLR — stuck "sent" messages mean delivery reports aren't resolving,
    // unless the auto-mark-delivered toggle is on (no DLR wait by design).
    let webhookTone: StatusTone = 'operational'
    if (settings?.autoMarkSentAsDelivered) {
      webhookTone = 'operational'
    } else if (stuckPending >= 5) {
      webhookTone = 'degraded'
    } else if (activeUserWebhooks === 0 && settings?.deliveryReportWebhookEnabled === false) {
      // Platform DLR webhook disabled and user has no outbound webhooks configured
      webhookTone = 'degraded'
    }

    const overallTone = worstTone(apiTone, gatewayTone, webhookTone)
    const deliveryRateNum = parseFloat(deliveryRate)
    const DELIVERY_RATE_TARGET = 95

    const alerts: Array<{
      id: string
      title: string
      description: string
      severity: 'warning' | 'info'
    }> = []

    if (recentTotal > 0 && deliveryRateNum < DELIVERY_RATE_TARGET) {
      alerts.push({
        id: 'delivery_rate',
        title: 'Delivery rate below threshold',
        description: `Last 7 days: ${deliveryRateNum.toFixed(1)}% (target: ${DELIVERY_RATE_TARGET}%)`,
        severity: 'warning',
      })
    }

    if (gatewayTone === 'down') {
      alerts.push({
        id: 'sms_disabled',
        title: 'SMS sending disabled',
        description: 'Platform-wide SMS sending is currently turned off',
        severity: 'warning',
      })
    } else if (gatewayTone === 'degraded') {
      alerts.push({
        id: 'gateway_errors',
        title: 'Elevated send failures',
        description: `${recentProviderFails} provider send failures in the last 24 hours`,
        severity: 'warning',
      })
    }

    if (webhookTone === 'degraded' && stuckPending >= 5) {
      alerts.push({
        id: 'stuck_dlr',
        title: 'Messages waiting on delivery reports',
        description: `${stuckPending} message${stuckPending === 1 ? '' : 's'} still pending delivery confirmation for over an hour`,
        severity: 'warning',
      })
    }

    return NextResponse.json({
      success: true,
      kpis: {
        smsSentToday: {
          value: smsSentToday,
          change: smsChangePercent,
          positive: parseFloat(smsChangePercent) >= 0,
          sparklineData,
        },
        deliveryRate: {
          value: parseFloat(deliveryRate),
          change: deliveryChangePercent,
          positive: parseFloat(deliveryChangePercent) >= 0,
          sparklineData: deliverySparklineData,
        },
        failedMessages: {
          value: failedToday,
          change: failedChangePercent,
          positive: parseFloat(failedChangePercent) <= 0, // Negative change is positive
          sparklineData: failedSparklineData,
        },
      },
      chartData,
      deliveryBreakdown: {
        delivered,
        pending,
        failed,
      },
      activities,
      systemStatus: {
        overall: overallTone,
        summary: overallSummary(overallTone),
        items: [
          { label: 'API Services', status: toneLabel(apiTone), tone: apiTone },
          { label: 'SMS Gateway', status: toneLabel(gatewayTone), tone: gatewayTone },
          { label: 'Webhooks', status: toneLabel(webhookTone), tone: webhookTone },
        ],
      },
      alerts,
    })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Get dashboard stats error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

function getTimeAgo(date: Date): string {
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - new Date(date).getTime()) / 1000)

  if (diffInSeconds < 60) {
    return 'Just now'
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60)
  if (diffInMinutes < 60) {
    return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`
  }

  const diffInHours = Math.floor(diffInMinutes / 60)
  if (diffInHours < 24) {
    return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`
  }

  const diffInDays = Math.floor(diffInHours / 24)
  if (diffInDays < 7) {
    return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`
  }

  const diffInWeeks = Math.floor(diffInDays / 7)
  if (diffInWeeks < 4) {
    return `${diffInWeeks} week${diffInWeeks > 1 ? 's' : ''} ago`
  }

  const diffInMonths = Math.floor(diffInDays / 30)
  return `${diffInMonths} month${diffInMonths > 1 ? 's' : ''} ago`
}


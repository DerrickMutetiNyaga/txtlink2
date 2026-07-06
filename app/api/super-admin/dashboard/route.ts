/**
 * Super Admin Dashboard API
 * GET /api/super-admin/dashboard
 */

import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db/connect'
import { User, SmsMessage, SenderId } from '@/lib/db/models'
import { requireOwner } from '@/lib/auth/middleware'

export async function GET(request: NextRequest) {
  try {
    await connectDB()
    requireOwner(request)

    const mongoose = require('mongoose')
    const now = new Date()
    const todayStart = new Date(now.setHours(0, 0, 0, 0))
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    // Total users
    const totalUsers = await User.countDocuments({})

    // SMS stats
    const [smsToday, sms7d, sms30d] = await Promise.all([
      SmsMessage.countDocuments({ createdAt: { $gte: todayStart } }),
      SmsMessage.countDocuments({ createdAt: { $gte: sevenDaysAgo } }),
      SmsMessage.countDocuments({ createdAt: { $gte: thirtyDaysAgo } }),
    ])

    // Delivery stats
    const [delivered, failed, total] = await Promise.all([
      SmsMessage.countDocuments({ status: 'delivered', createdAt: { $gte: thirtyDaysAgo } }),
      SmsMessage.countDocuments({ status: 'failed', createdAt: { $gte: thirtyDaysAgo } }),
      SmsMessage.countDocuments({ createdAt: { $gte: thirtyDaysAgo } }),
    ])

    const deliveryRate = total > 0 ? (delivered / total) * 100 : 0
    const failedRate = total > 0 ? (failed / total) * 100 : 0

    // Revenue stats
    const revenueStats = await SmsMessage.aggregate([
      { $match: { createdAt: { $gte: thirtyDaysAgo } } },
      {
        $group: {
          _id: null,
          totalCharged: { $sum: { $ifNull: ['$chargedKes', '$totalCost'] } },
          totalRefunded: { $sum: { $ifNull: ['$refundAmountKes', 0] } },
        },
      },
    ])

    const totalCharged = revenueStats[0]?.totalCharged || 0
    const totalRefunded = revenueStats[0]?.totalRefunded || 0
    const netRevenue = totalCharged - totalRefunded

    // Active sender IDs
    const activeSenderIds = await SenderId.countDocuments({ status: 'active' })

    // Top 10 customers by volume
    const topCustomers = await SmsMessage.aggregate([
      { $match: { createdAt: { $gte: thirtyDaysAgo } } },
      {
        $group: {
          _id: '$userId',
          count: { $sum: 1 },
          totalCharged: { $sum: { $ifNull: ['$chargedKes', '$totalCost'] } },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user',
        },
      },
      { $unwind: '$user' },
      {
        $project: {
          userId: '$_id',
          userName: '$user.name',
          userEmail: '$user.email',
          smsCount: '$count',
          totalCharged: 1,
        },
      },
    ])

    // SMS volume over time (last 30 days)
    const volumeOverTime = await SmsMessage.aggregate([
      { $match: { createdAt: { $gte: thirtyDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ])

    // Delivery rate over time
    const deliveryOverTime = await SmsMessage.aggregate([
      { $match: { createdAt: { $gte: thirtyDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          delivered: { $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] } },
          total: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
      {
        $project: {
          date: '$_id',
          rate: { $cond: [{ $gt: ['$total', 0] }, { $multiply: [{ $divide: ['$delivered', '$total'] }, 100] }, 0] },
        },
      },
    ])

    return NextResponse.json({
      success: true,
      data: {
        kpis: {
          totalUsers,
          smsToday,
          sms7d,
          sms30d,
          deliveryRate: Math.round(deliveryRate * 100) / 100,
          failedRate: Math.round(failedRate * 100) / 100,
          totalCharged,
          totalRefunded,
          netRevenue,
          activeSenderIds,
        },
        topCustomers,
        volumeOverTime,
        deliveryOverTime,
      },
    })
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message.includes('Forbidden')) {
      return NextResponse.json(
        { error: error.message },
        { status: error.message.includes('Forbidden') ? 403 : 401 }
      )
    }
    console.error('Dashboard error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}


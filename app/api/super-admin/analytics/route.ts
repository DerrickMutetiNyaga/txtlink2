/**
 * Super Admin: Analytics
 * GET /api/super-admin/analytics
 */

import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db/connect'
import { SmsMessage, User } from '@/lib/db/models'
import { requireOwner } from '@/lib/auth/middleware'

export async function GET(request: NextRequest) {
  try {
    await connectDB()
    requireOwner(request)

    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const userId = searchParams.get('userId')
    const senderId = searchParams.get('senderId')
    const status = searchParams.get('status')

    const match: any = {}
    if (startDate || endDate) {
      match.createdAt = {}
      if (startDate) match.createdAt.$gte = new Date(startDate)
      if (endDate) match.createdAt.$lte = new Date(endDate)
    }
    if (userId) {
      const mongoose = require('mongoose')
      match.userId = new mongoose.Types.ObjectId(userId)
    }
    if (senderId) {
      match.senderName = senderId
    }
    if (status) {
      match.status = status
    }

    // Volume stats
    const volumeStats = await SmsMessage.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          sent: { $sum: { $cond: [{ $eq: ['$status', 'sent'] }, 1, 0] } },
          delivered: { $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] } },
          failed: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } },
          queued: { $sum: { $cond: [{ $eq: ['$status', 'queued'] }, 1, 0] } },
        },
      },
    ])

    // Revenue and profit stats
    const revenueStats = await SmsMessage.aggregate([
      { $match: match },
      {
        $addFields: {
          calculatedProfit: {
            $ifNull: [
              '$profitKes',
              {
                $subtract: [
                  { $ifNull: ['$chargedKes', '$totalCost'] },
                  { $ifNull: ['$providerCostKes', 0] },
                ],
              },
            ],
          },
        },
      },
      {
        $group: {
          _id: null,
          totalCharged: { $sum: { $ifNull: ['$chargedKes', '$totalCost'] } },
          totalRefunded: { $sum: { $ifNull: ['$refundAmountKes', 0] } },
          totalProviderCost: { $sum: { $ifNull: ['$providerCostKes', 0] } },
          totalProfit: { $sum: '$calculatedProfit' },
          totalParts: { $sum: { $ifNull: ['$parts', '$segments', 1] } },
        },
      },
    ])

    // Failure reasons
    const failureReasons = await SmsMessage.aggregate([
      { $match: { ...match, status: 'failed' } },
      {
        $group: {
          _id: '$errorCode',
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ])

    // Average message length and parts
    const messageStats = await SmsMessage.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          avgLength: { $avg: { $strLenCP: '$message' } },
          avgParts: { $avg: { $ifNull: ['$parts', '$segments'] } },
        },
      },
    ])

    // Top customers by spend
    const topCustomers = await SmsMessage.aggregate([
      { $match: match },
      {
        $addFields: {
          calculatedProfit: {
            $ifNull: [
              '$profitKes',
              {
                $subtract: [
                  { $ifNull: ['$chargedKes', '$totalCost'] },
                  { $ifNull: ['$providerCostKes', 0] },
                ],
              },
            ],
          },
        },
      },
      {
        $group: {
          _id: '$userId',
          smsCount: { $sum: 1 },
          totalParts: { $sum: { $ifNull: ['$parts', '$segments', 1] } },
          totalCharged: { $sum: { $ifNull: ['$chargedKes', '$totalCost'] } },
          totalProviderCost: { $sum: { $ifNull: ['$providerCostKes', 0] } },
          totalProfit: { $sum: '$calculatedProfit' },
        },
      },
      {
        $addFields: {
          avgPricePerPart: {
            $cond: [
              { $gt: ['$totalParts', 0] },
              { $divide: ['$totalCharged', '$totalParts'] },
              0,
            ],
          },
        },
      },
      { $sort: { totalCharged: -1 } },
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
          smsCount: 1,
          totalParts: 1,
          totalCharged: 1,
          totalProviderCost: 1,
          totalProfit: 1,
          avgPricePerPart: 1,
        },
      },
    ])

    // All customers summary (for full table)
    const allCustomers = await SmsMessage.aggregate([
      { $match: match },
      {
        $addFields: {
          calculatedProfit: {
            $ifNull: [
              '$profitKes',
              {
                $subtract: [
                  { $ifNull: ['$chargedKes', '$totalCost'] },
                  { $ifNull: ['$providerCostKes', 0] },
                ],
              },
            ],
          },
        },
      },
      {
        $group: {
          _id: '$userId',
          smsCount: { $sum: 1 },
          totalParts: { $sum: { $ifNull: ['$parts', '$segments', 1] } },
          totalCharged: { $sum: { $ifNull: ['$chargedKes', '$totalCost'] } },
          totalProviderCost: { $sum: { $ifNull: ['$providerCostKes', 0] } },
          totalProfit: { $sum: '$calculatedProfit' },
        },
      },
      {
        $addFields: {
          avgPricePerPart: {
            $cond: [
              { $gt: ['$totalParts', 0] },
              { $divide: ['$totalCharged', '$totalParts'] },
              0,
            ],
          },
        },
      },
      { $sort: { totalCharged: -1 } },
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
          smsCount: 1,
          totalParts: 1,
          totalCharged: 1,
          totalProviderCost: 1,
          totalProfit: 1,
          avgPricePerPart: 1,
        },
      },
    ])

    // Top sender IDs by performance
    const topSenderIds = await SmsMessage.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$senderName',
          total: { $sum: 1 },
          delivered: { $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] } },
        },
      },
      {
        $project: {
          senderName: '$_id',
          total: 1,
          delivered: 1,
          deliveryRate: { $cond: [{ $gt: ['$total', 0] }, { $multiply: [{ $divide: ['$delivered', '$total'] }, 100] }, 0] },
        },
      },
      { $sort: { total: -1 } },
      { $limit: 10 },
    ])

    const revenueData = revenueStats[0] || {
      totalCharged: 0,
      totalRefunded: 0,
      totalProviderCost: 0,
      totalProfit: 0,
      totalParts: 0,
    }

    // Calculate average price per part
    const avgPricePerPart =
      revenueData.totalParts > 0
        ? revenueData.totalCharged / revenueData.totalParts
        : 0

    return NextResponse.json({
      success: true,
      data: {
        volume: volumeStats[0] || { total: 0, sent: 0, delivered: 0, failed: 0, queued: 0 },
        revenue: {
          ...revenueData,
          avgPricePerPart,
        },
        failureReasons,
        messageStats: messageStats[0] || { avgLength: 0, avgParts: 0 },
        topCustomers,
        allCustomers,
        topSenderIds,
      },
    })
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message.includes('Forbidden')) {
      return NextResponse.json(
        { error: error.message },
        { status: error.message.includes('Forbidden') ? 403 : 401 }
      )
    }
    console.error('Analytics error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}


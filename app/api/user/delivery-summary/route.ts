/**
 * Get User Delivery Summary
 * GET /api/user/delivery-summary
 *
 * Query: fromDate, toDate, senderName (optional), groupBy = summary | date | senderId
 * Returns aggregated counts: totalRequested, totalDelivered, pending, totalFailed, notSent, others, refund
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

    const fromDate = searchParams.get('fromDate')
    const toDate = searchParams.get('toDate')
    const senderName = searchParams.get('senderName') || 'all'
    const groupBy = (searchParams.get('groupBy') || 'summary') as 'summary' | 'date' | 'senderId'

    const match: Record<string, unknown> = { userId }

    if (senderName !== 'all') {
      match.senderName = senderName
    }

    const dateField = 'createdAt'
    if (fromDate) {
      match[dateField] = { ...(match[dateField] as object || {}), $gte: new Date(fromDate) }
    }
    if (toDate) {
      const end = new Date(toDate)
      end.setHours(23, 59, 59, 999)
      match[dateField] = { ...(match[dateField] as object || {}), $lte: end }
    }

    type Row = {
      groupByLabel: string
      totalRequested: number
      totalDelivered: number
      pending: number
      totalFailed: number
      notSent: number
      others: number
      refund: number
    }

    if (groupBy === 'summary') {
      const stats = await SmsMessage.aggregate([
        { $match: match },
        {
          $group: {
            _id: null,
            totalRequested: { $sum: 1 },
            totalDelivered: {
              $sum: {
                $cond: [
                  {
                    $or: [
                      { $eq: ['$status', 'delivered'] },
                      { $eq: ['$deliveryMethod', 'android_phone_gateway'] },
                      { $in: ['$fallbackStatus', ['delivered_via_phone', 'sent_via_phone']] },
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
            pending: {
              $sum: {
                $cond: [
                  { $in: ['$status', ['queued', 'sent']] },
                  1,
                  0,
                ],
              },
            },
            totalFailed: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } },
            notSent: { $sum: 0 },
            others: { $sum: 0 },
            refund: { $sum: { $cond: ['$refunded', 1, 0] } },
          },
        },
      ])
      const row: Row = stats[0]
        ? {
            groupByLabel: 'Summary',
            totalRequested: stats[0].totalRequested,
            totalDelivered: stats[0].totalDelivered,
            pending: stats[0].pending,
            totalFailed: stats[0].totalFailed,
            notSent: stats[0].notSent,
            others: stats[0].others,
            refund: stats[0].refund,
          }
        : {
            groupByLabel: 'Summary',
            totalRequested: 0,
            totalDelivered: 0,
            pending: 0,
            totalFailed: 0,
            notSent: 0,
            others: 0,
            refund: 0,
          }
      return NextResponse.json({ success: true, rows: [row], availableSenderIds: await getSenderIds(userId) })
    }

    if (groupBy === 'date') {
      const stats = await SmsMessage.aggregate([
        { $match: match },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            totalRequested: { $sum: 1 },
            totalDelivered: {
              $sum: {
                $cond: [
                  {
                    $or: [
                      { $eq: ['$status', 'delivered'] },
                      { $eq: ['$deliveryMethod', 'android_phone_gateway'] },
                      { $in: ['$fallbackStatus', ['delivered_via_phone', 'sent_via_phone']] },
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
            pending: {
              $sum: { $cond: [{ $in: ['$status', ['queued', 'sent']] }, 1, 0] },
            },
            totalFailed: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } },
            refund: { $sum: { $cond: ['$refunded', 1, 0] } },
          },
        },
        { $sort: { _id: 1 } },
      ])
      const rows: Row[] = stats.map((s) => ({
        groupByLabel: s._id,
        totalRequested: s.totalRequested,
        totalDelivered: s.totalDelivered,
        pending: s.pending,
        totalFailed: s.totalFailed,
        notSent: 0,
        others: 0,
        refund: s.refund,
      }))
      return NextResponse.json({ success: true, rows, availableSenderIds: await getSenderIds(userId) })
    }

    // groupBy === 'senderId'
    const stats = await SmsMessage.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$senderName',
          totalRequested: { $sum: 1 },
          totalDelivered: { $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] } },
          pending: {
            $sum: { $cond: [{ $in: ['$status', ['queued', 'sent']] }, 1, 0] },
          },
          totalFailed: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } },
          refund: { $sum: { $cond: ['$refunded', 1, 0] } },
        },
      },
      { $sort: { _id: 1 } },
    ])
    const rows: Row[] = stats.map((s) => ({
      groupByLabel: s._id || '—',
      totalRequested: s.totalRequested,
      totalDelivered: s.totalDelivered,
      pending: s.pending,
      totalFailed: s.totalFailed,
      notSent: 0,
      others: 0,
      refund: s.refund,
    }))
    return NextResponse.json({ success: true, rows, availableSenderIds: await getSenderIds(userId) })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Delivery summary error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

async function getSenderIds(userId: mongoose.Types.ObjectId): Promise<string[]> {
  const list = await SmsMessage.distinct('senderName', { userId })
  return list.filter(Boolean).sort()
}

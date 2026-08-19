/**
 * Get User Billing Data
 * GET /api/user/billing
 */

import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db/connect'
import { Transaction, PaymentMethod, SmsMessage, User, Invoice, SenderIdRequest } from '@/lib/db/models'
import { requireAuth } from '@/lib/auth/middleware'
import { formatInvoice } from '@/lib/validation/sender-id-request'
import mongoose from 'mongoose'

const TRANSACTION_LIMIT = 50

function monthLabel(yearMonth: string) {
  const [year, month] = yearMonth.split('-').map(Number)
  const date = new Date(year, (month || 1) - 1, 1)
  return `${date.toLocaleString('default', { month: 'long' })} ${year}`
}

export async function GET(request: NextRequest) {
  try {
    await connectDB()
    const user = requireAuth(request)

    const userId = new mongoose.Types.ObjectId(user.userId)
    const { searchParams } = new URL(request.url)
    const filter = searchParams.get('filter') || 'all'

    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    const transactionQuery: Record<string, unknown> = { userId }
    if (filter !== 'all') {
      const typeMap: Record<string, string> = {
        'top-ups': 'top-up',
        'charges': 'charge',
        'refunds': 'refund',
      }
      transactionQuery.type = typeMap[filter] || filter
    }

    const [
      userDoc,
      transactions,
      usageRows,
      invoiceRows,
      paymentMethods,
      pendingInvoiceDocs,
    ] = await Promise.all([
      User.findById(userId).select('creditsBalance').lean(),
      Transaction.find(transactionQuery)
        .select('type status amount description reference createdAt')
        .sort({ createdAt: -1 })
        .limit(TRANSACTION_LIMIT)
        .lean(),
      SmsMessage.aggregate([
        { $match: { userId, createdAt: { $gte: thirtyDaysAgo } } },
        {
          $group: {
            _id: null,
            usedThisMonth: {
              $sum: {
                $cond: [{ $gte: ['$createdAt', startOfMonth] }, { $ifNull: ['$totalCost', 0] }, 0],
              },
            },
            smsCount: {
              $sum: {
                $cond: [
                  { $gte: ['$createdAt', startOfMonth] },
                  {
                    $cond: [
                      { $isArray: '$toNumbers' },
                      { $size: '$toNumbers' },
                      1,
                    ],
                  },
                  0,
                ],
              },
            },
            totalSpend30Days: { $sum: { $ifNull: ['$totalCost', 0] } },
          },
        },
      ]).option({ maxTimeMS: 8000 }),
      Transaction.aggregate([
        { $match: { userId, type: 'charge', status: 'completed' } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
            amount: { $sum: { $abs: '$amount' } },
          },
        },
        { $sort: { _id: -1 } },
        { $limit: 12 },
      ]).option({ maxTimeMS: 8000 }),
      PaymentMethod.find({ userId })
        .select('type name details expiry isDefault')
        .sort({ isDefault: -1, createdAt: -1 })
        .lean(),
      Invoice.find({
        userId,
        type: 'sender_id_application',
        status: { $in: ['unpaid', 'failed', 'pending_payment'] },
      })
        .sort({ createdAt: -1 })
        .limit(20)
        .lean(),
    ])

    const usage = usageRows[0] || { usedThisMonth: 0, smsCount: 0, totalSpend30Days: 0 }
    const usedThisMonth = usage.usedThisMonth || 0
    const smsCount = usage.smsCount || 0
    const avgDailySpend = Math.round((usage.totalSpend30Days || 0) / 30)

    const invoices = invoiceRows.map((row) => ({
      id: row._id,
      date: monthLabel(row._id),
      amount: row.amount,
      status: 'paid',
      reference: `INV-${row._id}`,
    }))

    const senderRequestIds = pendingInvoiceDocs
      .map((inv) => inv.senderIdRequestId)
      .filter(Boolean)

    const senderRequests = senderRequestIds.length
      ? await SenderIdRequest.find({ _id: { $in: senderRequestIds } })
          .select('_id desiredSenderId')
          .lean()
      : []

    const senderIdByRequest = new Map(
      senderRequests.map((req) => [req._id?.toString(), req.desiredSenderId])
    )

    const pendingInvoices = pendingInvoiceDocs.map((inv) =>
      formatInvoice(inv, senderIdByRequest.get(inv.senderIdRequestId?.toString() || '') || '')
    )

    const formattedTransactions = transactions.map((tx) => ({
      id: tx._id?.toString(),
      date: new Date(tx.createdAt).toISOString().split('T')[0],
      description: tx.description,
      amount: tx.amount,
      type: tx.type,
      status: tx.status,
      reference: tx.reference,
    }))

    return NextResponse.json({
      success: true,
      balance: userDoc?.creditsBalance || 0,
      summary: {
        usedThisMonth,
        smsCount,
        avgDailySpend,
        plan: 'Enterprise',
      },
      transactions: formattedTransactions,
      invoices,
      pendingInvoices,
      paymentMethods: paymentMethods.map((pm) => ({
        id: pm._id?.toString(),
        type: pm.type,
        name: pm.name,
        details: pm.details,
        expiry: pm.expiry,
        isDefault: pm.isDefault,
      })),
    })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Get billing data error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

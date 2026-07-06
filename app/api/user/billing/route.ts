/**
 * Get User Billing Data
 * GET /api/user/billing
 */

import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db/connect'
import { Transaction, PaymentMethod, SmsMessage, User } from '@/lib/db/models'
import { requireAuth } from '@/lib/auth/middleware'
import mongoose from 'mongoose'

export async function GET(request: NextRequest) {
  try {
    await connectDB()
    const user = requireAuth(request)

    const userId = new mongoose.Types.ObjectId(user.userId)
    const { searchParams } = new URL(request.url)
    const filter = searchParams.get('filter') || 'all'
    const search = searchParams.get('search') || ''

    // Get user balance (credits-based wallet)
    const userDoc = await User.findById(userId).select('creditsBalance').lean()
    const balance = userDoc?.creditsBalance || 0

    // Build transaction query
    const transactionQuery: any = { userId }
    if (filter !== 'all') {
      // Convert filter format: 'top-ups' -> 'top-up', 'charges' -> 'charge', 'refunds' -> 'refund'
      const typeMap: Record<string, string> = {
        'top-ups': 'top-up',
        'charges': 'charge',
        'refunds': 'refund',
      }
      transactionQuery.type = typeMap[filter] || filter
    }

    // Get transactions
    let transactions = await Transaction.find(transactionQuery)
      .sort({ createdAt: -1 })
      .limit(100)
      .lean()

    // Apply search filter
    if (search) {
      transactions = transactions.filter(
        (tx) =>
          tx.description.toLowerCase().includes(search.toLowerCase()) ||
          tx.reference.toLowerCase().includes(search.toLowerCase())
      )
    }

    // Calculate usage statistics for current month
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const startOfMonthISO = startOfMonth.toISOString()

    // Get SMS messages for current month
    const messagesThisMonth = await SmsMessage.find({
      userId,
      createdAt: { $gte: startOfMonth },
    }).lean()

    const usedThisMonth = messagesThisMonth.reduce((sum, msg) => sum + (msg.totalCost || 0), 0)
    const smsCount = messagesThisMonth.reduce((sum, msg) => sum + msg.toNumbers.length, 0)

    // Calculate average daily spend (last 30 days)
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const messagesLast30Days = await SmsMessage.find({
      userId,
      createdAt: { $gte: thirtyDaysAgo },
    }).lean()

    const totalSpend30Days = messagesLast30Days.reduce((sum, msg) => sum + (msg.totalCost || 0), 0)
    const avgDailySpend = Math.round(totalSpend30Days / 30)

    // Get user plan (default to Enterprise for now)
    const plan = 'Enterprise'

    // Get payment methods
    const paymentMethods = await PaymentMethod.find({ userId }).sort({ isDefault: -1, createdAt: -1 }).lean()

    // Generate invoices from transactions (grouped by month)
    const invoiceMap: Record<string, any> = {}
    transactions.forEach((tx) => {
      if (tx.type === 'charge' && tx.status === 'completed') {
        const date = new Date(tx.createdAt)
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
        if (!invoiceMap[monthKey]) {
          invoiceMap[monthKey] = {
            date: `${date.toLocaleString('default', { month: 'long' })} ${date.getFullYear()}`,
            amount: 0,
            transactions: [],
          }
        }
        invoiceMap[monthKey].amount += Math.abs(tx.amount)
        invoiceMap[monthKey].transactions.push(tx)
      }
    })

    const invoices = Object.entries(invoiceMap)
      .map(([key, data]: [string, any]) => ({
        id: key,
        date: data.date,
        amount: data.amount,
        status: 'paid',
        reference: `INV-${key}`,
      }))
      .sort((a, b) => b.id.localeCompare(a.id))
      .slice(0, 12) // Last 12 months

    // Format transactions for response
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
      balance,
      summary: {
        usedThisMonth,
        smsCount,
        avgDailySpend,
        plan,
      },
      transactions: formattedTransactions,
      invoices,
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


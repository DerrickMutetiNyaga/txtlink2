/**
 * Super Admin M-Pesa Transactions API
 * GET /api/super-admin/mpesa-transactions
 * 
 * Query parameters:
 * - page: number (default: 1)
 * - limit: number (default: 50)
 * - status: string (pending|success|failed|cancelled|timeout)
 * - transactionType: string (STK|C2B)
 * - phoneNumber: string
 * - startDate: string (ISO date)
 * - endDate: string (ISO date)
 * - search: string (search in account reference, transaction ID, receipt number)
 */

import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db/connect'
import { MpesaTransaction } from '@/lib/db/models'
import { requireOwner } from '@/lib/auth/middleware'

export async function GET(request: NextRequest) {
  try {
    await connectDB()
    requireOwner(request)

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)
    const skip = (page - 1) * limit

    const status = searchParams.get('status')
    const transactionType = searchParams.get('transactionType')
    const phoneNumber = searchParams.get('phoneNumber')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const search = searchParams.get('search')

    // Build query
    const query: any = {}

    if (status) {
      query.status = status
    }

    if (transactionType) {
      query.transactionType = transactionType
    }

    if (phoneNumber) {
      query.phoneNumber = { $regex: phoneNumber, $options: 'i' }
    }

    if (startDate || endDate) {
      query.createdAt = {}
      if (startDate) {
        query.createdAt.$gte = new Date(startDate)
      }
      if (endDate) {
        query.createdAt.$lte = new Date(endDate)
      }
    }

    if (search) {
      query.$or = [
        { accountReference: { $regex: search, $options: 'i' } },
        { transactionId: { $regex: search, $options: 'i' } },
        { checkoutRequestId: { $regex: search, $options: 'i' } },
        { merchantRequestId: { $regex: search, $options: 'i' } },
        { mpesaReceiptNumber: { $regex: search, $options: 'i' } },
      ]
    }

    // Get transactions
    const [transactions, total] = await Promise.all([
      MpesaTransaction.find(query)
        .populate('userId', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      MpesaTransaction.countDocuments(query),
    ])

    return NextResponse.json({
      success: true,
      data: transactions,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    })
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message.includes('Forbidden')) {
      return NextResponse.json(
        { error: error.message },
        { status: error.message.includes('Forbidden') ? 403 : 401 }
      )
    }
    console.error('M-Pesa transactions GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}


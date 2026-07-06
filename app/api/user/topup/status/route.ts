/**
 * Check STK Push payment status
 * GET /api/user/topup/status?checkoutRequestId=xxx
 */

import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db/connect'
import { MpesaTransaction } from '@/lib/db/models'
import { requireAuth } from '@/lib/auth/middleware'

export async function GET(request: NextRequest) {
  try {
    await connectDB()
    const authUser = requireAuth(request)

    const { searchParams } = new URL(request.url)
    const checkoutRequestId = searchParams.get('checkoutRequestId')
    const transactionId = searchParams.get('transactionId')

    if (!checkoutRequestId && !transactionId) {
      return NextResponse.json(
        { error: 'checkoutRequestId or transactionId is required' },
        { status: 400 }
      )
    }

    // Find transaction
    const query: any = {}
    if (checkoutRequestId) {
      query.checkoutRequestId = checkoutRequestId
    }
    if (transactionId) {
      query._id = transactionId
    }

    const transaction = await MpesaTransaction.findOne(query)

    if (!transaction) {
      return NextResponse.json(
        { error: 'Transaction not found' },
        { status: 404 }
      )
    }

    // Verify user owns this transaction
    if (transaction.userId?.toString() !== authUser.userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    // Map status to user-friendly messages
    const statusMessages: Record<string, { message: string; userFriendly: string }> = {
      pending: {
        message: 'Payment is pending. Please complete the payment on your phone.',
        userFriendly: 'Waiting for payment confirmation...',
      },
      success: {
        message: 'Payment successful! Your account has been credited.',
        userFriendly: 'Payment completed successfully',
      },
      failed: {
        message: transaction.resultDesc || 'Payment failed. Please try again.',
        userFriendly: 'Payment failed',
      },
      cancelled: {
        message: 'Payment was cancelled. You can try again.',
        userFriendly: 'Payment cancelled',
      },
      timeout: {
        message: 'Payment request timed out. Please try again.',
        userFriendly: 'Payment timeout',
      },
    }

    const statusInfo = statusMessages[transaction.status] || {
      message: transaction.resultDesc || 'Unknown status',
      userFriendly: transaction.status || 'Unknown',
    }

    return NextResponse.json({
      success: true,
      status: transaction.status,
      message: statusInfo.message,
      userFriendly: statusInfo.userFriendly,
      amount: transaction.amount,
      mpesaReceiptNumber: transaction.mpesaReceiptNumber,
      resultDesc: transaction.resultDesc,
      responseCode: transaction.responseCode,
      createdAt: transaction.createdAt,
      updatedAt: transaction.updatedAt,
    })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Payment status check error:', error)
    return NextResponse.json(
      { error: 'Failed to check payment status' },
      { status: 500 }
    )
  }
}


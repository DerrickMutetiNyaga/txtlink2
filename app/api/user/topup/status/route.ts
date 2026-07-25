/**
 * Check STK Push payment status
 * GET /api/user/topup/status?checkoutRequestId=xxx
 *
 * When still pending, actively queries M-Pesa (in case the callback was missed).
 */

import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db/connect'
import { MpesaTransaction } from '@/lib/db/models'
import { requireAuth } from '@/lib/auth/middleware'
import { refreshPendingStkTransaction } from '@/lib/services/mpesa/process-stk-payment'

function buildStatusResponse(transaction: InstanceType<typeof MpesaTransaction>) {
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

  const invoiceMessages: Record<string, { message: string; userFriendly: string }> = {
    pending: {
      message: 'Payment is pending. Please complete the payment on your phone.',
      userFriendly: 'Waiting for invoice payment confirmation...',
    },
    success: {
      message: 'Payment successful! Your Sender ID application will now enter review.',
      userFriendly: 'Invoice paid successfully',
    },
    failed: {
      message: transaction.resultDesc || 'Payment failed. Please try again.',
      userFriendly: 'Invoice payment failed',
    },
    cancelled: {
      message: 'Payment was cancelled. You can try again from Billing.',
      userFriendly: 'Payment cancelled',
    },
    timeout: {
      message: 'Payment request timed out. Please try again.',
      userFriendly: 'Payment timeout',
    },
  }

  const statusInfo =
    transaction.paymentType === 'sender_id_application'
      ? invoiceMessages[transaction.status] || {
          message: transaction.resultDesc || 'Unknown status',
          userFriendly: transaction.status || 'Unknown',
        }
      : statusMessages[transaction.status] || {
          message: transaction.resultDesc || 'Unknown status',
          userFriendly: transaction.status || 'Unknown',
        }

  return {
    success: true,
    status: transaction.status,
    message: statusInfo.message,
    userFriendly: statusInfo.userFriendly,
    amount: transaction.amount,
    mpesaReceiptNumber: transaction.mpesaReceiptNumber,
    resultDesc: transaction.resultDesc,
    responseCode: transaction.responseCode,
    paymentType: transaction.paymentType || 'sms_topup',
    billingInvoiceId: transaction.billingInvoiceId?.toString(),
    createdAt: transaction.createdAt,
    updatedAt: transaction.updatedAt,
  }
}

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

    const query: Record<string, string> = {}
    if (checkoutRequestId) {
      query.checkoutRequestId = checkoutRequestId
    }
    if (transactionId) {
      query._id = transactionId
    }

    let transaction = await MpesaTransaction.findOne(query)

    if (!transaction) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })
    }

    if (transaction.userId?.toString() !== authUser.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Actively check M-Pesa when callback may not have reached our server
    if (transaction.status === 'pending' && transaction.checkoutRequestId) {
      await refreshPendingStkTransaction(transaction)
      transaction = await MpesaTransaction.findById(transaction._id)
      if (!transaction) {
        return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })
      }
    }

    return NextResponse.json(buildStatusResponse(transaction))
  } catch (error: unknown) {
    const err = error as { message?: string }
    if (err.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Payment status check error:', error)
    return NextResponse.json({ error: 'Failed to check payment status' }, { status: 500 })
  }
}

/**
 * Pay a billing invoice via M-Pesa STK Push
 * POST /api/user/billing/invoices/[invoiceId]/pay
 */

import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db/connect'
import { Invoice, MpesaTransaction, SenderIdRequest, User } from '@/lib/db/models'
import { requireAuth } from '@/lib/auth/middleware'
import { MpesaService } from '@/lib/services/mpesa/mpesa-service'
import mongoose from 'mongoose'

type RouteContext = { params: Promise<{ invoiceId: string }> }

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    await connectDB()
    const authUser = requireAuth(request)
    const { invoiceId } = await context.params
    const userId = new mongoose.Types.ObjectId(authUser.userId)
    const { phoneNumber } = await request.json()

    if (!phoneNumber || typeof phoneNumber !== 'string') {
      return NextResponse.json({ error: 'phoneNumber is required' }, { status: 400 })
    }

    const invoice = await Invoice.findOne({
      _id: new mongoose.Types.ObjectId(invoiceId),
      userId,
    })

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }

    if (invoice.status === 'paid') {
      return NextResponse.json({ error: 'This invoice has already been paid' }, { status: 400 })
    }

    if (invoice.status === 'cancelled') {
      return NextResponse.json({ error: 'This invoice has been cancelled' }, { status: 400 })
    }

    if (invoice.status === 'pending_payment') {
      const recentPending = await MpesaTransaction.findOne({
        billingInvoiceId: invoice._id,
        status: 'pending',
        createdAt: { $gte: new Date(Date.now() - 5 * 60 * 1000) },
      }).lean()

      if (recentPending) {
        return NextResponse.json(
          {
            error: 'A payment is already in progress for this invoice. Please complete it on your phone or wait a few minutes.',
            checkoutRequestId: recentPending.checkoutRequestId,
            transactionId: recentPending._id?.toString(),
          },
          { status: 409 }
        )
      }
    }

    if (!['unpaid', 'failed', 'pending_payment'].includes(invoice.status)) {
      return NextResponse.json({ error: 'Invoice cannot be paid in its current state' }, { status: 400 })
    }

    const userDoc = await User.findById(userId)
    if (!userDoc) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const mpesaService = await MpesaService.createFromSettings()
    if (!mpesaService) {
      return NextResponse.json(
        { error: 'M-Pesa gateway is not configured. Please contact support.' },
        { status: 503 }
      )
    }

    const accountReference = `INV-${invoice._id?.toString()}`
    const stkResponse = await mpesaService.initiateStkPush({
      phoneNumber,
      amount: invoice.amount,
      accountReference,
      transactionDesc: invoice.description,
    })

    invoice.status = 'pending_payment'
    invoice.phoneNumber = phoneNumber
    invoice.mpesaCheckoutRequestId = stkResponse.checkoutRequestId
    invoice.mpesaMerchantRequestId = stkResponse.merchantRequestId
    invoice.failureReason = undefined
    invoice.failedAt = undefined
    await invoice.save()

    const mpesaTransaction = await MpesaTransaction.create({
      transactionType: 'STK',
      paymentType: 'sender_id_application',
      checkoutRequestId: stkResponse.checkoutRequestId,
      merchantRequestId: stkResponse.merchantRequestId,
      amount: invoice.amount,
      phoneNumber,
      accountReference,
      status: 'pending',
      responseCode: stkResponse.responseCode,
      resultDesc: stkResponse.responseDescription,
      userId,
      billingInvoiceId: invoice._id,
      senderIdRequestId: invoice.senderIdRequestId,
    })

    if (invoice.senderIdRequestId) {
      await SenderIdRequest.findByIdAndUpdate(invoice.senderIdRequestId, {
        status: 'payment_pending',
      })
    }

    return NextResponse.json({
      success: true,
      message:
        stkResponse.customerMessage ||
        'STK Push request sent. Please check your phone and enter your M-Pesa PIN.',
      checkoutRequestId: stkResponse.checkoutRequestId,
      merchantRequestId: stkResponse.merchantRequestId,
      transactionId: mpesaTransaction._id.toString(),
      status: 'pending',
      paymentType: 'sender_id_application',
      invoiceId: invoice._id?.toString(),
      senderIdRequestId: invoice.senderIdRequestId?.toString(),
    })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Invoice M-Pesa payment error:', error)
    return NextResponse.json(
      {
        error: error.message || 'Failed to initiate M-Pesa payment. Please try again.',
      },
      { status: 500 }
    )
  }
}

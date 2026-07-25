/**
 * M-Pesa STK Push Callback Handler
 * POST /api/mpesa/stk-callback
 */

import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db/connect'
import { MpesaTransaction } from '@/lib/db/models'
import { processStkPaymentResult } from '@/lib/services/mpesa/process-stk-payment'

export async function POST(request: NextRequest) {
  try {
    await connectDB()

    const body = await request.json()
    const stkCallback = body.Body?.stkCallback

    if (!stkCallback) {
      console.error('Invalid STK callback structure:', body)
      return NextResponse.json({ ResultCode: 1, ResultDesc: 'Invalid callback structure' }, { status: 400 })
    }

    const { CheckoutRequestID, ResultCode, ResultDesc, CallbackMetadata } = stkCallback

    const mpesaTransaction = await MpesaTransaction.findOne({
      checkoutRequestId: CheckoutRequestID,
    })

    if (!mpesaTransaction) {
      console.error('M-Pesa transaction not found:', CheckoutRequestID)
      return NextResponse.json({ ResultCode: 1, ResultDesc: 'Transaction not found' }, { status: 404 })
    }

    let mpesaReceiptNumber: string | undefined
    let amount: number | undefined

    if (ResultCode === 0 && CallbackMetadata?.Item) {
      for (const item of CallbackMetadata.Item) {
        if (item.Name === 'MpesaReceiptNumber') {
          mpesaReceiptNumber = item.Value
        }
        if (item.Name === 'Amount') {
          amount = parseFloat(item.Value)
        }
      }
    }

    const status = await processStkPaymentResult({
      mpesaTransaction,
      resultCode: ResultCode,
      resultDesc: ResultDesc,
      mpesaReceiptNumber,
      amount,
      checkoutRequestId: CheckoutRequestID,
      rawResponse: body,
    })

    console.log('STK Callback processed:', {
      checkoutRequestId: CheckoutRequestID,
      status,
      resultCode: ResultCode,
      mpesaReceiptNumber,
      amount,
    })

    return NextResponse.json({
      ResultCode: 0,
      ResultDesc: 'Callback processed successfully',
    })
  } catch (error) {
    console.error('STK callback error:', error)
    return NextResponse.json({
      ResultCode: 0,
      ResultDesc: 'Callback received',
    })
  }
}

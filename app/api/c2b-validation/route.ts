/**
 * M-Pesa C2B Validation Handler
 * POST /api/c2b-validation
 */

import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db/connect'
import { MpesaTransaction } from '@/lib/db/models'
import {
  c2bPhoneOrUnknown,
  normalizeC2bPayload,
  readC2bRequestBody,
} from '@/lib/services/mpesa/parse-c2b-payload'

export async function GET() {
  return NextResponse.json({
    success: true,
    message: 'TXTLINK C2B validation URL is active',
  })
}

export async function POST(request: NextRequest) {
  try {
    await connectDB()
    const rawBody = await readC2bRequestBody(request)
    const parsed = normalizeC2bPayload(rawBody)
    const { transId: TransID, transAmount: TransAmount, msisdn: MSISDN, billRefNumber, invoiceNumber } =
      parsed

    console.log('C2B Validation received:', {
      TransID,
      TransAmount,
      BillRefNumber: billRefNumber,
    })

    const existingTransaction = await MpesaTransaction.findOne({
      transactionId: TransID,
    })

    if (existingTransaction) {
      return NextResponse.json({
        ResultCode: 0,
        ResultDesc: 'Accepted (duplicate)',
      })
    }

    await MpesaTransaction.create({
      transactionType: 'C2B',
      transactionId: TransID || `C2B-${Date.now()}`,
      amount: parseFloat(TransAmount) || 0,
      phoneNumber: c2bPhoneOrUnknown(MSISDN),
      accountReference: billRefNumber || invoiceNumber || 'C2B-PAYMENT',
      status: 'pending',
      rawResponse: parsed.raw,
    })

    return NextResponse.json({
      ResultCode: 0,
      ResultDesc: 'Accepted',
    })
  } catch (error: any) {
    console.error('C2B validation error:', error)
    // Do not reject the payment — confirmation can still credit the user
    return NextResponse.json({
      ResultCode: 0,
      ResultDesc: 'Accepted',
    })
  }
}

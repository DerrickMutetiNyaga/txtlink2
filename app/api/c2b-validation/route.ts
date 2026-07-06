/**
 * M-Pesa C2B Validation Handler
 * POST /api/c2b-validation
 * 
 * This endpoint validates C2B payments before they are processed
 */

import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db/connect'
import { MpesaTransaction } from '@/lib/db/models'

export async function POST(request: NextRequest) {
  try {
    await connectDB()

    const body = await request.json()
    
    // M-Pesa C2B validation structure
    const {
      TransactionType,
      TransID,
      TransTime,
      TransAmount,
      BusinessShortCode,
      BillRefNumber,
      InvoiceNumber,
      OrgAccountBalance,
      ThirdPartyTransID,
      MSISDN,
      FirstName,
      MiddleName,
      LastName,
    } = body

    // Log the validation request
    console.log('C2B Validation received:', {
      TransactionType,
      TransID,
      TransAmount,
      MSISDN,
      BillRefNumber,
    })

    // Check for duplicate transaction
    const existingTransaction = await MpesaTransaction.findOne({
      transactionId: TransID,
    })

    if (existingTransaction) {
      console.log('Duplicate C2B transaction detected:', TransID)
      // Accept but mark as duplicate
      return NextResponse.json({
        ResultCode: 0,
        ResultDesc: 'Accepted (duplicate)',
      })
    }

    // Create pending transaction record
    await MpesaTransaction.create({
      transactionType: 'C2B',
      transactionId: TransID,
      amount: parseFloat(TransAmount),
      phoneNumber: MSISDN,
      accountReference: BillRefNumber || InvoiceNumber || 'C2B-PAYMENT',
      status: 'pending',
      rawResponse: body,
    })

    // Accept the transaction (M-Pesa will then send confirmation)
    return NextResponse.json({
      ResultCode: 0,
      ResultDesc: 'Accepted',
    })
  } catch (error: any) {
    console.error('C2B validation error:', error)
    // Reject the transaction on error
    return NextResponse.json({
      ResultCode: 1,
      ResultDesc: 'Validation failed',
    })
  }
}


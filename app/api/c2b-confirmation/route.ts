/**
 * M-Pesa C2B Confirmation Handler
 * POST /api/c2b-confirmation
 *
 * This endpoint confirms and processes C2B PayBill payments
 * Handles both PayBill and Buy Goods transactions
 */

import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db/connect'
import { MpesaTransaction } from '@/lib/db/models'
import { findUserIdForC2bPayment } from '@/lib/services/mpesa/match-c2b-user'
import { creditC2bTransactionToUser } from '@/lib/services/mpesa/credit-c2b-payment'
import {
  c2bPhoneOrUnknown,
  normalizeC2bPayload,
  readC2bRequestBody,
} from '@/lib/services/mpesa/parse-c2b-payload'

export async function GET() {
  return NextResponse.json({
    success: true,
    message: 'TXTLINK C2B confirmation URL is active',
  })
}

export async function POST(request: NextRequest) {
  try {
    await connectDB()

    const rawBody = await readC2bRequestBody(request)
    const parsed = normalizeC2bPayload(rawBody)
    const {
      transactionType: TransactionType,
      transId: TransID,
      transAmount: TransAmount,
      businessShortCode: BusinessShortCode,
      billRefNumber: BillRefNumber,
      invoiceNumber: InvoiceNumber,
      msisdn: MSISDN,
    } = parsed

    console.log('C2B Confirmation received (PayBill):', {
      TransactionType,
      TransID,
      TransAmount,
      BusinessShortCode,
      BillRefNumber,
      InvoiceNumber,
      MSISDN: MSISDN ? `${MSISDN.substring(0, 8)}...` : 'N/A',
    })

    const existingTransaction = await MpesaTransaction.findOne({
      transactionId: TransID,
    })

    let mpesaTransaction = existingTransaction
    const accountReference = BillRefNumber || InvoiceNumber || 'C2B-PAYMENT'
    const modelTransactionType = 'C2B'

    if (!mpesaTransaction) {
      mpesaTransaction = await MpesaTransaction.create({
        transactionType: modelTransactionType,
        transactionId: TransID,
        amount: parseFloat(TransAmount),
        phoneNumber: c2bPhoneOrUnknown(MSISDN),
        accountReference: accountReference,
        status: 'success',
        responseCode: '0',
        resultDesc: 'Payment confirmed',
        mpesaReceiptNumber: TransID,
        rawResponse: parsed.raw,
      })
    } else {
      mpesaTransaction.status = 'success'
      mpesaTransaction.responseCode = '0'
      mpesaTransaction.resultDesc = 'Payment confirmed'
      mpesaTransaction.mpesaReceiptNumber = TransID
      mpesaTransaction.accountReference = accountReference
      mpesaTransaction.rawResponse = parsed.raw
      await mpesaTransaction.save()
    }

    const userId = await findUserIdForC2bPayment({
      billRefNumber: BillRefNumber,
      invoiceNumber: InvoiceNumber,
      msisdn: MSISDN,
    })

    if (userId) {
      try {
        await creditC2bTransactionToUser({
          mpesaTransaction,
          userId,
          transId: TransID,
          billRefNumber: BillRefNumber,
          transactionType: TransactionType || 'C2B',
          businessShortCode: BusinessShortCode,
        })
      } catch (error: any) {
        console.error('Error processing PayBill payment:', {
          error: error.message,
          stack: error.stack,
          TransID,
          BillRefNumber,
          userId,
        })
      }
    } else {
      console.warn('No user matched for PayBill payment:', {
        TransID,
        BillRefNumber,
        InvoiceNumber,
        TransactionType,
        message:
          'Payment received but no user matched. Credits go to the account whose PayBill account number was entered, or whose profile phone is the paying M-Pesa number.',
      })
    }

    return NextResponse.json({
      ResultCode: 0,
      ResultDesc: 'Confirmation processed successfully',
    })
  } catch (error: any) {
    console.error('C2B confirmation error:', error)
    return NextResponse.json({
      ResultCode: 0,
      ResultDesc: 'Confirmation received',
    })
  }
}

/**
 * M-Pesa C2B Confirmation Handler
 * POST /api/c2b-confirmation
 * 
 * This endpoint confirms and processes C2B PayBill payments
 * Handles both PayBill and Buy Goods transactions
 */

import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db/connect'
import { MpesaTransaction, Transaction, User } from '@/lib/db/models'
import { convertKesToCredits } from '@/lib/utils/credits'
import { resolvePricePerCreditKes } from '@/lib/utils/resolve-price-per-credit'
import { topupProfitMetadata } from '@/lib/services/profit'
import { queueLowBalanceAlertSync } from '@/lib/services/sms/low-balance-alert'
import { findUserIdForC2bPayment } from '@/lib/services/mpesa/match-c2b-user'
import { ensureUserPaybillAccount } from '@/lib/services/mpesa/allocate-paybill-account'
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

    // Credits are keyed by M-Pesa TransID. If this receipt already became a top-up,
    // do not add money again (Safaricom may retry the same confirmation).
    const existingLedger = TransID
      ? await Transaction.findOne({ reference: TransID, type: 'top-up' })
      : null
    if (existingLedger) {
      console.log('Duplicate C2B transaction detected (already credited):', TransID)
      return NextResponse.json({
        ResultCode: 0,
        ResultDesc: 'Transaction already processed',
      })
    }

    const existingTransaction = await MpesaTransaction.findOne({
      transactionId: TransID,
    })

    // Find or create the transaction
    let mpesaTransaction = existingTransaction

    // Use BillRefNumber as account reference (PayBill account number)
    const accountReference = BillRefNumber || InvoiceNumber || 'C2B-PAYMENT'
    
    // Map M-Pesa TransactionType to model enum value
    // Model only accepts 'STK' or 'C2B', but M-Pesa sends 'Pay Bill', 'Buy Goods', etc.
    // All C2B variants (PayBill, Buy Goods) map to 'C2B'
    const modelTransactionType = 'C2B' // Always use 'C2B' for C2B confirmation endpoint
    
    if (!mpesaTransaction) {
      // Create new transaction record
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
      // Update existing transaction
      mpesaTransaction.status = 'success'
      mpesaTransaction.responseCode = '0'
      mpesaTransaction.resultDesc = 'Payment confirmed'
      mpesaTransaction.mpesaReceiptNumber = TransID
      mpesaTransaction.accountReference = accountReference
      mpesaTransaction.rawResponse = parsed.raw
      await mpesaTransaction.save()
    }

    // Match user by PayBill account number (last 5/4 of phone, or unique fallback)
    const userId = await findUserIdForC2bPayment({
      billRefNumber: BillRefNumber,
      invoiceNumber: InvoiceNumber,
      msisdn: MSISDN,
    })

    // Process payment if user found
    if (userId) {
      try {
        const userDoc = await User.findById(userId)

        if (userDoc) {
          await ensureUserPaybillAccount(userId, userDoc.phone)
          const amountKes = mpesaTransaction.amount
          const pricePerCreditKes = await resolvePricePerCreditKes(String(userId))

          const { creditsToAdd } = convertKesToCredits({
            paidKes: amountKes,
            pricePerCreditKes,
          })

          if (creditsToAdd > 0) {
            const reference = TransID || `MPESA-C2B-${Date.now()}`
            const previousBalanceRaw =
              typeof userDoc.creditsBalance === 'number' ? userDoc.creditsBalance : 0
            const safeStartingBalance = Math.max(0, previousBalanceRaw)

            try {
              const profitMeta = await topupProfitMetadata({
                paidKes: amountKes,
                credits: creditsToAdd,
                sellingPriceKes: pricePerCreditKes,
              })
              await Transaction.create({
                userId,
                type: 'top-up',
                amount: amountKes,
                description: `M-Pesa ${TransactionType || 'PayBill'} payment: ${creditsToAdd} SMS credits @ KSh ${pricePerCreditKes.toFixed(2)} per credit`,
                reference,
                status: 'completed',
                metadata: {
                  currency: 'KES',
                  amountKes,
                  creditsAdded: creditsToAdd,
                  pricePerCreditKes,
                  mpesaReceiptNumber: TransID,
                  transactionType: TransactionType || 'C2B',
                  businessShortCode: BusinessShortCode,
                  billRefNumber: BillRefNumber,
                  ...profitMeta,
                },
              })

              const updatedUser = await User.findByIdAndUpdate(
                userId,
                { $inc: { creditsBalance: creditsToAdd } },
                { new: true }
              )
              const newBalance =
                typeof updatedUser?.creditsBalance === 'number'
                  ? updatedUser.creditsBalance
                  : safeStartingBalance + creditsToAdd
              queueLowBalanceAlertSync(userId, newBalance)

              mpesaTransaction.invoiceId = reference
              mpesaTransaction.userId = userId
              await mpesaTransaction.save()

              console.log(`✅ PayBill payment processed successfully:`, {
                userId: userDoc._id,
                userEmail: userDoc.email,
                transactionId: TransID,
                billRefNumber: BillRefNumber,
                amountKes,
                creditsToAdd,
                previousBalance: safeStartingBalance,
                newBalance,
                transactionType: TransactionType,
              })
            } catch (error: any) {
              if (error?.code === 11000) {
                console.log('Transaction record already exists for TransID:', TransID)
              } else {
                throw error
              }
            }
          } else {
            console.warn('No credits to add for payment:', {
              amountKes,
              pricePerCreditKes,
              TransID,
            })
          }
        } else {
          console.warn('User not found for userId:', userId)
        }
      } catch (error: any) {
        console.error('Error processing PayBill payment:', {
          error: error.message,
          stack: error.stack,
          TransID,
          BillRefNumber,
          userId,
        })
        // Don't fail the callback, just log the error
        // M-Pesa expects success response even if processing fails
      }
    } else {
      console.warn('⚠️ No user matched for PayBill payment:', {
        TransID,
        BillRefNumber,
        InvoiceNumber,
        TransactionType,
        message: 'Payment received but no user matched. Credits go to the account whose PayBill account number was entered, or whose profile phone is the paying M-Pesa number.',
      })
      // Still return success to M-Pesa - we'll handle unmatched payments manually
    }

    // Return success response to M-Pesa
    return NextResponse.json({
      ResultCode: 0,
      ResultDesc: 'Confirmation processed successfully',
    })
  } catch (error: any) {
    console.error('C2B confirmation error:', error)
    // Still return success to M-Pesa to prevent retries
    return NextResponse.json({
      ResultCode: 0,
      ResultDesc: 'Confirmation received',
    })
  }
}


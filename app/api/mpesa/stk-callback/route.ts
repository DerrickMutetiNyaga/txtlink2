/**
 * M-Pesa STK Push Callback Handler
 * POST /api/mpesa/stk-callback
 * 
 * This endpoint receives callbacks from M-Pesa after STK Push payment
 */

import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db/connect'
import { MpesaTransaction, Transaction, User } from '@/lib/db/models'
import { convertKesToCredits, getEffectivePricePerCreditKes } from '@/lib/utils/credits'
import mongoose from 'mongoose'

export async function POST(request: NextRequest) {
  try {
    await connectDB()

    const body = await request.json()
    
    // M-Pesa STK callback structure
    const stkCallback = body.Body?.stkCallback
    if (!stkCallback) {
      console.error('Invalid STK callback structure:', body)
      return NextResponse.json({ ResultCode: 1, ResultDesc: 'Invalid callback structure' }, { status: 400 })
    }

    const {
      MerchantRequestID,
      CheckoutRequestID,
      ResultCode,
      ResultDesc,
      CallbackMetadata,
    } = stkCallback

    // Find existing transaction by checkout request ID
    let mpesaTransaction = await MpesaTransaction.findOne({
      checkoutRequestId: CheckoutRequestID,
    })

    if (!mpesaTransaction) {
      console.error('M-Pesa transaction not found:', CheckoutRequestID)
      return NextResponse.json({ ResultCode: 1, ResultDesc: 'Transaction not found' }, { status: 404 })
    }

    // Update transaction status with better error handling
    let status: 'pending' | 'success' | 'failed' | 'cancelled' | 'timeout' = 'pending'
    let mpesaReceiptNumber: string | undefined
    let amount: number | undefined
    let errorMessage: string | undefined

    if (ResultCode === 0) {
      // Success
      status = 'success'
      
      // Extract receipt number and amount from callback metadata
      if (CallbackMetadata?.Item) {
        for (const item of CallbackMetadata.Item) {
          if (item.Name === 'MpesaReceiptNumber') {
            mpesaReceiptNumber = item.Value
          }
          if (item.Name === 'Amount') {
            amount = parseFloat(item.Value)
          }
        }
      }
    } else if (ResultCode === 1032) {
      status = 'cancelled'
      errorMessage = 'Payment was cancelled by user. Please try again.'
    } else if (ResultCode === 1037) {
      status = 'timeout'
      errorMessage = 'Payment request timed out. Please try again.'
    } else {
      status = 'failed'
      // Map common M-Pesa error codes to user-friendly messages
      const errorMessages: Record<number, string> = {
        1: 'The initiator information is invalid.',
        2: 'The subscriber information is invalid.',
        3: 'The subscriber is not on the network.',
        4: 'The subscriber has insufficient funds.',
        5: 'The subscriber has exceeded the transaction limit.',
        6: 'The transaction has already been processed.',
        7: 'The transaction has been reversed.',
        8: 'The transaction has been declined.',
        17: 'The transaction could not be processed. Please try again.',
        20: 'Invalid request. Please check your details and try again.',
        26: 'The transaction could not be completed. Please try again.',
      }
      errorMessage = errorMessages[ResultCode] || ResultDesc || 'Payment failed. Please try again.'
    }

    // Update M-Pesa transaction with enhanced error information
    mpesaTransaction.status = status
    mpesaTransaction.responseCode = ResultCode?.toString()
    mpesaTransaction.resultDesc = errorMessage || ResultDesc || 'Unknown error'
    mpesaTransaction.mpesaReceiptNumber = mpesaReceiptNumber
    mpesaTransaction.rawResponse = body
    if (amount) {
      mpesaTransaction.amount = amount
    }
    await mpesaTransaction.save()

    // Log transaction status for debugging
    console.log(`STK Callback processed:`, {
      checkoutRequestId: CheckoutRequestID,
      status,
      resultCode: ResultCode,
      resultDesc: errorMessage || ResultDesc,
      mpesaReceiptNumber,
      amount,
    })

    // If payment was successful, process the top-up
    if (status === 'success' && mpesaTransaction.userId) {
      try {
        const userId = new mongoose.Types.ObjectId(mpesaTransaction.userId)
        const userDoc = await User.findById(userId)

        if (userDoc) {
          const amountKes = mpesaTransaction.amount
          const pricePerCreditKes = getEffectivePricePerCreditKes()

          const { creditsToAdd } = convertKesToCredits({
            paidKes: amountKes,
            pricePerCreditKes,
          })

          if (creditsToAdd > 0) {
            // Update user balance
            const currentBalanceRaw =
              typeof userDoc.creditsBalance === 'number' ? userDoc.creditsBalance : 0
            const safeStartingBalance = Math.max(0, currentBalanceRaw)
            const finalBalance = safeStartingBalance + creditsToAdd

            await User.findByIdAndUpdate(
              userId,
              { creditsBalance: finalBalance },
              { new: false }
            )

            // Create transaction record
            const reference = mpesaReceiptNumber || `MPESA-${Date.now()}`
            
            // Check if transaction already exists
            const existingTransaction = await Transaction.findOne({ reference })
            if (!existingTransaction) {
              await Transaction.create({
                userId,
                type: 'top-up',
                amount: amountKes,
                description: `M-Pesa top-up: ${creditsToAdd} SMS credits @ KSh ${pricePerCreditKes.toFixed(2)} per credit`,
                reference,
                status: 'completed',
                metadata: {
                  currency: 'KES',
                  amountKes,
                  creditsAdded: creditsToAdd,
                  pricePerCreditKes,
                  mpesaReceiptNumber,
                  checkoutRequestId: CheckoutRequestID,
                },
              })
            }

            // Update M-Pesa transaction with invoice ID
            mpesaTransaction.invoiceId = reference
            await mpesaTransaction.save()

            console.log(`Top-up successful for user ${userDoc.email}:`, {
              userId: userDoc._id,
              amountKes,
              creditsToAdd,
              newBalance: finalBalance,
              mpesaReceiptNumber,
            })
          }
        }
      } catch (error: any) {
        console.error('Error processing successful payment:', error)
        // Don't fail the callback, just log the error
      }
    }

    // Return success response to M-Pesa
    return NextResponse.json({
      ResultCode: 0,
      ResultDesc: 'Callback processed successfully',
    })
  } catch (error: any) {
    console.error('STK callback error:', error)
    // Still return success to M-Pesa to prevent retries
    return NextResponse.json({
      ResultCode: 0,
      ResultDesc: 'Callback received',
    })
  }
}


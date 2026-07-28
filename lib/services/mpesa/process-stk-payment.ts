/**
 * Process STK Push payment result (from callback or status query).
 * Idempotent — safe to call multiple times for the same payment.
 */

import mongoose from 'mongoose'
import { MpesaTransaction, Transaction, User } from '@/lib/db/models'
import { convertKesToCredits, resolvePricePerCreditKes } from '@/lib/utils/credits'
import {
  completeSenderIdInvoicePayment,
  markInvoicePaymentFailed,
} from '@/lib/services/billing/invoice-payment'

export type StkPaymentStatus = 'pending' | 'success' | 'failed' | 'cancelled' | 'timeout'

const STK_ERROR_MESSAGES: Record<number, string> = {
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

/** M-Pesa codes that mean the payment is still in progress — do not mark failed yet */
const STK_PENDING_RESULT_CODES = new Set([4999, 5000, 5001])

export function resolveStkPaymentStatus(resultCode: number): {
  status: StkPaymentStatus
  errorMessage?: string
} {
  if (resultCode === 0) {
    return { status: 'success' }
  }
  if (resultCode === 1032) {
    return { status: 'cancelled', errorMessage: 'Payment was cancelled by user. Please try again.' }
  }
  if (resultCode === 1037) {
    return { status: 'timeout', errorMessage: 'Payment request timed out. Please try again.' }
  }
  if (STK_PENDING_RESULT_CODES.has(resultCode)) {
    return { status: 'pending' }
  }
  return {
    status: 'failed',
    errorMessage: STK_ERROR_MESSAGES[resultCode] || 'Payment failed. Please try again.',
  }
}

export interface ProcessStkPaymentInput {
  mpesaTransaction: InstanceType<typeof MpesaTransaction>
  resultCode: number
  resultDesc?: string
  mpesaReceiptNumber?: string
  amount?: number
  checkoutRequestId?: string
  rawResponse?: Record<string, unknown>
}

export async function processStkPaymentResult(
  input: ProcessStkPaymentInput
): Promise<StkPaymentStatus> {
  const {
    mpesaTransaction,
    resultCode,
    resultDesc,
    mpesaReceiptNumber,
    amount,
    checkoutRequestId,
    rawResponse,
  } = input

  const { status, errorMessage } = resolveStkPaymentStatus(resultCode)

  if (status === 'pending') {
    return 'pending'
  }

  // Already completed — avoid double-processing credits
  if (
    mpesaTransaction.status === 'success' &&
    (status === 'success' || status === 'failed' || status === 'cancelled' || status === 'timeout')
  ) {
    return mpesaTransaction.status as StkPaymentStatus
  }

  mpesaTransaction.status = status
  mpesaTransaction.responseCode = resultCode.toString()
  mpesaTransaction.resultDesc = errorMessage || resultDesc || 'Unknown error'
  if (mpesaReceiptNumber) {
    mpesaTransaction.mpesaReceiptNumber = mpesaReceiptNumber
  }
  if (rawResponse) {
    mpesaTransaction.rawResponse = rawResponse
  }
  if (amount && amount > 0) {
    mpesaTransaction.amount = amount
  }
  await mpesaTransaction.save()

  if (status === 'success' && mpesaTransaction.userId) {
    const paymentType = mpesaTransaction.paymentType || 'sms_topup'

    if (paymentType === 'sender_id_application') {
      try {
        await completeSenderIdInvoicePayment({
          mpesaTransaction,
          mpesaReceiptNumber,
          checkoutRequestId,
        })
      } catch (error) {
        console.error('Error processing sender ID invoice payment:', error)
      }
    } else {
      try {
        const userId = new mongoose.Types.ObjectId(mpesaTransaction.userId)
        const userDoc = await User.findById(userId)

        if (userDoc) {
          const amountKes = mpesaTransaction.amount
          const pricePerCreditKes = await resolvePricePerCreditKes(String(userId))
          const { creditsToAdd } = convertKesToCredits({
            paidKes: amountKes,
            pricePerCreditKes,
          })

          if (creditsToAdd > 0) {
            const currentBalanceRaw =
              typeof userDoc.creditsBalance === 'number' ? userDoc.creditsBalance : 0
            const safeStartingBalance = Math.max(0, currentBalanceRaw)
            const finalBalance = safeStartingBalance + creditsToAdd

            await User.findByIdAndUpdate(userId, { creditsBalance: finalBalance }, { new: false })

            const reference =
              mpesaReceiptNumber ||
              mpesaTransaction.mpesaReceiptNumber ||
              `MPESA-STK-${checkoutRequestId || mpesaTransaction.checkoutRequestId || Date.now()}`

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
                  mpesaReceiptNumber: mpesaReceiptNumber || mpesaTransaction.mpesaReceiptNumber,
                  checkoutRequestId: checkoutRequestId || mpesaTransaction.checkoutRequestId,
                  paymentType: 'sms_topup',
                },
              })
            }

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
      } catch (error) {
        console.error('Error processing successful STK top-up:', error)
      }
    }
  } else if (status !== 'success' && mpesaTransaction.paymentType === 'sender_id_application') {
    try {
      await markInvoicePaymentFailed(
        mpesaTransaction.billingInvoiceId,
        errorMessage || resultDesc
      )
    } catch (error) {
      console.error('Error updating failed invoice payment:', error)
    }
  }

  return status
}

/**
 * Query M-Pesa for STK status when callback may not have arrived.
 */
export async function refreshPendingStkTransaction(
  mpesaTransaction: InstanceType<typeof MpesaTransaction>
): Promise<StkPaymentStatus> {
  if (mpesaTransaction.status !== 'pending' || !mpesaTransaction.checkoutRequestId) {
    return mpesaTransaction.status as StkPaymentStatus
  }

  const { MpesaService } = await import('@/lib/services/mpesa/mpesa-service')
  const mpesaService = await MpesaService.createFromSettings()
  if (!mpesaService) {
    return 'pending'
  }

  try {
    const queryResult = await mpesaService.queryStkPushStatus(mpesaTransaction.checkoutRequestId)

    if (queryResult.ResponseCode !== '0' && queryResult.ResponseCode !== 0) {
      console.warn('STK query API error:', queryResult)
      return 'pending'
    }

    const resultCode = Number(queryResult.ResultCode)
    if (Number.isNaN(resultCode)) {
      return 'pending'
    }

    return processStkPaymentResult({
      mpesaTransaction,
      resultCode,
      resultDesc: queryResult.ResultDesc,
      checkoutRequestId: mpesaTransaction.checkoutRequestId,
      rawResponse: queryResult,
    })
  } catch (error) {
    console.error('STK status query failed:', error)
    return 'pending'
  }
}

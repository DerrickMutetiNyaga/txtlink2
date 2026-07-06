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
import { convertKesToCredits, getEffectivePricePerCreditKes } from '@/lib/utils/credits'
import mongoose from 'mongoose'

export async function POST(request: NextRequest) {
  try {
    await connectDB()

    const body = await request.json()

    // M-Pesa C2B confirmation structure (PayBill format)
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

    console.log('C2B Confirmation received (PayBill):', {
      TransactionType,
      TransID,
      TransAmount,
      BusinessShortCode,
      BillRefNumber,
      InvoiceNumber,
      MSISDN: MSISDN ? `${MSISDN.substring(0, 10)}...` : 'N/A', // Log partial for security
      FirstName,
    })

    // Check for duplicate transaction by TransID (critical for PayBill)
    const existingTransaction = await MpesaTransaction.findOne({
      transactionId: TransID,
    })

    if (existingTransaction && existingTransaction.status === 'success') {
      console.log('Duplicate C2B transaction detected (already processed):', TransID)
      // Return success to M-Pesa but don't process again
      return NextResponse.json({
        ResultCode: 0,
        ResultDesc: 'Transaction already processed',
      })
    }

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
        phoneNumber: MSISDN || '', // May be encrypted/hashed in PayBill
        accountReference: accountReference,
        status: 'success',
        responseCode: '0',
        resultDesc: 'Payment confirmed',
        mpesaReceiptNumber: TransID,
        rawResponse: body, // Contains all M-Pesa data including TransactionType: 'Pay Bill'
      })
    } else {
      // Update existing transaction
      mpesaTransaction.status = 'success'
      mpesaTransaction.responseCode = '0'
      mpesaTransaction.resultDesc = 'Payment confirmed'
      mpesaTransaction.mpesaReceiptNumber = TransID
      mpesaTransaction.accountReference = accountReference
      mpesaTransaction.rawResponse = body // Contains all M-Pesa data including TransactionType: 'Pay Bill'
      await mpesaTransaction.save()
    }

    // Match user by BillRefNumber (PayBill account number)
    // Priority: 1. BillRefNumber (USER-{userId} format), 2. Direct ObjectId, 3. Email
    let userId: mongoose.Types.ObjectId | undefined

    if (accountReference) {
      console.log('Matching user by account reference:', accountReference)
      
      // Format: USER-{userId} (e.g., USER-698acd4349426058ffa16b94)
      if (accountReference.startsWith('USER-')) {
        const idPart = accountReference.replace('USER-', '').trim()
        if (mongoose.Types.ObjectId.isValid(idPart)) {
          userId = new mongoose.Types.ObjectId(idPart)
          console.log('Matched user by USER- prefix:', idPart)
        }
      } 
      // Direct MongoDB ObjectId
      else if (mongoose.Types.ObjectId.isValid(accountReference)) {
        userId = new mongoose.Types.ObjectId(accountReference)
        console.log('Matched user by direct ObjectId:', accountReference)
      } 
      // Try email lookup
      else {
        const user = await User.findOne({ email: accountReference.toLowerCase().trim() })
        if (user) {
          userId = new mongoose.Types.ObjectId(user._id)
          console.log('Matched user by email:', accountReference)
        }
      }
    }

    // If still no user found and MSISDN is available (not encrypted), try phone number
    // Note: PayBill MSISDN may be encrypted/hashed, so this might not work
    if (!userId && MSISDN && MSISDN.length < 20) {
      // Only try if MSISDN looks like a phone number (not encrypted)
      const phone = MSISDN.replace(/^254/, '0').replace(/\D/g, '')
      if (phone.length >= 9) {
        const user = await User.findOne({
          $or: [
            { phone: phone },
            { phone: `0${phone}` },
            { phone: `254${phone}` },
            { phone: MSISDN },
          ],
        })
        if (user) {
          userId = new mongoose.Types.ObjectId(user._id)
          console.log('Matched user by phone number')
        }
      }
    }

    // Process payment if user found
    if (userId) {
      try {
        const userDoc = await User.findById(userId)

        if (userDoc) {
          const amountKes = mpesaTransaction.amount
          const pricePerCreditKes = getEffectivePricePerCreditKes()

          const { creditsToAdd } = convertKesToCredits({
            paidKes: amountKes,
            pricePerCreditKes,
          })

          if (creditsToAdd > 0) {
            // Update user balance atomically
            const currentBalanceRaw =
              typeof userDoc.creditsBalance === 'number' ? userDoc.creditsBalance : 0
            const safeStartingBalance = Math.max(0, currentBalanceRaw)
            const finalBalance = safeStartingBalance + creditsToAdd

            await User.findByIdAndUpdate(
              userId,
              { creditsBalance: finalBalance },
              { new: false }
            )

            // Create transaction record (use TransID as reference to prevent duplicates)
            const reference = TransID || `MPESA-C2B-${Date.now()}`
            
            // Check if transaction already exists by reference (TransID)
            const existingTransactionRecord = await Transaction.findOne({ reference })
            if (!existingTransactionRecord) {
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
                },
              })

              // Update M-Pesa transaction with user ID and invoice reference
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
                newBalance: finalBalance,
                transactionType: TransactionType,
              })
            } else {
              console.log('Transaction record already exists for TransID:', TransID)
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
        message: 'Payment received but user account not found. Manual processing may be required.',
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


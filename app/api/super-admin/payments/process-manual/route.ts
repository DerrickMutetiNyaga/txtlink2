/**
 * Super Admin Manual Payment Processing
 * POST /api/super-admin/payments/process-manual
 *
 * Owner-only: manually process offline/manual payments or
 * match unmatched M-Pesa transactions to users.
 */

import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db/connect'
import { MpesaTransaction, Transaction, User } from '@/lib/db/models'
import { convertKesToCredits, getEffectivePricePerCreditKes } from '@/lib/utils/credits'
import { requireOwner } from '@/lib/auth/middleware'
import { logAudit } from '@/lib/utils/audit'
import mongoose from 'mongoose'

export async function POST(request: NextRequest) {
  try {
    await connectDB()
    const owner = requireOwner(request)

    const body = await request.json()
    const {
      userId,
      amountKes,
      transactionId,
      mpesaTransactionId,
      description,
      reference,
    } = body

    if (!userId || !amountKes) {
      return NextResponse.json(
        { error: 'userId and amountKes are required' },
        { status: 400 }
      )
    }

    const userObjectId = new mongoose.Types.ObjectId(userId)
    const userDoc = await User.findById(userObjectId)

    if (!userDoc) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    let mpesaTransaction = null
    if (mpesaTransactionId) {
      mpesaTransaction = await MpesaTransaction.findOne({
        transactionId: mpesaTransactionId,
      })

      if (mpesaTransaction && !mpesaTransaction.userId) {
        mpesaTransaction.userId = userObjectId
        mpesaTransaction.status = 'success'
        await mpesaTransaction.save()
      }
    }

    const pricePerCreditKes = getEffectivePricePerCreditKes()
    const { creditsToAdd } = convertKesToCredits({
      paidKes: amountKes,
      pricePerCreditKes,
    })

    if (creditsToAdd <= 0) {
      return NextResponse.json(
        { error: 'Invalid amount. Credits to add must be greater than 0.' },
        { status: 400 }
      )
    }

    const currentBalanceRaw =
      typeof userDoc.creditsBalance === 'number' ? userDoc.creditsBalance : 0
    const safeStartingBalance = Math.max(0, currentBalanceRaw)
    const finalBalance = safeStartingBalance + creditsToAdd

    await User.findByIdAndUpdate(
      userObjectId,
      { creditsBalance: finalBalance },
      { new: false }
    )

    const transactionReference = reference || transactionId || `MANUAL-${Date.now()}`

    const existingTransaction = await Transaction.findOne({ reference: transactionReference })
    if (existingTransaction) {
      return NextResponse.json(
        { error: 'Transaction with this reference already exists' },
        { status: 400 }
      )
    }

    const transaction = await Transaction.create({
      userId: userObjectId,
      type: 'top-up',
      amount: amountKes,
      description:
        description ||
        `Manual payment: ${creditsToAdd} SMS credits @ KSh ${pricePerCreditKes.toFixed(2)} per credit`,
      reference: transactionReference,
      status: 'completed',
      metadata: {
        currency: 'KES',
        amountKes,
        creditsAdded: creditsToAdd,
        pricePerCreditKes,
        processedBy: owner.userId,
        processedByEmail: owner.email,
        source: 'super_admin',
        isManual: true,
        mpesaTransactionId: mpesaTransactionId || null,
      },
    })

    if (mpesaTransaction) {
      mpesaTransaction.invoiceId = transactionReference
      await mpesaTransaction.save()
    }

    await logAudit('PROCESS_MANUAL_PAYMENT', 'payment', owner.userId, owner.email, {
      resourceId: userId,
      changes: {
        amountKes,
        creditsToAdd,
        previousBalance: safeStartingBalance,
        newBalance: finalBalance,
        transactionReference,
        mpesaTransactionId: mpesaTransactionId || null,
      },
      request,
    })

    return NextResponse.json({
      success: true,
      message: 'Payment processed successfully',
      data: {
        userId: userDoc._id,
        userEmail: userDoc.email,
        amountKes,
        creditsToAdd,
        previousBalance: safeStartingBalance,
        newBalance: finalBalance,
        transactionId: transaction._id,
        transactionReference,
      },
    })
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message.includes('Forbidden')) {
      return NextResponse.json(
        { error: error.message },
        { status: error.message.includes('Forbidden') ? 403 : 401 }
      )
    }
    console.error('Manual payment processing error:', error)
    return NextResponse.json(
      {
        error: 'Failed to process manual payment',
        details: error.message,
      },
      { status: 500 }
    )
  }
}

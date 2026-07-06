/**
 * Get User Balance
 * GET /api/user/balance
 */

import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db/connect'
import { Transaction, User } from '@/lib/db/models'
import { requireAuth } from '@/lib/auth/middleware'
import { DEFAULT_PRICE_PER_CREDIT_KES } from '@/lib/utils/credits'

export async function GET(request: NextRequest) {
  try {
    await connectDB()
    const user = requireAuth(request)

    // Get user from database
    const mongoose = require('mongoose')
    const userObjectId = new mongoose.Types.ObjectId(user.userId)
    const userDoc = await User.findById(userObjectId)

    if (!userDoc) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Credits-based wallet (preferred)
    let creditsBalance =
      typeof userDoc.creditsBalance === 'number' ? userDoc.creditsBalance : 0

    // Self-healing: if balance is zero but there are completed top-ups with credits,
    // reconstruct the balance from the transaction ledger once.
    if (creditsBalance === 0) {
      const topupTransactions = await Transaction.find({
        userId: userObjectId,
        type: 'top-up',
        status: 'completed',
      })
        .select('metadata.creditsAdded')
        .lean()

      const reconstructed = topupTransactions.reduce((sum, tx: any) => {
        const added =
          typeof tx.metadata?.creditsAdded === 'number'
            ? tx.metadata.creditsAdded
            : 0
        return sum + added
      }, 0)

      if (reconstructed > 0) {
        creditsBalance = reconstructed
        await User.findByIdAndUpdate(userObjectId, {
          creditsBalance,
        })
      }
    }

    console.log('Balance debug for user:', {
      userId: user.userId,
      email: user.email,
      creditsBalance,
    })

    return NextResponse.json({
      success: true,
      // Wallet balance in credits (integer)
      balance: creditsBalance,
      balanceType: 'credits',
      // Pricing info for UI estimates (KES-only)
      pricePerCreditKes: DEFAULT_PRICE_PER_CREDIT_KES,
    })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Get balance error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}


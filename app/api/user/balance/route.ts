/**
 * Get User Balance
 * GET /api/user/balance
 */

import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db/connect'
import { SmsMessage, Transaction, User } from '@/lib/db/models'
import { requireAuth } from '@/lib/auth/middleware'
import { resolvePricePerCreditKes } from '@/lib/utils/resolve-price-per-credit'
import mongoose from 'mongoose'

export async function GET(request: NextRequest) {
  try {
    await connectDB()
    const user = requireAuth(request)

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

    // Last-7-day delivery rate for the navbar widget (real data, not placeholders)
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    const [delivered7d, total7d] = await Promise.all([
      SmsMessage.countDocuments({
        userId: userObjectId,
        createdAt: { $gte: since },
        status: 'delivered',
      }),
      SmsMessage.countDocuments({
        userId: userObjectId,
        createdAt: { $gte: since },
        status: {
          $in: [
            'delivered',
            'failed',
            'expired',
            'rejected',
            'undeliverable',
            'sent',
            'queued',
            'processing',
            'retrying',
            'pending',
            'provider_timeout',
          ],
        },
      }),
    ])
    const deliveryRate7d =
      total7d > 0 ? Math.round((delivered7d / total7d) * 1000) / 10 : null

    return NextResponse.json({
      success: true,
      // Wallet balance in credits (integer)
      balance: creditsBalance,
      balanceType: 'credits',
      deliveryRate7d,
      delivered7d,
      total7d,
      // Pricing info for UI estimates (KES-only) — from PricingRule
      pricePerCreditKes: await resolvePricePerCreditKes(user.userId),
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


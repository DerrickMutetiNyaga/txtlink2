/**
 * Adjust a user's SMS credit balance (creditsBalance) with audit trail.
 */

import mongoose from 'mongoose'
import { User, Transaction } from '@/lib/db/models'

export interface AdjustUserCreditsParams {
  userId: string
  /** Positive to add credits, negative to remove */
  creditsDelta: number
  reason?: string
  adjustedBy: { userId: string; email: string }
  source: 'super_admin'
  /** When credits were derived from a KES payment (e.g. manual M-Pesa) */
  payment?: {
    amountKes: number
    pricePerCreditKes: number
  }
}

export interface AdjustUserCreditsResult {
  previousBalance: number
  newBalance: number
  creditsDelta: number
  transactionId: string
}

export async function adjustUserCredits(
  params: AdjustUserCreditsParams
): Promise<AdjustUserCreditsResult> {
  const { userId, creditsDelta, reason, adjustedBy, source, payment } = params

  if (!creditsDelta || !Number.isFinite(creditsDelta) || creditsDelta === 0) {
    throw new Error('Credits amount must be a non-zero number')
  }

  const creditsChange = Math.trunc(creditsDelta)
  if (creditsChange === 0) {
    throw new Error('Credits amount must be at least 1')
  }

  const userObjectId = new mongoose.Types.ObjectId(userId)
  const user = await User.findById(userObjectId)
  if (!user) {
    throw new Error('User not found')
  }

  const previousBalance = Math.max(0, user.creditsBalance ?? 0)
  const newBalance = previousBalance + creditsChange

  if (newBalance < 0) {
    throw new Error(
      `Cannot remove ${Math.abs(creditsChange)} credits. User only has ${previousBalance} credits.`
    )
  }

  await User.findByIdAndUpdate(userObjectId, { creditsBalance: newBalance })

  const isAdd = creditsChange > 0
  const reference = `MANUAL-CREDIT-${source.toUpperCase()}-${Date.now()}-${userId.slice(-6)}`

  const transaction = await Transaction.create({
    userId: userObjectId,
    type: isAdd ? 'top-up' : 'charge',
    amount: payment?.amountKes ?? creditsChange,
    description:
      reason ||
      (payment
        ? `Manual M-Pesa top-up: ${creditsChange} SMS credits from KSh ${payment.amountKes.toFixed(2)} @ KSh ${payment.pricePerCreditKes.toFixed(2)}/credit`
        : isAdd
          ? `Manual credit top-up: +${creditsChange} SMS credits`
          : `Manual credit adjustment: -${Math.abs(creditsChange)} SMS credits`),
    reference,
    status: 'completed',
    metadata: {
      creditsDelta: creditsChange,
      previousBalance,
      newBalance,
      adjustedBy: adjustedBy.userId,
      adjustedByEmail: adjustedBy.email,
      source,
      isManualCreditAdjustment: true,
      ...(payment && {
        currency: 'KES',
        amountKes: payment.amountKes,
        creditsAdded: creditsChange,
        pricePerCreditKes: payment.pricePerCreditKes,
        isManualMpesa: true,
      }),
    },
  })

  return {
    previousBalance,
    newBalance,
    creditsDelta: creditsChange,
    transactionId: transaction._id.toString(),
  }
}

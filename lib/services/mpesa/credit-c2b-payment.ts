import mongoose from 'mongoose'
import { MpesaTransaction, Transaction, User } from '@/lib/db/models'
import { convertKesToCredits } from '@/lib/utils/credits'
import { resolvePricePerCreditKes } from '@/lib/utils/resolve-price-per-credit'
import { topupProfitMetadata } from '@/lib/services/profit'
import { queueLowBalanceAlertSync } from '@/lib/services/sms/low-balance-alert'
import { ensureUserPaybillAccount } from '@/lib/services/mpesa/allocate-paybill-account'
import { findUserIdForC2bPayment } from '@/lib/services/mpesa/match-c2b-user'

export async function creditC2bTransactionToUser(params: {
  mpesaTransaction: InstanceType<typeof MpesaTransaction>
  userId: mongoose.Types.ObjectId
  transId: string
  billRefNumber?: string
  transactionType?: string
  businessShortCode?: string
}): Promise<'credited' | 'already_credited' | 'skipped'> {
  const { mpesaTransaction, userId, transId } = params
  if (!transId) return 'skipped'

  const existingLedger = await Transaction.findOne({ reference: transId, type: 'top-up' })
  if (existingLedger) {
    mpesaTransaction.userId = userId
    mpesaTransaction.invoiceId = transId
    await mpesaTransaction.save()
    return 'already_credited'
  }

  const userDoc = await User.findById(userId)
  if (!userDoc) return 'skipped'

  await ensureUserPaybillAccount(userId, userDoc.phone)
  const amountKes = Number(mpesaTransaction.amount)
  if (!Number.isFinite(amountKes) || amountKes <= 0) return 'skipped'

  const pricePerCreditKes = await resolvePricePerCreditKes(String(userId))
  const { creditsToAdd } = convertKesToCredits({ paidKes: amountKes, pricePerCreditKes })
  if (creditsToAdd <= 0) return 'skipped'

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
      description: `M-Pesa ${params.transactionType || 'PayBill'} payment: ${creditsToAdd} SMS credits @ KSh ${pricePerCreditKes.toFixed(2)} per credit`,
      reference: transId,
      status: 'completed',
      metadata: {
        currency: 'KES',
        amountKes,
        creditsAdded: creditsToAdd,
        pricePerCreditKes,
        mpesaReceiptNumber: transId,
        transactionType: params.transactionType || 'C2B',
        businessShortCode: params.businessShortCode,
        billRefNumber: params.billRefNumber,
        ...profitMeta,
      },
    })
  } catch (error: any) {
    if (error?.code === 11000) {
      mpesaTransaction.userId = userId
      mpesaTransaction.invoiceId = transId
      await mpesaTransaction.save()
      return 'already_credited'
    }
    throw error
  }

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

  mpesaTransaction.userId = userId
  mpesaTransaction.invoiceId = transId
  await mpesaTransaction.save()

  console.log('PayBill payment processed successfully:', {
    userId: userDoc._id,
    userEmail: userDoc.email,
    transactionId: transId,
    billRefNumber: params.billRefNumber,
    amountKes,
    creditsToAdd,
    previousBalance: safeStartingBalance,
    newBalance,
  })

  return 'credited'
}

export async function creditUnmatchedC2bPayments(limit = 25): Promise<number> {
  const unmatched = await MpesaTransaction.find({
    transactionType: 'C2B',
    status: 'success',
    createdAt: { $gte: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) },
    $or: [{ userId: { $exists: false } }, { userId: null }],
  })
    .sort({ createdAt: -1 })
    .limit(limit)

  let credited = 0
  for (const mpesaTransaction of unmatched) {
    const transId = mpesaTransaction.transactionId || mpesaTransaction.mpesaReceiptNumber || ''
    const userId = await findUserIdForC2bPayment({
      billRefNumber: mpesaTransaction.accountReference,
      msisdn: mpesaTransaction.phoneNumber,
    })
    if (!userId || !transId) continue

    const result = await creditC2bTransactionToUser({
      mpesaTransaction,
      userId,
      transId,
      billRefNumber: mpesaTransaction.accountReference,
      transactionType: 'C2B',
    })
    if (result === 'credited') credited += 1
  }
  return credited
}

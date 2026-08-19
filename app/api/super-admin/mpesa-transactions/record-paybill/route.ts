/**
 * Super Admin: record a PayBill payment that M-Pesa did not post to TXTLINK.
 * POST /api/super-admin/mpesa-transactions/record-paybill
 */

import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'
import connectDB from '@/lib/db/connect'
import { MpesaTransaction, Transaction, User } from '@/lib/db/models'
import { requireOwner } from '@/lib/auth/middleware'
import { logAudit } from '@/lib/utils/audit'
import { convertKesToCredits } from '@/lib/utils/credits'
import { resolvePricePerCreditKes } from '@/lib/utils/resolve-price-per-credit'
import { topupProfitMetadata } from '@/lib/services/profit'
import { queueLowBalanceAlertSync } from '@/lib/services/sms/low-balance-alert'
import { findUserIdForC2bPayment } from '@/lib/services/mpesa/match-c2b-user'
import { c2bPhoneOrUnknown } from '@/lib/services/mpesa/parse-c2b-payload'

export async function POST(request: NextRequest) {
  try {
    await connectDB()
    const owner = await requireOwner(request)
    const body = await request.json()
    const receipt = String(body.receipt || body.transactionId || '').trim().toUpperCase()
    const amountKes = Number(body.amountKes)
    const accountNumber = String(body.accountNumber || '').trim()
    const phone = String(body.phone || '').trim()

    if (!receipt || !amountKes || amountKes <= 0) {
      return NextResponse.json(
        { error: 'Receipt number and a positive amount are required' },
        { status: 400 }
      )
    }

    const existingLedger = await Transaction.findOne({ reference: receipt, type: 'top-up' })
    if (existingLedger) {
      return NextResponse.json({ error: 'This receipt was already credited' }, { status: 409 })
    }

    const userId = await findUserIdForC2bPayment({
      billRefNumber: accountNumber,
      msisdn: phone,
    })

    let mpesaTransaction = await MpesaTransaction.findOne({
      $or: [{ transactionId: receipt }, { mpesaReceiptNumber: receipt }],
    })
    if (!mpesaTransaction) {
      mpesaTransaction = await MpesaTransaction.create({
        transactionType: 'C2B',
        transactionId: receipt,
        amount: amountKes,
        phoneNumber: c2bPhoneOrUnknown(phone),
        accountReference: accountNumber || 'C2B-PAYMENT',
        status: 'success',
        responseCode: '0',
        resultDesc: 'Recorded by super admin from M-Pesa SMS',
        mpesaReceiptNumber: receipt,
        rawResponse: { source: 'super_admin_record_paybill', receipt, accountNumber, phone },
        ...(userId ? { userId } : {}),
      })
    }

    if (!userId) {
      await logAudit('RECORD_PAYBILL_UNMATCHED', 'payment', owner.userId, owner.email, {
        changes: { receipt, amountKes, accountNumber, phone },
        request,
      })
      return NextResponse.json({
        success: true,
        matched: false,
        message:
          'PayBill saved on M-Pesa Transactions, but no TXTLINK user matched that account number or phone. Credits were not added.',
        transactionId: mpesaTransaction._id,
      })
    }

    const pricePerCreditKes = await resolvePricePerCreditKes(String(userId))
    const { creditsToAdd } = convertKesToCredits({ paidKes: amountKes, pricePerCreditKes })
    if (creditsToAdd <= 0) {
      return NextResponse.json(
        { error: `KSh ${amountKes} is below the minimum for 1 credit` },
        { status: 400 }
      )
    }

    const userDoc = await User.findById(userId)
    if (!userDoc) {
      return NextResponse.json({ error: 'Matched user no longer exists' }, { status: 404 })
    }

    await Transaction.create({
      userId,
      type: 'top-up',
      amount: amountKes,
      description: `M-Pesa PayBill (manual record): ${creditsToAdd} SMS credits @ KSh ${pricePerCreditKes.toFixed(2)} per credit`,
      reference: receipt,
      status: 'completed',
      metadata: {
        currency: 'KES',
        amountKes,
        creditsAdded: creditsToAdd,
        pricePerCreditKes,
        mpesaReceiptNumber: receipt,
        billRefNumber: accountNumber,
        recordedBy: owner.email,
        source: 'super_admin_record_paybill',
        ...(await topupProfitMetadata({
          paidKes: amountKes,
          credits: creditsToAdd,
          sellingPriceKes: pricePerCreditKes,
        })),
      },
    })

    const updated = await User.findByIdAndUpdate(
      userId,
      { $inc: { creditsBalance: creditsToAdd } },
      { new: true }
    )
    queueLowBalanceAlertSync(userId, updated?.creditsBalance ?? 0)

    mpesaTransaction.userId = new mongoose.Types.ObjectId(String(userId))
    mpesaTransaction.status = 'success'
    mpesaTransaction.invoiceId = receipt
    await mpesaTransaction.save()

    await logAudit('RECORD_PAYBILL_PAYMENT', 'payment', owner.userId, owner.email, {
      resourceId: String(userId),
      changes: { receipt, amountKes, creditsToAdd, accountNumber, phone },
      request,
    })

    return NextResponse.json({
      success: true,
      matched: true,
      message: `Credited ${creditsToAdd} SMS to ${userDoc.email}`,
      user: { id: userDoc._id, name: userDoc.name, email: userDoc.email },
      creditsToAdd,
      newBalance: updated?.creditsBalance,
    })
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message?.includes('Forbidden')) {
      return NextResponse.json(
        { error: error.message },
        { status: error.message.includes('Forbidden') ? 403 : 401 }
      )
    }
    if (error?.code === 11000) {
      return NextResponse.json({ error: 'This receipt was already credited' }, { status: 409 })
    }
    console.error('Record PayBill error:', error)
    return NextResponse.json({ error: error.message || 'Failed to record PayBill' }, { status: 500 })
  }
}

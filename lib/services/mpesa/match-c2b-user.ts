/**
 * Match a C2B PayBill payment to a user.
 * Account number is usually the last 5 (or last 4) digits of the profile phone.
 * If that code is already taken, the user has a unique fallback number.
 * Paying M-Pesa phone is used to auto-detect when the account is shared/legacy
 * or when two people share the same last digits.
 */

import mongoose from 'mongoose'
import { User } from '@/lib/db/models'
import { kenyanPhoneVariants, normalizeKenyanPhone } from '@/lib/utils/phone'
import { isSharedPaybillAccount, paybillAccountDigits } from '@/lib/utils/paybill'
import {
  assignPaybillAccount,
  findPaybillReservation,
} from '@/lib/services/mpesa/allocate-paybill-account'

export async function findUserIdForC2bPayment(params: {
  billRefNumber?: string | null
  invoiceNumber?: string | null
  msisdn?: string | null
}): Promise<mongoose.Types.ObjectId | null> {
  const accountReference = (params.billRefNumber || params.invoiceNumber || '').trim()
  const digits = paybillAccountDigits(accountReference)

  if (digits && digits.length >= 4 && digits.length <= 9) {
    const reservation = await findPaybillReservation(digits)
    if (reservation) {
      const owner = await User.exists({ _id: reservation.userId })
      if (owner) return new mongoose.Types.ObjectId(String(reservation.userId))
      console.warn('[c2b] PayBill account is retired and will not be given to another user', {
        account: digits,
      })
      return null
    }

    const byAssigned = await findUsersByPaybillAccount(digits)
    const resolvedAssigned = await pickUniqueOrPhone(byAssigned, params.msisdn)
    if (resolvedAssigned) {
      await persistAccountIfMissing(resolvedAssigned, digits)
      return resolvedAssigned
    }

    const bySuffix = await findUsersByPhoneSuffix(digits)
    const resolvedSuffix = await pickUniqueOrPhone(bySuffix, params.msisdn)
    if (resolvedSuffix) {
      await persistAccountIfMissing(resolvedSuffix, digits)
      return resolvedSuffix
    }
  }

  if (isSharedPaybillAccount(accountReference)) {
    const userId = await findUserIdByPayerPhone(params.msisdn)
    if (userId) return userId
  }

  if (accountReference.toUpperCase().startsWith('USER-')) {
    const idPart = accountReference.slice(5).trim()
    if (mongoose.Types.ObjectId.isValid(idPart)) {
      const exists = await User.exists({ _id: idPart })
      if (exists) return new mongoose.Types.ObjectId(idPart)
    }
  }

  if (accountReference && mongoose.Types.ObjectId.isValid(accountReference)) {
    const exists = await User.exists({ _id: accountReference })
    if (exists) return new mongoose.Types.ObjectId(accountReference)
  }

  if (accountReference.includes('@')) {
    const user = await User.findOne({ email: accountReference.toLowerCase() }).select('_id').lean()
    if (user?._id) return new mongoose.Types.ObjectId(user._id)
  }

  const byAccountPhone = await findUserIdByPayerPhone(accountReference)
  if (byAccountPhone) return byAccountPhone

  return findUserIdByPayerPhone(params.msisdn)
}

export async function findUserIdByPayerPhone(
  msisdn?: string | null
): Promise<mongoose.Types.ObjectId | null> {
  const raw = (msisdn || '').trim()
  if (!raw || raw.length >= 20) return null

  const variants = kenyanPhoneVariants(raw)
  if (variants.length === 0) return null

  const exact = await User.find({ phone: { $in: variants } })
    .select('_id phone')
    .lean()
  const uniqueExact = uniqueUserIds(exact)
  if (uniqueExact.length === 1) return uniqueExact[0]
  if (uniqueExact.length > 1) {
    console.warn('[c2b] multiple users share the paying phone; skipping auto-match')
    return null
  }

  const normalized = normalizeKenyanPhone(raw)
  if (!normalized) return null
  const last9 = normalized.slice(-9)
  const candidates = await User.find({ phone: { $regex: `${last9}$` } })
    .select('_id phone')
    .limit(8)
    .lean()
  const matched = candidates.filter(
    (user) => normalizeKenyanPhone(user.phone || '') === normalized
  )
  const unique = uniqueUserIds(matched)
  if (unique.length === 1) return unique[0]
  return null
}

async function findUsersByPaybillAccount(account: string) {
  return User.find({ paybillAccount: account }).select('_id phone paybillAccount').lean()
}

async function findUsersByPhoneSuffix(account: string) {
  const escaped = account.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return User.find({
    phone: { $regex: `${escaped}$` },
    $or: [{ paybillAccount: { $exists: false } }, { paybillAccount: null }, { paybillAccount: '' }],
  })
    .select('_id phone paybillAccount')
    .limit(20)
    .lean()
}

async function pickUniqueOrPhone(
  users: Array<{ _id: unknown; phone?: string }>,
  msisdn?: string | null
): Promise<mongoose.Types.ObjectId | null> {
  const unique = uniqueUserIds(users)
  if (unique.length === 1) return unique[0]
  if (unique.length === 0) return null

  const payer = await findUserIdByPayerPhone(msisdn)
  if (payer && unique.some((id) => String(id) === String(payer))) return payer
  return null
}

async function persistAccountIfMissing(
  userId: mongoose.Types.ObjectId,
  paidAccount: string
) {
  try {
    const user = await User.findById(userId).select('paybillAccount phone')
    if (!user) return
    if (user.paybillAccount) return
    await assignPaybillAccount(userId, user.phone)
  } catch (error) {
    console.warn('[c2b] could not persist PayBill account', {
      userId: String(userId),
      paidAccount,
      error: error instanceof Error ? error.message : error,
    })
  }
}

function uniqueUserIds(users: Array<{ _id: unknown }>): mongoose.Types.ObjectId[] {
  const seen = new Set<string>()
  const ids: mongoose.Types.ObjectId[] = []
  for (const user of users) {
    const id = String(user._id)
    if (seen.has(id)) continue
    seen.add(id)
    ids.push(new mongoose.Types.ObjectId(id))
  }
  return ids
}

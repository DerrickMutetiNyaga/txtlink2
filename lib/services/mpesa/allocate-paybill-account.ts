import mongoose from 'mongoose'
import { PaybillAccountReservation, User } from '@/lib/db/models'
import {
  nextGeneratedPaybillAccount,
  phonePaybillCandidates,
} from '@/lib/utils/paybill'

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function asObjectId(id: mongoose.Types.ObjectId | string) {
  return new mongoose.Types.ObjectId(String(id))
}

export async function findPaybillReservation(account: string) {
  if (!account) return null
  return PaybillAccountReservation.findOne({ account }).lean()
}

export async function isPaybillAccountTaken(
  account: string,
  exceptUserId?: mongoose.Types.ObjectId | string | null
): Promise<boolean> {
  if (!account) return true

  const except = exceptUserId ? String(exceptUserId) : null
  const reserved = await PaybillAccountReservation.findOne({ account }).select('userId').lean()
  if (reserved && String(reserved.userId) !== except) return true

  const assigned = await User.exists({
    paybillAccount: account,
    ...(except ? { _id: { $ne: asObjectId(except) } } : {}),
  })
  return Boolean(assigned)
}

async function isGeneratedAccountReserved(
  account: string,
  exceptUserId: mongoose.Types.ObjectId | string
): Promise<boolean> {
  if (await isPaybillAccountTaken(account, exceptUserId)) return true
  if (account.length < 5) return false

  const escaped = escapeRegex(account)
  const reserved = await User.exists({
    _id: { $ne: asObjectId(exceptUserId) },
    phone: { $regex: `${escaped}$` },
  })
  return Boolean(reserved)
}

async function pickUniquePaybillAccount(
  userId: mongoose.Types.ObjectId | string,
  phone?: string | null
): Promise<string> {
  const preferred = phonePaybillCandidates(phone)

  for (const candidate of preferred) {
    if (!(await isPaybillAccountTaken(candidate, userId))) {
      return candidate
    }
  }

  const seed = preferred[0]
  for (let attempt = 0; attempt < 20000; attempt++) {
    const generated = nextGeneratedPaybillAccount(seed, attempt)
    if (!(await isGeneratedAccountReserved(generated, userId))) {
      return generated
    }
  }

  return `${Date.now().toString().slice(-8)}`
}

async function rememberReservation(account: string, userId: mongoose.Types.ObjectId | string) {
  try {
    await PaybillAccountReservation.create({
      account,
      userId: asObjectId(userId),
    })
    return true
  } catch (error: any) {
    if (error?.code !== 11000) throw error
    const existing = await PaybillAccountReservation.findOne({ account }).select('userId').lean()
    return Boolean(existing && String(existing.userId) === String(userId))
  }
}

async function keepExistingAccount(
  userId: mongoose.Types.ObjectId | string,
  account: string
): Promise<string> {
  await rememberReservation(account, userId)
  return account
}

/**
 * Assign a PayBill account once. After that it never changes and is never
 * given to another user.
 */
export async function assignPaybillAccount(
  userId: mongoose.Types.ObjectId | string,
  phone?: string | null
): Promise<string> {
  const user = await User.findById(userId).select('phone paybillAccount')
  if (!user) throw new Error('User not found')

  if (user.paybillAccount) {
    return keepExistingAccount(userId, String(user.paybillAccount))
  }

  const resolvedPhone = phone ?? user.phone

  for (let attempt = 0; attempt < 8; attempt++) {
    const account = await pickUniquePaybillAccount(userId, resolvedPhone)
    const reservedForThisUser = await rememberReservation(account, userId)
    if (!reservedForThisUser) continue

    const result = await User.updateOne(
      {
        _id: asObjectId(userId),
        $or: [{ paybillAccount: { $exists: false } }, { paybillAccount: null }, { paybillAccount: '' }],
      },
      { $set: { paybillAccount: account } }
    )

    const latest = await User.findById(userId).select('paybillAccount')
    const kept = latest?.paybillAccount ? String(latest.paybillAccount) : ''
    if (kept && kept !== account) {
      await PaybillAccountReservation.deleteOne({ account, userId: asObjectId(userId) })
      return keepExistingAccount(userId, kept)
    }

    if (result.modifiedCount > 0 || kept === account) {
      return account
    }
  }

  throw new Error('Could not assign a unique PayBill account number')
}

export async function ensureUserPaybillAccount(
  userId: mongoose.Types.ObjectId | string,
  phone?: string | null
): Promise<string | null> {
  const user = await User.findById(userId).select('phone paybillAccount')
  if (!user) return null
  if (user.paybillAccount) {
    return keepExistingAccount(userId, String(user.paybillAccount))
  }
  const resolvedPhone = phone ?? user.phone
  if (!resolvedPhone) return null
  return assignPaybillAccount(userId, resolvedPhone)
}

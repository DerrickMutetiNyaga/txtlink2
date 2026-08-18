/**
 * Match a C2B PayBill payment to a user.
 * Shared account number (SMS) is the same for everyone; the paying phone
 * is matched to User.phone from registration / Settings → Profile.
 */

import mongoose from 'mongoose'
import { SystemSettings, User } from '@/lib/db/models'
import { kenyanPhoneVariants, normalizeKenyanPhone } from '@/lib/utils/phone'
import { isSharedPaybillAccount, normalizePaybillAccount } from '@/lib/utils/paybill'

export async function findUserIdForC2bPayment(params: {
  billRefNumber?: string | null
  invoiceNumber?: string | null
  msisdn?: string | null
}): Promise<mongoose.Types.ObjectId | null> {
  const accountReference = (params.billRefNumber || params.invoiceNumber || '').trim()
  const settings = await SystemSettings.findOne().select('mpesaPaybillAccount').lean()
  const sharedAccount = normalizePaybillAccount(settings?.mpesaPaybillAccount)

  const byPhone = async () => findUserIdByPayerPhone(params.msisdn)

  if (isSharedPaybillAccount(accountReference, sharedAccount)) {
    const userId = await byPhone()
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

  return byPhone()
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

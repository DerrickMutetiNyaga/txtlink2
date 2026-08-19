import connectDB from '@/lib/db/connect'
import { SystemSettings, User } from '@/lib/db/models'
import { kenyanPhoneVariants } from '@/lib/utils/phone'
import { ensureUserPaybillAccount } from '@/lib/services/mpesa/allocate-paybill-account'

export interface PaybillInstructions {
  enabled: boolean
  paybill: string
  account: string
  platformName: string
  profilePhone?: string
}

async function getPaybillShortcode() {
  const settings = await SystemSettings.findOne()
    .select('mpesaEnabled mpesaShortcode platformName')
    .lean()

  return {
    enabled: Boolean(settings?.mpesaEnabled && settings?.mpesaShortcode),
    paybill: (settings?.mpesaShortcode || '').trim(),
    platformName: settings?.platformName || 'TXTLINK',
  }
}

export async function getPaybillInstructions(userId?: string): Promise<PaybillInstructions> {
  await connectDB()
  const base = await getPaybillShortcode()

  if (!userId) {
    return { ...base, account: '' }
  }

  const user = await User.findById(userId).select('phone paybillAccount')
  if (!user) {
    return { ...base, account: '' }
  }

  const account = (await ensureUserPaybillAccount(userId, user.phone)) || ''
  return {
    ...base,
    account,
    profilePhone: user.phone || '',
  }
}

export async function getPaybillInstructionsByPhone(phone: string): Promise<PaybillInstructions> {
  await connectDB()
  const base = await getPaybillShortcode()
  const variants = kenyanPhoneVariants(phone)
  if (variants.length === 0) {
    return { ...base, account: '' }
  }

  const users = await User.find({ phone: { $in: variants } }).select('_id phone paybillAccount').lean()
  if (users.length !== 1) {
    return { ...base, account: '', profilePhone: phone }
  }

  const account = (await ensureUserPaybillAccount(String(users[0]._id), users[0].phone)) || ''
  return {
    ...base,
    account,
    profilePhone: users[0].phone || phone,
  }
}

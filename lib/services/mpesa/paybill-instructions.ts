import connectDB from '@/lib/db/connect'
import { SystemSettings } from '@/lib/db/models'
import { DEFAULT_PAYBILL_ACCOUNT, normalizePaybillAccount } from '@/lib/utils/paybill'

export interface PaybillInstructions {
  enabled: boolean
  paybill: string
  account: string
  platformName: string
}

export async function getPaybillInstructions(): Promise<PaybillInstructions> {
  await connectDB()
  const settings = await SystemSettings.findOne()
    .select('mpesaEnabled mpesaShortcode mpesaPaybillAccount platformName')
    .lean()

  return {
    enabled: Boolean(settings?.mpesaEnabled && settings?.mpesaShortcode),
    paybill: (settings?.mpesaShortcode || '').trim(),
    account: normalizePaybillAccount(settings?.mpesaPaybillAccount),
    platformName: settings?.platformName || 'TXTLINK',
  }
}

export { DEFAULT_PAYBILL_ACCOUNT }

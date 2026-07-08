import { SenderIdPricing } from '@/lib/db/models'

const DEFAULT_SENDER_ID_APPLICATION_FEE_KES = 5999

export async function getSenderIdApplicationFeeKes(): Promise<number> {
  const pricing = await SenderIdPricing.findOne().lean()
  if (pricing?.registrationFee && pricing.registrationFee > 0) {
    return pricing.registrationFee
  }
  return DEFAULT_SENDER_ID_APPLICATION_FEE_KES
}

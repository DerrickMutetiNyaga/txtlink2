/**
 * Super-admin buying price and profit fields for SMS + credit top-ups.
 */

import connectDB from '@/lib/db/connect'
import { SystemSettings } from '@/lib/db/models'
import { purchaseCostAndProfit, smsCostAndProfit } from '@/lib/utils/cost-profit'

export async function getBuyingPriceKes(): Promise<number> {
  await connectDB()
  const settings = await SystemSettings.findOne()
    .select('globalProviderCostPerPart defaultProviderCostPerPart')
    .lean()

  const fromGlobal = Number(settings?.globalProviderCostPerPart)
  if (Number.isFinite(fromGlobal) && fromGlobal >= 0) return fromGlobal

  const fromDefault = Number(settings?.defaultProviderCostPerPart)
  if (Number.isFinite(fromDefault) && fromDefault >= 0) return fromDefault

  return 0
}

export async function smsProfitFields(parts: number, chargedKes: number) {
  const buyingPriceKes = await getBuyingPriceKes()
  return smsCostAndProfit({ parts, chargedKes, buyingPriceKes })
}

export async function topupProfitMetadata(params: {
  paidKes: number
  credits: number
  sellingPriceKes: number
}): Promise<{
  buyingPriceKes: number
  sellingPriceKes: number
  providerCostKes: number
  profitKes: number
}> {
  const buyingPriceKes = await getBuyingPriceKes()
  const { providerCostKes, profitKes } = purchaseCostAndProfit({
    paidKes: params.paidKes,
    credits: params.credits,
    buyingPriceKes,
  })
  return {
    buyingPriceKes,
    sellingPriceKes: params.sellingPriceKes,
    providerCostKes,
    profitKes,
  }
}

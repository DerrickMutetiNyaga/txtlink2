/**
 * Server-only: resolve KSh-per-credit from PricingRule (user override → global → default).
 * Do not import this from client components.
 */

import connectDB from '@/lib/db/connect'
import { PricingRule } from '@/lib/db/models'
import type { PricingRuleConfig } from '@/lib/utils/pricing-calculations'
import {
  DEFAULT_PRICE_PER_CREDIT_KES,
  pricePerCreditFromPricingRule,
} from '@/lib/utils/credits'

export async function resolvePricePerCreditKes(userId?: string | null): Promise<number> {
  await connectDB()
  const mongoose = await import('mongoose')

  if (userId) {
    try {
      const userObjectId = new mongoose.Types.ObjectId(String(userId))
      const userRule = await PricingRule.findOne({
        scope: 'user',
        userId: userObjectId,
      }).lean()
      const fromUser = pricePerCreditFromPricingRule(userRule as PricingRuleConfig | null)
      if (fromUser != null) return fromUser
    } catch {
      // invalid userId — fall through to global
    }
  }

  const globalRule = await PricingRule.findOne({ scope: 'global' }).lean()
  const fromGlobal = pricePerCreditFromPricingRule(globalRule as PricingRuleConfig | null)
  if (fromGlobal != null) return fromGlobal

  return DEFAULT_PRICE_PER_CREDIT_KES
}

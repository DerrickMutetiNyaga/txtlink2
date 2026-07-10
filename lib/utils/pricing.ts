/**
 * Pricing Calculation Utilities
 */

import connectDB from '@/lib/db/connect'
import { PricingRule } from '@/lib/db/models'
import {
  detectEncoding,
  calculateSmsParts,
  calculateMessageCharge,
  type MessageEncoding,
  type PricingRuleConfig,
} from '@/lib/utils/pricing-calculations'

export interface PricingCalculation {
  parts: number
  chargedKes: number
  encoding: MessageEncoding
  billingBlocks?: number
  charsPerBlock?: number
  pricePerBlock?: number
  pricePerCharacter?: number
  mode?: string
}

export {
  detectEncoding,
  calculateSmsParts as calculateParts,
  calculateMessageCharge,
  getModeLabel,
  getSampleBlockBreakdown,
  getCharsPerBlock,
  getPricePerBlock,
  getPricePerCharacter,
  calculateBillingBlocks,
} from '@/lib/utils/pricing-calculations'

/**
 * Calculate charge based on pricing rule (legacy helper)
 */
export function calculateCharge(parts: number, rule: PricingRuleConfig, monthlyVolume?: number): number {
  if (rule.mode === 'per_sms') {
    return parts * (rule.pricePerSms || 0)
  }

  if (rule.mode === 'tiered' && rule.tiers && monthlyVolume !== undefined) {
    const tier = rule.tiers.find((t) => monthlyVolume >= t.from && monthlyVolume <= t.to)
    if (tier) {
      return parts * tier.pricePerPart
    }
  }

  return parts * (rule.pricePerPart || 0)
}

/**
 * Get pricing rule for user (user override or global)
 */
export async function getPricingRule(userId?: string): Promise<PricingRuleConfig> {
  await connectDB()
  const mongoose = require('mongoose')

  if (userId) {
    const userObjectId = new mongoose.Types.ObjectId(userId)
    const userRule = await PricingRule.findOne({
      scope: 'user',
      userId: userObjectId,
    })

    if (userRule) {
      return userRule.toObject()
    }
  }

  const globalRule = await PricingRule.findOne({ scope: 'global' })

  if (!globalRule) {
    return {
      mode: 'per_part',
      gsm7Part1: 160,
      gsm7PartN: 153,
      ucs2Part1: 70,
      ucs2PartN: 67,
      pricePerPart: 2.0,
      chargeFailed: false,
      refundOnFail: true,
      samePriceForEncodings: true,
      roundPartialBlocks: true,
    }
  }

  return globalRule.toObject()
}

/**
 * Calculate pricing for a message
 */
export async function calculatePricing(
  message: string,
  userId?: string,
  monthlyVolume?: number,
  encodingOverride?: MessageEncoding
): Promise<PricingCalculation> {
  await connectDB()
  const encoding = encodingOverride ?? detectEncoding(message)
  const rule = await getPricingRule(userId)
  const result = calculateMessageCharge(message, encoding, rule, monthlyVolume)

  return {
    parts: result.smsParts,
    chargedKes: result.charge,
    encoding,
    billingBlocks: result.billingBlocks,
    charsPerBlock: result.charsPerBlock,
    pricePerBlock: result.pricePerBlock,
    pricePerCharacter: result.pricePerCharacter,
    mode: rule.mode,
  }
}

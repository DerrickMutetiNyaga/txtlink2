/**
 * Pricing Calculation Utilities
 */

import connectDB from '@/lib/db/connect'
import { PricingRule } from '@/lib/db/models'

export interface PricingCalculation {
  parts: number
  chargedKes: number
  encoding: 'gsm7' | 'ucs2'
}

/**
 * Detect message encoding
 */
export function detectEncoding(message: string): 'gsm7' | 'ucs2' {
  // Check if message contains non-GSM-7 characters
  const gsm7Regex = /^[@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !"#¤%&'()*+,\-.\/0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà]*$/
  
  // Extended GSM-7 set (including escape sequences)
  // For simplicity, we check for Unicode characters
  const hasUnicode = /[^\x00-\x7F]/.test(message)
  
  return hasUnicode ? 'ucs2' : 'gsm7'
}

/**
 * Calculate SMS parts based on encoding
 */
export function calculateParts(message: string, encoding: 'gsm7' | 'ucs2', rule: any): number {
  const length = message.length
  
  if (encoding === 'gsm7') {
    if (length <= rule.gsm7Part1) return 1
    return Math.ceil((length - rule.gsm7Part1) / rule.gsm7PartN) + 1
  } else {
    // UCS2/Unicode
    if (length <= rule.ucs2Part1) return 1
    return Math.ceil((length - rule.ucs2Part1) / rule.ucs2PartN) + 1
  }
}

/**
 * Calculate charge based on pricing rule
 */
export function calculateCharge(parts: number, rule: any, monthlyVolume?: number): number {
  if (rule.mode === 'per_sms') {
    return parts * (rule.pricePerSms || 0)
  }
  
  if (rule.mode === 'tiered' && rule.tiers && monthlyVolume !== undefined) {
    // Find applicable tier
    const tier = rule.tiers.find((t: any) => monthlyVolume >= t.from && monthlyVolume <= t.to)
    if (tier) {
      return parts * tier.pricePerPart
    }
  }
  
  // Default: per_part
  return parts * (rule.pricePerPart || 0)
}

/**
 * Get pricing rule for user (user override or global)
 */
export async function getPricingRule(userId?: string): Promise<any> {
  await connectDB()
  const mongoose = require('mongoose')
  
  // Try user-specific rule first
  if (userId) {
    const userObjectId = new mongoose.Types.ObjectId(userId)
    const userRule = await PricingRule.findOne({
      scope: 'user',
      userId: userObjectId,
    })
    
    if (userRule) {
      return userRule
    }
  }
  
  // Fallback to global rule
  const globalRule = await PricingRule.findOne({ scope: 'global' })
  
  if (!globalRule) {
    // Default pricing if no rule exists
    return {
      mode: 'per_part',
      gsm7Part1: 160,
      gsm7PartN: 153,
      ucs2Part1: 70,
      ucs2PartN: 67,
      pricePerPart: 2.0,
      chargeFailed: false,
      refundOnFail: true,
    }
  }
  
  return globalRule
}

/**
 * Calculate pricing for a message
 */
export async function calculatePricing(
  message: string,
  userId?: string,
  monthlyVolume?: number
): Promise<PricingCalculation> {
  await connectDB()
  const encoding = detectEncoding(message)
  const rule = await getPricingRule(userId)
  const parts = calculateParts(message, encoding, rule)
  const chargedKes = calculateCharge(parts, rule, monthlyVolume)
  
  return {
    parts,
    chargedKes,
    encoding,
  }
}


/**
 * Pure pricing calculation utilities (safe for client and server)
 */

export type PricingMode = 'per_part' | 'per_sms' | 'per_char_block' | 'per_character' | 'tiered'
export type MessageEncoding = 'gsm7' | 'ucs2'

export interface PricingRuleConfig {
  mode: PricingMode
  gsm7Part1?: number
  gsm7PartN?: number
  ucs2Part1?: number
  ucs2PartN?: number
  pricePerPart?: number
  pricePerSms?: number
  charsPerBlock?: number
  pricePerBlock?: number
  ucs2CharsPerBlock?: number
  ucs2PricePerBlock?: number
  pricePerCharacter?: number
  ucs2PricePerCharacter?: number
  samePriceForEncodings?: boolean
  roundPartialBlocks?: boolean
  minimumChargePerMessage?: number
  tiers?: Array<{ from: number; to: number; pricePerPart: number }>
}

export interface MessageChargeResult {
  charge: number
  smsParts: number
  billingBlocks?: number
  charsPerBlock?: number
  pricePerBlock?: number
  pricePerCharacter?: number
}

export function detectEncoding(message: string): MessageEncoding {
  const hasUnicode = /[^\x00-\x7F]/.test(message)
  return hasUnicode ? 'ucs2' : 'gsm7'
}

export function calculateSmsParts(
  message: string,
  encoding: MessageEncoding,
  rule: PricingRuleConfig
): number {
  const length = message.length
  if (length === 0) return 0

  if (encoding === 'gsm7') {
    const first = rule.gsm7Part1 ?? 160
    const next = rule.gsm7PartN ?? 153
    if (length <= first) return 1
    return Math.ceil((length - first) / next) + 1
  }

  const first = rule.ucs2Part1 ?? 70
  const next = rule.ucs2PartN ?? 67
  if (length <= first) return 1
  return Math.ceil((length - first) / next) + 1
}

export function getCharsPerBlock(rule: PricingRuleConfig, encoding: MessageEncoding): number {
  if (encoding === 'ucs2' && rule.samePriceForEncodings === false && rule.ucs2CharsPerBlock) {
    return rule.ucs2CharsPerBlock
  }
  return rule.charsPerBlock ?? 160
}

export function getPricePerBlock(rule: PricingRuleConfig, encoding: MessageEncoding): number {
  if (encoding === 'ucs2' && rule.samePriceForEncodings === false && rule.ucs2PricePerBlock != null) {
    return rule.ucs2PricePerBlock
  }
  return rule.pricePerBlock ?? rule.pricePerPart ?? 0
}

export function getPricePerCharacter(rule: PricingRuleConfig, encoding: MessageEncoding): number {
  if (encoding === 'ucs2' && rule.samePriceForEncodings === false && rule.ucs2PricePerCharacter != null) {
    return rule.ucs2PricePerCharacter
  }
  return rule.pricePerCharacter ?? 0
}

export function calculateBillingBlocks(
  messageLength: number,
  charsPerBlock: number,
  roundPartialBlocks = true
): number {
  if (messageLength <= 0 || charsPerBlock <= 0) return 0
  if (roundPartialBlocks !== false) {
    return Math.ceil(messageLength / charsPerBlock)
  }
  return messageLength / charsPerBlock
}

export function calculateMessageCharge(
  message: string,
  encoding: MessageEncoding,
  rule: PricingRuleConfig,
  monthlyVolume?: number
): MessageChargeResult {
  const length = message.length
  const smsParts = calculateSmsParts(message, encoding, rule)
  let charge = 0
  let billingBlocks: number | undefined
  let charsPerBlock: number | undefined
  let pricePerBlock: number | undefined
  let pricePerCharacter: number | undefined

  switch (rule.mode) {
    case 'per_sms':
      charge = smsParts * (rule.pricePerSms ?? 0)
      break
    case 'per_char_block': {
      charsPerBlock = getCharsPerBlock(rule, encoding)
      pricePerBlock = getPricePerBlock(rule, encoding)
      const roundUp = rule.roundPartialBlocks !== false
      billingBlocks = calculateBillingBlocks(length, charsPerBlock, roundUp)
      charge = billingBlocks * pricePerBlock
      break
    }
    case 'per_character': {
      pricePerCharacter = getPricePerCharacter(rule, encoding)
      charge = length * pricePerCharacter
      break
    }
    case 'tiered': {
      let unitPrice = rule.pricePerPart ?? 0
      if (rule.tiers && monthlyVolume !== undefined) {
        const tier = rule.tiers.find((t) => monthlyVolume >= t.from && monthlyVolume <= t.to)
        if (tier) unitPrice = tier.pricePerPart
      }
      charge = smsParts * unitPrice
      break
    }
    default:
      charge = smsParts * (rule.pricePerPart ?? 0)
  }

  if (rule.minimumChargePerMessage && charge > 0) {
    charge = Math.max(charge, rule.minimumChargePerMessage)
  }

  return {
    charge,
    smsParts,
    billingBlocks,
    charsPerBlock,
    pricePerBlock,
    pricePerCharacter,
  }
}

export function getModeLabel(mode: PricingMode): string {
  switch (mode) {
    case 'per_part':
      return 'Per SMS Part'
    case 'per_sms':
      return 'Per SMS'
    case 'per_char_block':
      return 'Per Character Block'
    case 'per_character':
      return 'Per Individual Character'
    case 'tiered':
      return 'Tiered'
    default:
      return mode
  }
}

export function getSampleBlockBreakdown(
  charsPerBlock: number,
  pricePerBlock: number,
  roundPartialBlocks = true,
  rows = 3
): Array<{ range: string; charge: number }> {
  const samples: Array<{ range: string; charge: number }> = []
  for (let i = 1; i <= rows; i++) {
    const start = (i - 1) * charsPerBlock + 1
    const end = i * charsPerBlock
    const blocks = roundPartialBlocks !== false ? i : end / charsPerBlock
    samples.push({
      range: `${start}–${end} characters`,
      charge: blocks * pricePerBlock,
    })
  }
  return samples
}

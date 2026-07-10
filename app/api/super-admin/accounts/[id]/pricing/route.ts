/**
 * Super Admin: Set/Update User Pricing Override
 * POST /api/super-admin/accounts/[id]/pricing
 * DELETE /api/super-admin/accounts/[id]/pricing
 */

import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db/connect'
import { User, PricingRule } from '@/lib/db/models'
import { requireOwner } from '@/lib/auth/middleware'
import { logAuditAction } from '@/lib/utils/audit'
import mongoose from 'mongoose'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB()
    const owner = requireOwner(request)
    const { id: userId } = await params

    const { mode, pricePerSms, pricePerPart, pricePerBlock, pricePerCharacter, charsPerBlock, chargeFailed, refundOnFail, samePriceForEncodings, roundPartialBlocks, minimumChargePerMessage, gsm7Part1, gsm7PartN, ucs2Part1, ucs2PartN, ucs2CharsPerBlock, ucs2PricePerBlock, ucs2PricePerCharacter } = await request.json()

    const hasValidPrice =
      (mode === 'per_sms' && pricePerSms) ||
      (mode === 'per_part' && pricePerPart) ||
      (mode === 'per_char_block' && pricePerBlock && charsPerBlock) ||
      (mode === 'per_character' && pricePerCharacter)

    if (!mode || !hasValidPrice) {
      return NextResponse.json(
        { error: 'mode and corresponding price field are required' },
        { status: 400 }
      )
    }

    const userObjectId = new mongoose.Types.ObjectId(userId)
    const user = await User.findById(userObjectId)
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get or create user pricing rule
    let pricingRule = await PricingRule.findOne({
      scope: 'user',
      userId: userObjectId,
    })

    const oldPrice = pricingRule
      ? {
          mode: pricingRule.mode,
          pricePerSms: pricingRule.pricePerSms,
          pricePerPart: pricingRule.pricePerPart,
        }
      : null

    if (pricingRule) {
      pricingRule.mode = mode
      pricingRule.pricePerSms = pricePerSms
      pricingRule.pricePerPart = pricePerPart
      pricingRule.pricePerBlock = pricePerBlock
      pricingRule.charsPerBlock = charsPerBlock
      pricingRule.pricePerCharacter = pricePerCharacter
      pricingRule.samePriceForEncodings = samePriceForEncodings ?? pricingRule.samePriceForEncodings
      pricingRule.roundPartialBlocks = roundPartialBlocks ?? pricingRule.roundPartialBlocks
      pricingRule.minimumChargePerMessage = minimumChargePerMessage ?? pricingRule.minimumChargePerMessage
      if (gsm7Part1 !== undefined) pricingRule.gsm7Part1 = gsm7Part1
      if (gsm7PartN !== undefined) pricingRule.gsm7PartN = gsm7PartN
      if (ucs2Part1 !== undefined) pricingRule.ucs2Part1 = ucs2Part1
      if (ucs2PartN !== undefined) pricingRule.ucs2PartN = ucs2PartN
      if (ucs2CharsPerBlock !== undefined) pricingRule.ucs2CharsPerBlock = ucs2CharsPerBlock
      if (ucs2PricePerBlock !== undefined) pricingRule.ucs2PricePerBlock = ucs2PricePerBlock
      if (ucs2PricePerCharacter !== undefined) pricingRule.ucs2PricePerCharacter = ucs2PricePerCharacter
      pricingRule.chargeFailed = chargeFailed ?? pricingRule.chargeFailed
      pricingRule.refundOnFail = refundOnFail ?? pricingRule.refundOnFail
      pricingRule.updatedBy = new mongoose.Types.ObjectId(owner.userId)
      await pricingRule.save()
    } else {
      pricingRule = await PricingRule.create({
        scope: 'user',
        userId: userObjectId,
        currency: 'KES',
        mode,
        pricePerSms,
        pricePerPart,
        pricePerBlock,
        charsPerBlock,
        pricePerCharacter,
        gsm7Part1: gsm7Part1 ?? 160,
        gsm7PartN: gsm7PartN ?? 153,
        ucs2Part1: ucs2Part1 ?? 70,
        ucs2PartN: ucs2PartN ?? 67,
        ucs2CharsPerBlock,
        ucs2PricePerBlock,
        ucs2PricePerCharacter,
        samePriceForEncodings: samePriceForEncodings ?? true,
        roundPartialBlocks: roundPartialBlocks ?? true,
        minimumChargePerMessage,
        chargeFailed: chargeFailed ?? false,
        refundOnFail: refundOnFail ?? true,
        updatedBy: new mongoose.Types.ObjectId(owner.userId),
      })
    }

    // Log audit
    await logAuditAction(owner.userId, 'UPDATE_USER_PRICING', 'PricingRule', pricingRule._id.toString(), {
      userId,
      oldPrice,
      newPrice: {
        mode: pricingRule.mode,
        pricePerSms: pricingRule.pricePerSms,
        pricePerPart: pricingRule.pricePerPart,
      },
    })

    return NextResponse.json({
      success: true,
      pricingRule: {
        id: pricingRule._id,
        mode: pricingRule.mode,
        pricePerSms: pricingRule.pricePerSms,
        pricePerPart: pricingRule.pricePerPart,
        chargeFailed: pricingRule.chargeFailed,
        refundOnFail: pricingRule.refundOnFail,
      },
    })
  } catch (error: any) {
    console.error('Update user pricing error:', error)
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB()
    const owner = requireOwner(request)
    const { id: userId } = await params

    const userObjectId = new mongoose.Types.ObjectId(userId)
    const user = await User.findById(userObjectId)
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const pricingRule = await PricingRule.findOneAndDelete({
      scope: 'user',
      userId: userObjectId,
    })

    if (!pricingRule) {
      return NextResponse.json({ error: 'No pricing override found for this user' }, { status: 404 })
    }

    // Log audit
    await logAuditAction(owner.userId, 'DELETE_USER_PRICING', 'PricingRule', pricingRule._id.toString(), {
      userId,
      deletedPrice: {
        mode: pricingRule.mode,
        pricePerSms: pricingRule.pricePerSms,
        pricePerPart: pricingRule.pricePerPart,
      },
    })

    return NextResponse.json({ success: true, message: 'Pricing override removed' })
  } catch (error: any) {
    console.error('Delete user pricing error:', error)
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 })
  }
}


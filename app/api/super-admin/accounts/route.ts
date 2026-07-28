/**
 * Super Admin: Get All Accounts
 * GET /api/super-admin/accounts
 */

import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db/connect'
import { User, HostPinnacleAccount, UserSenderId, SenderId, PricingRule } from '@/lib/db/models'
import { requireOwner } from '@/lib/auth/middleware'

export async function GET(request: NextRequest) {
  try {
    await connectDB()
    requireOwner(request)

    const users = await User.find({}).sort({ createdAt: -1 })

    // Get global pricing rule
    const globalPricing = await PricingRule.findOne({ scope: 'global' })

    const accounts = await Promise.all(
      users.map(async (user) => {
        const hpAccount = await HostPinnacleAccount.findOne({ userId: user._id })
        
        // Get user's sender IDs with details
        const userSenderIds = await UserSenderId.find({ userId: user._id }).populate('senderId')
        const senderIds = userSenderIds
          .map((usi) => {
            const senderId = usi.senderId as any
            if (!senderId?._id || !senderId?.senderName) return null
            return {
              id: senderId._id.toString(),
              senderName: senderId.senderName,
              status: senderId.status,
              isDefault: usi.isDefault,
            }
          })
          .filter(Boolean) as Array<{
          id: string
          senderName: string
          status: string
          isDefault: boolean
        }>

        // Get user pricing override
        const userPricing = await PricingRule.findOne({
          scope: 'user',
          userId: user._id,
        })

        return {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
          // Use creditsBalance (SMS credits) instead of legacy KSh wallet
          credits: user.creditsBalance ?? 0,
          isActive: user.isActive,
          hpUserLoginName: hpAccount?.hpUserLoginName || null,
          senderIds,
          senderIdCount: senderIds.length,
          pricing: userPricing
            ? {
                mode: userPricing.mode,
                pricePerSms: userPricing.pricePerSms,
                pricePerPart: userPricing.pricePerPart,
                pricePerBlock: userPricing.pricePerBlock,
                charsPerBlock: userPricing.charsPerBlock,
                pricePerCharacter: userPricing.pricePerCharacter,
                gsm7Part1: userPricing.gsm7Part1,
                gsm7PartN: userPricing.gsm7PartN,
                ucs2Part1: userPricing.ucs2Part1,
                ucs2PartN: userPricing.ucs2PartN,
                samePriceForEncodings: userPricing.samePriceForEncodings,
                roundPartialBlocks: userPricing.roundPartialBlocks,
                minimumChargePerMessage: userPricing.minimumChargePerMessage,
                chargeFailed: userPricing.chargeFailed,
                refundOnFail: userPricing.refundOnFail,
              }
            : null,
          globalPricing: globalPricing
            ? {
                mode: globalPricing.mode,
                pricePerSms: globalPricing.pricePerSms,
                pricePerPart: globalPricing.pricePerPart,
                pricePerBlock: globalPricing.pricePerBlock,
                charsPerBlock: globalPricing.charsPerBlock,
                pricePerCharacter: globalPricing.pricePerCharacter,
                gsm7Part1: globalPricing.gsm7Part1,
                gsm7PartN: globalPricing.gsm7PartN,
                ucs2Part1: globalPricing.ucs2Part1,
                ucs2PartN: globalPricing.ucs2PartN,
                samePriceForEncodings: globalPricing.samePriceForEncodings,
                roundPartialBlocks: globalPricing.roundPartialBlocks,
                minimumChargePerMessage: globalPricing.minimumChargePerMessage,
                chargeFailed: globalPricing.chargeFailed,
                refundOnFail: globalPricing.refundOnFail,
              }
            : null,
          createdAt: user.createdAt,
        }
      })
    )

    return NextResponse.json({
      success: true,
      accounts,
    })
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message.includes('Forbidden')) {
      return NextResponse.json(
        { error: error.message },
        { status: error.message.includes('Forbidden') ? 403 : 401 }
      )
    }
    console.error('Get accounts error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}


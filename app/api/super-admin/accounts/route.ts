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
        const senderIds = await Promise.all(
          userSenderIds.map(async (usi) => {
            const senderId = await SenderId.findById(usi.senderId)
            return {
              id: senderId?._id.toString(),
              senderName: senderId?.senderName,
              status: senderId?.status,
              isDefault: usi.isDefault,
            }
          })
        )

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
                chargeFailed: userPricing.chargeFailed,
                refundOnFail: userPricing.refundOnFail,
              }
            : null,
          globalPricing: globalPricing
            ? {
                mode: globalPricing.mode,
                pricePerSms: globalPricing.pricePerSms,
                pricePerPart: globalPricing.pricePerPart,
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


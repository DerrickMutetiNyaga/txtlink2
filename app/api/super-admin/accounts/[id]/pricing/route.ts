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

    const { mode, pricePerSms, pricePerPart, chargeFailed, refundOnFail } = await request.json()

    if (!mode || (mode === 'per_sms' && !pricePerSms) || (mode === 'per_part' && !pricePerPart)) {
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
      // Update existing
      pricingRule.mode = mode
      pricingRule.pricePerSms = pricePerSms
      pricingRule.pricePerPart = pricePerPart
      pricingRule.chargeFailed = chargeFailed ?? pricingRule.chargeFailed
      pricingRule.refundOnFail = refundOnFail ?? pricingRule.refundOnFail
      pricingRule.updatedBy = new mongoose.Types.ObjectId(owner.userId)
      await pricingRule.save()
    } else {
      // Create new
      pricingRule = await PricingRule.create({
        scope: 'user',
        userId: userObjectId,
        currency: 'KES',
        mode,
        pricePerSms,
        pricePerPart,
        gsm7Part1: 160,
        gsm7PartN: 153,
        ucs2Part1: 70,
        ucs2PartN: 67,
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


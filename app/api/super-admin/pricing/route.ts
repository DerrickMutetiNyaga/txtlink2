/**
 * Super Admin: Pricing Rules
 * GET /api/super-admin/pricing - Get all pricing rules
 * POST /api/super-admin/pricing - Create/update pricing rule
 */

import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db/connect'
import { PricingRule } from '@/lib/db/models'
import { requireOwner } from '@/lib/auth/middleware'
import { logAudit } from '@/lib/utils/audit'

export async function GET(request: NextRequest) {
  try {
    await connectDB()
    requireOwner(request)

    const rules = await PricingRule.find({}).populate('userId', 'name email').sort({ scope: 1, createdAt: -1 })

    return NextResponse.json({
      success: true,
      rules,
    })
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message.includes('Forbidden')) {
      return NextResponse.json(
        { error: error.message },
        { status: error.message.includes('Forbidden') ? 403 : 401 }
      )
    }
    console.error('Get pricing rules error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB()
    const owner = requireOwner(request)
    const mongoose = require('mongoose')

    const {
      scope,
      userId,
      mode,
      gsm7Part1,
      gsm7PartN,
      ucs2Part1,
      ucs2PartN,
      pricePerPart,
      pricePerSms,
      tiers,
      chargeFailed,
      refundOnFail,
    } = await request.json()

    if (scope !== 'global' && scope !== 'user') {
      return NextResponse.json({ error: 'Invalid scope' }, { status: 400 })
    }

    if (scope === 'user' && !userId) {
      return NextResponse.json({ error: 'userId required for user scope' }, { status: 400 })
    }

    const userObjectId = scope === 'user' ? new mongoose.Types.ObjectId(userId) : undefined

    // Check if rule exists
    const existingRule = await PricingRule.findOne({
      scope,
      ...(scope === 'user' && { userId: userObjectId }),
    })

    const ruleData: any = {
      scope,
      ...(scope === 'user' && { userId: userObjectId }),
      mode,
      gsm7Part1: gsm7Part1 || 160,
      gsm7PartN: gsm7PartN || 153,
      ucs2Part1: ucs2Part1 || 70,
      ucs2PartN: ucs2PartN || 67,
      ...(pricePerPart !== undefined && { pricePerPart }),
      ...(pricePerSms !== undefined && { pricePerSms }),
      ...(tiers && { tiers }),
      chargeFailed: chargeFailed || false,
      refundOnFail: refundOnFail !== undefined ? refundOnFail : true,
      updatedBy: new mongoose.Types.ObjectId(owner.userId),
    }

    let rule
    if (existingRule) {
      rule = await PricingRule.findByIdAndUpdate(existingRule._id, ruleData, { new: true })
      await logAudit('UPDATE_PRICING_RULE', 'pricing_rule', owner.userId, owner.email, {
        resourceId: rule._id.toString(),
        changes: ruleData,
        request,
      })
    } else {
      rule = await PricingRule.create(ruleData)
      await logAudit('CREATE_PRICING_RULE', 'pricing_rule', owner.userId, owner.email, {
        resourceId: rule._id.toString(),
        changes: ruleData,
        request,
      })
    }

    return NextResponse.json({
      success: true,
      rule,
    })
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message.includes('Forbidden')) {
      return NextResponse.json(
        { error: error.message },
        { status: error.message.includes('Forbidden') ? 403 : 401 }
      )
    }
    console.error('Create/update pricing rule error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}


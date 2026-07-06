/**
 * Create Default Global Pricing Rule
 * POST /api/super-admin/pricing/default
 */

import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db/connect'
import { PricingRule } from '@/lib/db/models'
import { requireOwner } from '@/lib/auth/middleware'

export async function POST(request: NextRequest) {
  try {
    await connectDB()
    const owner = requireOwner(request)
    const mongoose = require('mongoose')

    // Check if global rule exists
    const existing = await PricingRule.findOne({ scope: 'global' })
    if (existing) {
      return NextResponse.json({ success: true, rule: existing })
    }

    // Create default global rule
    const rule = await PricingRule.create({
      scope: 'global',
      mode: 'per_part',
      gsm7Part1: 160,
      gsm7PartN: 153,
      ucs2Part1: 70,
      ucs2PartN: 67,
      pricePerPart: 2.0,
      chargeFailed: false,
      refundOnFail: true,
      updatedBy: new mongoose.Types.ObjectId(owner.userId),
    })

    return NextResponse.json({ success: true, rule })
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message.includes('Forbidden')) {
      return NextResponse.json(
        { error: error.message },
        { status: error.message.includes('Forbidden') ? 403 : 401 }
      )
    }
    console.error('Create default pricing rule error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}


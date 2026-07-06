/**
 * Super Admin: Pricing Calculator
 * POST /api/super-admin/pricing/calculate
 */

import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db/connect'
import { requireOwner } from '@/lib/auth/middleware'
import { calculatePricing } from '@/lib/utils/pricing'

export async function POST(request: NextRequest) {
  try {
    await connectDB()
    requireOwner(request)

    const { message, userId, encoding, monthlyVolume } = await request.json()

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    const result = await calculatePricing(message, userId, monthlyVolume)

    // Override encoding if provided
    if (encoding && (encoding === 'gsm7' || encoding === 'ucs2')) {
      const { getPricingRule, calculateParts, calculateCharge } = require('@/lib/utils/pricing')
      await connectDB()
      const rule = await getPricingRule(userId)
      const parts = calculateParts(message, encoding, rule)
      const chargedKes = calculateCharge(parts, rule, monthlyVolume)
      result.encoding = encoding
      result.parts = parts
      result.chargedKes = chargedKes
    }

    return NextResponse.json({
      success: true,
      calculation: result,
    })
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message.includes('Forbidden')) {
      return NextResponse.json(
        { error: error.message },
        { status: error.message.includes('Forbidden') ? 403 : 401 }
      )
    }
    console.error('Calculate pricing error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}


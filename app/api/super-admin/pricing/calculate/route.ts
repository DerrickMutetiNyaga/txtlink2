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

    const encodingOverride =
      encoding && (encoding === 'gsm7' || encoding === 'ucs2') ? encoding : undefined

    const result = await calculatePricing(message, userId, monthlyVolume, encodingOverride)

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

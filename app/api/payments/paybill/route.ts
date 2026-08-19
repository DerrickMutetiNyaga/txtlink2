/**
 * PayBill instructions — each user has their own account number
 * (last 5 or last 4 digits of their phone, or a unique fallback).
 * GET  /api/payments/paybill          (optional auth)
 * POST /api/payments/paybill { phone }  lookup by TXTLINK profile phone
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/auth/middleware'
import {
  getPaybillInstructions,
  getPaybillInstructionsByPhone,
} from '@/lib/services/mpesa/paybill-instructions'

export async function GET(request: NextRequest) {
  try {
    const auth = verifyAuth(request)
    const instructions = await getPaybillInstructions(auth?.userId)
    return NextResponse.json({
      success: true,
      ...instructions,
    })
  } catch (error: any) {
    console.error('PayBill instructions error:', error)
    return NextResponse.json(
      { error: 'Could not load PayBill details' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const phone = String(body.phone || '').trim()
    if (!phone) {
      return NextResponse.json({ error: 'Phone number is required' }, { status: 400 })
    }

    const instructions = await getPaybillInstructionsByPhone(phone)
    return NextResponse.json({
      success: true,
      ...instructions,
    })
  } catch (error: any) {
    console.error('PayBill lookup error:', error)
    return NextResponse.json(
      { error: 'Could not look up PayBill account' },
      { status: 500 }
    )
  }
}

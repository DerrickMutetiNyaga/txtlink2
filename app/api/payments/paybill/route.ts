/**
 * Public PayBill instructions — same account number for every user.
 * GET /api/payments/paybill
 */

import { NextResponse } from 'next/server'
import { getPaybillInstructions } from '@/lib/services/mpesa/paybill-instructions'

export async function GET() {
  try {
    const instructions = await getPaybillInstructions()
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

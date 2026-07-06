/**
 * Super Admin M-Pesa C2B Simulation (Sandbox Only)
 * POST /api/super-admin/mpesa/simulate-c2b
 * 
 * Simulates a C2B payment for testing (sandbox only)
 */

import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db/connect'
import { requireOwner } from '@/lib/auth/middleware'
import { MpesaService } from '@/lib/services/mpesa/mpesa-service'

export async function POST(request: NextRequest) {
  try {
    await connectDB()
    const user = requireOwner(request)

    const { phoneNumber, amount, billRefNumber, commandId } = await request.json()

    if (!phoneNumber || !amount) {
      return NextResponse.json(
        { error: 'phoneNumber and amount are required' },
        { status: 400 }
      )
    }

    if (amount <= 0) {
      return NextResponse.json(
        { error: 'amount must be greater than 0' },
        { status: 400 }
      )
    }

    // Create M-Pesa service instance
    const mpesaService = await MpesaService.createFromSettings()
    if (!mpesaService) {
      return NextResponse.json(
        { error: 'M-Pesa configuration is incomplete. Please check your credentials.' },
        { status: 400 }
      )
    }

    // Simulate C2B payment
    const result = await mpesaService.simulateC2BPayment(
      phoneNumber,
      amount,
      billRefNumber || '',
      commandId || 'CustomerPayBillOnline'
    )

    return NextResponse.json({
      success: true,
      message: 'C2B payment simulated successfully',
      data: result,
    })
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message.includes('Forbidden')) {
      return NextResponse.json(
        { error: error.message },
        { status: error.message.includes('Forbidden') ? 403 : 401 }
      )
    }
    console.error('C2B simulation error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to simulate C2B payment',
        details: error.message,
      },
      { status: 500 }
    )
  }
}


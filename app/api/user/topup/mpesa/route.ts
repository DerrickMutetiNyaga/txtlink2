/**
 * Top up wallet via M-Pesa STK Push
 * POST /api/user/topup/mpesa
 *
 * Body:
 * - amountKes: number (required)
 * - phoneNumber: string (required) - Phone number for STK Push
 */

import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db/connect'
import { MpesaTransaction, User } from '@/lib/db/models'
import { requireAuth } from '@/lib/auth/middleware'
import { MpesaService } from '@/lib/services/mpesa/mpesa-service'
import mongoose from 'mongoose'

export async function POST(request: NextRequest) {
  try {
    await connectDB()
    const authUser = requireAuth(request)

    const { amountKes, phoneNumber } = await request.json()

    if (!amountKes || typeof amountKes !== 'number' || amountKes <= 0) {
      return NextResponse.json(
        { error: 'amountKes must be a positive number' },
        { status: 400 }
      )
    }

    if (!phoneNumber || typeof phoneNumber !== 'string') {
      return NextResponse.json(
        { error: 'phoneNumber is required' },
        { status: 400 }
      )
    }

    // Minimum amount check
    if (amountKes < 10) {
      return NextResponse.json(
        { error: 'Minimum top-up amount is KSh 10' },
        { status: 400 }
      )
    }

    const userId = new mongoose.Types.ObjectId(authUser.userId)

    const userDoc = await User.findById(userId)
    if (!userDoc) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get M-Pesa service instance
    const mpesaService = await MpesaService.createFromSettings()
    if (!mpesaService) {
      return NextResponse.json(
        { error: 'M-Pesa gateway is not configured. Please contact support.' },
        { status: 503 }
      )
    }

    // Generate account reference (use user ID for easy lookup)
    const accountReference = `USER-${userId.toString()}`

    // Initiate STK Push
    const stkResponse = await mpesaService.initiateStkPush({
      phoneNumber,
      amount: amountKes,
      accountReference,
      transactionDesc: `SMS Credits Top-up - ${userDoc.email}`,
    })

    // Create pending M-Pesa transaction record
    const mpesaTransaction = await MpesaTransaction.create({
      transactionType: 'STK',
      checkoutRequestId: stkResponse.checkoutRequestId,
      merchantRequestId: stkResponse.merchantRequestId,
      amount: amountKes,
      phoneNumber,
      accountReference,
      status: 'pending',
      responseCode: stkResponse.responseCode,
      resultDesc: stkResponse.responseDescription,
      userId,
    })

    console.log(`STK Push initiated for user ${authUser.email}:`, {
      userId: authUser.userId,
      amountKes,
      checkoutRequestId: stkResponse.checkoutRequestId,
      merchantRequestId: stkResponse.merchantRequestId,
    })

    return NextResponse.json({
      success: true,
      message: stkResponse.customerMessage || 'STK Push request sent. Please check your phone and enter your M-Pesa PIN.',
      checkoutRequestId: stkResponse.checkoutRequestId,
      merchantRequestId: stkResponse.merchantRequestId,
      transactionId: mpesaTransaction._id.toString(),
      status: 'pending',
    })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('M-Pesa STK Push error:', error)
    console.error('Error stack:', error.stack)
    return NextResponse.json(
      { 
        error: error.message || 'Failed to initiate M-Pesa payment. Please try again.',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    )
  }
}



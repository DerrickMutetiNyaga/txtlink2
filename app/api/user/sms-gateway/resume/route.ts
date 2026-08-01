import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db/connect'
import { SmsGatewayDevice } from '@/lib/db/models'
import { requireAuth } from '@/lib/auth/middleware'
import mongoose from 'mongoose'

export async function POST(request: NextRequest) {
  try {
    await connectDB()
    const user = requireAuth(request)
    const userId = new mongoose.Types.ObjectId(user.userId)

    const device = await SmsGatewayDevice.findOne({ userId })
    if (!device) {
      return NextResponse.json({ error: 'No gateway device found' }, { status: 404 })
    }

    device.requiresTopUp = false
    device.topUpAlertDismissed = false
    device.pauseReason = undefined
    device.pausedAt = undefined
    device.isGatewayRunning = true
    await device.save()

    return NextResponse.json({
      success: true,
      message:
        'Gateway marked as reloaded and resumed. Use Retry Phone Fallback to re-queue blocked jobs.',
    })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Resume SMS gateway error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

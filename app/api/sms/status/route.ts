/**
 * SMS Status Read API
 * GET /api/sms/status?messageId=xxx
 *
 * Returns the current status of a message from MongoDB only.
 * The database always holds the latest known delivery status - the Render
 * background worker keeps it up to date. This route never calls the provider.
 */

import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db/connect'
import { SmsMessage, SMS_FINAL_STATUSES } from '@/lib/db/models'
import { requireAuth } from '@/lib/auth/middleware'

export async function GET(request: NextRequest) {
  try {
    await connectDB()
    const user = requireAuth(request)

    const { searchParams } = new URL(request.url)
    const messageId = searchParams.get('messageId')

    if (!messageId) {
      return NextResponse.json(
        { error: 'messageId is required' },
        { status: 400 }
      )
    }

    const message = await SmsMessage.findById(messageId).lean()

    if (!message) {
      return NextResponse.json(
        { error: 'Message not found' },
        { status: 404 }
      )
    }

    // Verify message belongs to user
    if (message.userId.toString() !== user.userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    return NextResponse.json({
      messageId,
      status: message.status,
      providerStatus: message.providerStatus,
      errorMessage: message.errorMessage,
      deliveredAt: message.deliveredAt,
      failedAt: message.failedAt,
      lastCheckedAt: message.lastCheckedAt,
      completed: (SMS_FINAL_STATUSES as readonly string[]).includes(message.status),
    })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Status read error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to read status' },
      { status: 500 }
    )
  }
}

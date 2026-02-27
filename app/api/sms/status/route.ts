/**
 * SMS Status Check API
 * GET /api/sms/status?messageId=xxx
 * 
 * Returns current status of a message
 * Used for real-time status updates without page reload
 */

import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db/connect'
import { SmsMessage } from '@/lib/db/models'
import { requireAuth } from '@/lib/auth/middleware'
import { checkMessageUntilComplete } from '@/lib/services/sms/status-checker'

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

    // Find message and verify ownership
    const message = await SmsMessage.findById(messageId)
    
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

    // Check if message needs status update
    const needsCheck = message.status === 'queued' || 
                      message.status === 'sent' || 
                      message.status === 'processing'

    if (needsCheck) {
      // Check status (non-blocking, quick check)
      const result = await checkMessageUntilComplete(messageId, 1, 0)
      
      // Refresh message
      const updatedMessage = await SmsMessage.findById(messageId)
      
      return NextResponse.json({
        messageId,
        status: updatedMessage?.status || message.status,
        providerStatus: updatedMessage?.providerStatus || message.providerStatus,
        errorMessage: updatedMessage?.errorMessage || message.errorMessage,
        deliveredAt: updatedMessage?.deliveredAt || message.deliveredAt,
        failedAt: updatedMessage?.failedAt || message.failedAt,
        completed: result.completed,
      })
    }

    // Return current status
    return NextResponse.json({
      messageId,
      status: message.status,
      providerStatus: message.providerStatus,
      errorMessage: message.errorMessage,
      deliveredAt: message.deliveredAt,
      failedAt: message.failedAt,
      completed: message.status === 'delivered' || message.status === 'failed',
    })
  } catch (error: any) {
    console.error('Status check error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to check status' },
      { status: 500 }
    )
  }
}


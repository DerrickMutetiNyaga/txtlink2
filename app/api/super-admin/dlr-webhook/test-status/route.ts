/**
 * Check delivery status of a test SMS by transaction ID
 * GET /api/super-admin/dlr-webhook/test-status?transactionId=xxx
 */

import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db/connect'
import { SmsMessage } from '@/lib/db/models'
import { requireOwner } from '@/lib/auth/middleware'

export async function GET(request: NextRequest) {
  try {
    await connectDB()
    requireOwner(request)

    const transactionId = request.nextUrl.searchParams.get('transactionId')
    if (!transactionId) {
      return NextResponse.json({ error: 'transactionId required' }, { status: 400 })
    }

    const msg = await SmsMessage.findOne({ hpTransactionId: transactionId }).lean()
    if (!msg) {
      return NextResponse.json({ status: null, message: 'Message not found' })
    }

    return NextResponse.json({
      status: msg.status,
      message: msg.status === 'delivered'
        ? 'Delivered'
        : msg.status === 'failed'
          ? 'Failed'
          : 'Sent (waiting for DLR)',
    })
  } catch (e: any) {
    if (e.message === 'Forbidden' || e.message === 'Unauthorized') {
      return NextResponse.json({ error: e.message }, { status: 403 })
    }
    return NextResponse.json({ error: e.message || 'Internal server error' }, { status: 500 })
  }
}

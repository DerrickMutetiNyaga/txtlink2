/**
 * Get a billing invoice
 * GET /api/user/billing/invoices/[invoiceId]
 */

import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db/connect'
import { Invoice, SenderIdRequest } from '@/lib/db/models'
import { requireAuth } from '@/lib/auth/middleware'
import { formatInvoice } from '@/lib/validation/sender-id-request'
import mongoose from 'mongoose'

type RouteContext = { params: Promise<{ invoiceId: string }> }

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    await connectDB()
    const user = requireAuth(request)
    const { invoiceId } = await context.params
    const userId = new mongoose.Types.ObjectId(user.userId)

    const invoice = await Invoice.findOne({
      _id: new mongoose.Types.ObjectId(invoiceId),
      userId,
    }).lean()

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }

    let desiredSenderId = ''
    if (invoice.senderIdRequestId) {
      const senderRequest = await SenderIdRequest.findById(invoice.senderIdRequestId)
        .select('desiredSenderId')
        .lean()
      desiredSenderId = senderRequest?.desiredSenderId || ''
    }

    return NextResponse.json({
      success: true,
      invoice: formatInvoice(invoice, desiredSenderId),
    })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Get invoice error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

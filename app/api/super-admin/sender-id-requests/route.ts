/**
 * Super Admin: list Sender ID applications
 * GET /api/super-admin/sender-id-requests?status=
 */

import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db/connect'
import { Invoice, SenderIdRequest } from '@/lib/db/models'
import { requireOwner } from '@/lib/auth/middleware'
import { formatSenderIdRequest } from '@/lib/validation/sender-id-request'

export async function GET(request: NextRequest) {
  try {
    await connectDB()
    await requireOwner(request)

    const status = request.nextUrl.searchParams.get('status')
    const query: Record<string, unknown> = {}
    if (status && status !== 'all') {
      query.status = status
    } else {
      query.status = { $ne: 'draft' }
    }

    const docs = await SenderIdRequest.find(query)
      .populate('userId', 'name email phone')
      .sort({ createdAt: -1 })
      .lean()

    const invoiceIds = docs.map((d) => d.invoiceId).filter(Boolean)
    const invoices = invoiceIds.length
      ? await Invoice.find({ _id: { $in: invoiceIds } }).select('status amount currency paidAt').lean()
      : []
    const invoiceById = new Map(invoices.map((inv) => [inv._id.toString(), inv]))

    const applications = docs.map((doc) => {
      const formatted = formatSenderIdRequest(doc)
      const user = doc.userId && typeof doc.userId === 'object' ? (doc.userId as any) : null
      const invoice = formatted.invoiceId ? invoiceById.get(formatted.invoiceId) : null
      return {
        ...formatted,
        user: user
          ? {
              id: user._id?.toString(),
              name: user.name,
              email: user.email,
              phone: user.phone,
            }
          : null,
        invoice: invoice
          ? {
              id: invoice._id.toString(),
              status: invoice.status,
              amount: invoice.amount,
              currency: invoice.currency,
              paidAt: invoice.paidAt,
            }
          : null,
        hasCertificate: !!(formatted.businessCertificateSecureUrl || formatted.businessCertificateUrl),
      }
    })

    return NextResponse.json({ success: true, applications })
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message?.includes('Forbidden')) {
      return NextResponse.json(
        { error: error.message },
        { status: error.message.includes('Forbidden') ? 403 : 401 }
      )
    }
    console.error('List sender ID applications error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

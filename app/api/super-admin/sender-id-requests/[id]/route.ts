/**
 * Super Admin: view / review a Sender ID application
 * GET   /api/super-admin/sender-id-requests/[id]
 * PATCH /api/super-admin/sender-id-requests/[id]  { action: 'approve' | 'reject', reason? }
 */

import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'
import connectDB from '@/lib/db/connect'
import { Invoice, SenderIdRequest } from '@/lib/db/models'
import { requireOwner } from '@/lib/auth/middleware'
import { formatSenderIdRequest } from '@/lib/validation/sender-id-request'
import { assignSenderIdToUser } from '@/lib/services/senderids/assign-to-user'
import { logAudit } from '@/lib/utils/audit'

async function loadApplication(id: string) {
  const doc = await SenderIdRequest.findById(id).populate('userId', 'name email phone').lean()
  if (!doc) return null

  const formatted = formatSenderIdRequest(doc)
  const user = doc.userId && typeof doc.userId === 'object' ? (doc.userId as any) : null
  const invoice = formatted.invoiceId
    ? await Invoice.findById(formatted.invoiceId).select('status amount currency paidAt').lean()
    : null

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
    hasAuthorizationLetter: !!(
      formatted.authorizationLetterSecureUrl || formatted.authorizationLetterUrl
    ),
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    await connectDB()
    await requireOwner(request)
    const { id } = await Promise.resolve(params)

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid application id' }, { status: 400 })
    }

    const application = await loadApplication(id)
    if (!application) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, application })
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message?.includes('Forbidden')) {
      return NextResponse.json(
        { error: error.message },
        { status: error.message.includes('Forbidden') ? 403 : 401 }
      )
    }
    console.error('Get sender ID application error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    await connectDB()
    const owner = await requireOwner(request)
    const { id } = await Promise.resolve(params)
    const { action, reason } = await request.json()

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid application id' }, { status: 400 })
    }

    const doc = await SenderIdRequest.findById(id)
    if (!doc) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 })
    }

    if (action === 'approve') {
      await assignSenderIdToUser({
        userId: doc.userId.toString(),
        senderName: doc.approvedSenderId || doc.desiredSenderId,
        makeDefault: true,
      })
      doc.status = 'approved'
      doc.approvedSenderId = doc.desiredSenderId
      doc.rejectionReason = ''
      await doc.save()
      await logAudit('APPROVE_SENDER_ID_APPLICATION', 'sender_id_request', owner.userId, owner.email, {
        resourceId: id,
        changes: { desiredSenderId: doc.desiredSenderId },
        request,
      })
    } else if (action === 'reject') {
      const rejectionReason = typeof reason === 'string' ? reason.trim() : ''
      if (!rejectionReason) {
        return NextResponse.json({ error: 'A rejection reason is required' }, { status: 400 })
      }
      doc.status = 'rejected'
      doc.rejectionReason = rejectionReason
      await doc.save()
      await logAudit('REJECT_SENDER_ID_APPLICATION', 'sender_id_request', owner.userId, owner.email, {
        resourceId: id,
        changes: { desiredSenderId: doc.desiredSenderId, rejectionReason },
        request,
      })
    } else {
      return NextResponse.json({ error: 'action must be approve or reject' }, { status: 400 })
    }

    const application = await loadApplication(id)
    return NextResponse.json({ success: true, application })
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message?.includes('Forbidden')) {
      return NextResponse.json(
        { error: error.message },
        { status: error.message.includes('Forbidden') ? 403 : 401 }
      )
    }
    console.error('Review sender ID application error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

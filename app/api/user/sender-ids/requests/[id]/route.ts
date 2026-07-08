/**
 * Update a user Sender ID application request
 * PATCH /api/user/sender-ids/requests/[id]
 */

import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db/connect'
import { SenderIdRequest } from '@/lib/db/models'
import { requireAuth } from '@/lib/auth/middleware'
import { submitSenderIdApplication } from '@/lib/services/sender-id/submit-application'
import mongoose from 'mongoose'
import {
  formatSenderIdRequest,
  validateSenderIdRequest,
  type SenderIdRequestPayload,
} from '@/lib/validation/sender-id-request'

type RouteContext = { params: Promise<{ id: string }> }

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    await connectDB()
    const user = requireAuth(request)
    const { id } = await context.params
    const userId = new mongoose.Types.ObjectId(user.userId)
    const requestId = new mongoose.Types.ObjectId(id)
    const body = (await request.json()) as SenderIdRequestPayload

    const existing = await SenderIdRequest.findOne({ _id: requestId, userId })
    if (!existing) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 })
    }

    if (!['draft', 'rejected'].includes(existing.status)) {
      return NextResponse.json(
        { error: 'Only draft or rejected applications can be updated' },
        { status: 403 }
      )
    }

    const intent = body.status === 'submitted' ? 'submit' : 'draft'
    const { errors, data } = validateSenderIdRequest(body, intent)
    if (!data) {
      return NextResponse.json({ error: 'Validation failed', errors }, { status: 400 })
    }

    if (body.status && !['draft', 'submitted'].includes(body.status)) {
      return NextResponse.json({ error: 'Invalid status update' }, { status: 400 })
    }

    if (intent === 'submit') {
      await SenderIdRequest.deleteOne({ _id: existing._id })

      const result = await submitSenderIdApplication({ userId, data })

      return NextResponse.json({
        success: true,
        request: result.request,
        invoice: result.invoice,
        feeAmount: result.feeAmount,
        message:
          'Sender ID application created. Payment is required before review can begin.',
      })
    }

    existing.desiredSenderId = data.desiredSenderId as string
    existing.businessCertificateUrl = data.businessCertificateUrl as string
    existing.businessCertificateSecureUrl = data.businessCertificateSecureUrl as string
    existing.businessCertificatePublicId = data.businessCertificatePublicId as string
    existing.businessCertificateFileName = data.businessCertificateFileName as string
    existing.businessCertificateMimeType = data.businessCertificateMimeType as string
    existing.businessCertificateSize = data.businessCertificateSize as number
    existing.contactPerson = data.contactPerson as string
    existing.phoneNumber = data.phoneNumber as string
    existing.email = data.email as string
    existing.smsUseCase = data.smsUseCase as string
    existing.sampleSmsMessage = data.sampleSmsMessage as string
    existing.industry = data.industry as string
    existing.status = 'draft'
    existing.rejectionReason = undefined

    await existing.save()

    return NextResponse.json({
      success: true,
      request: formatSenderIdRequest(existing),
      message: 'Draft saved successfully.',
    })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (error.statusCode === 409) {
      return NextResponse.json(
        {
          error: error.message,
          existingInvoiceId: error.existingInvoiceId,
          existingRequestId: error.existingRequestId,
        },
        { status: 409 }
      )
    }
    console.error('Update sender ID request error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

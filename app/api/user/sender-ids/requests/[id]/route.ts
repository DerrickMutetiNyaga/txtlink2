/**
 * Update a user Sender ID application request
 * PATCH /api/user/sender-ids/requests/[id]
 */

import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db/connect'
import { SenderIdRequest } from '@/lib/db/models'
import { requireAuth } from '@/lib/auth/middleware'
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

    existing.desiredSenderId = data.desiredSenderId
    existing.businessName = data.businessName
    existing.businessRegistrationNumber = data.businessRegistrationNumber
    existing.kraPin = data.kraPin
    existing.contactPerson = data.contactPerson
    existing.phoneNumber = data.phoneNumber
    existing.email = data.email
    existing.smsUseCase = data.smsUseCase
    existing.sampleSmsMessage = data.sampleSmsMessage
    existing.industry = data.industry

    if (intent === 'submit') {
      existing.status = 'submitted'
      existing.rejectionReason = undefined
    } else {
      existing.status = 'draft'
    }

    await existing.save()

    return NextResponse.json({
      success: true,
      request: formatSenderIdRequest(existing),
      message:
        intent === 'submit'
          ? 'Sender ID application submitted successfully. We will review it and update you once approved.'
          : 'Draft saved successfully.',
    })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Update sender ID request error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

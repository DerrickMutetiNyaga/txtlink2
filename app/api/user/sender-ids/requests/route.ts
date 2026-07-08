/**
 * User Sender ID application requests
 * GET /api/user/sender-ids/requests
 * POST /api/user/sender-ids/requests
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

export async function GET(request: NextRequest) {
  try {
    await connectDB()
    const user = requireAuth(request)
    const userId = new mongoose.Types.ObjectId(user.userId)

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')

    const query: Record<string, unknown> = { userId }
    if (status) query.status = status

    const requests = await SenderIdRequest.find(query).sort({ updatedAt: -1 }).lean()

    return NextResponse.json({
      success: true,
      requests: requests.map(formatSenderIdRequest),
    })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Get sender ID requests error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB()
    const user = requireAuth(request)
    const userId = new mongoose.Types.ObjectId(user.userId)
    const body = (await request.json()) as SenderIdRequestPayload

    const intent = body.status === 'submitted' ? 'submit' : 'draft'
    const { errors, data } = validateSenderIdRequest(body, intent)

    if (!data) {
      return NextResponse.json({ error: 'Validation failed', errors }, { status: 400 })
    }

    if (intent === 'draft' && !data.desiredSenderId && !data.businessName) {
      return NextResponse.json(
        { error: 'Add at least a desired Sender ID or business name to save a draft' },
        { status: 400 }
      )
    }

    const doc = await SenderIdRequest.create({
      userId,
      workspaceId: userId,
      ...data,
      status: intent === 'submit' ? 'submitted' : 'draft',
    })

    return NextResponse.json({
      success: true,
      request: formatSenderIdRequest(doc),
      message:
        intent === 'submit'
          ? 'Sender ID application submitted successfully. We will review it and update you once approved.'
          : 'Draft saved successfully.',
    })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Create sender ID request error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

/**
 * Update and Delete User Webhooks
 * PATCH /api/user/webhooks/[id] - Update webhook
 * DELETE /api/user/webhooks/[id] - Delete webhook
 */

import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db/connect'
import { UserWebhook } from '@/lib/db/models'
import { requireAuth } from '@/lib/auth/middleware'
import mongoose from 'mongoose'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB()
    const user = requireAuth(request)

    const userId = new mongoose.Types.ObjectId(user.userId)
    const keyId = new mongoose.Types.ObjectId(params.id)
    const body = await request.json()

    // Find and verify ownership
    const webhook = await UserWebhook.findOne({ _id: keyId, userId })

    if (!webhook) {
      return NextResponse.json(
        { error: 'Webhook not found' },
        { status: 404 }
      )
    }

    // Update allowed fields
    if (body.name !== undefined) webhook.name = body.name
    if (body.url !== undefined) {
      try {
        new URL(body.url)
        webhook.url = body.url
      } catch {
        return NextResponse.json(
          { error: 'Invalid URL format' },
          { status: 400 }
        )
      }
    }
    if (body.product !== undefined) {
      if (!['SMS', 'WhatsApp'].includes(body.product)) {
        return NextResponse.json({ error: 'Invalid product' }, { status: 400 })
      }
      webhook.product = body.product
    }
    if (body.serverSendMethod !== undefined) {
      if (!['POST', 'GET', 'JSON', 'XML'].includes(body.serverSendMethod)) {
        return NextResponse.json({ error: 'Invalid server send method' }, { status: 400 })
      }
      webhook.serverSendMethod = body.serverSendMethod
    }
    if (body.reportType !== undefined) {
      if (!['DLR', 'MO'].includes(body.reportType)) {
        return NextResponse.json({ error: 'Invalid report type' }, { status: 400 })
      }
      webhook.reportType = body.reportType
    }
    if (body.wabaNumber !== undefined) webhook.wabaNumber = body.wabaNumber
    if (body.transactionIdParam !== undefined) webhook.transactionIdParam = body.transactionIdParam
    if (body.messageIdParam !== undefined) webhook.messageIdParam = body.messageIdParam
    if (body.errorCodeParam !== undefined) webhook.errorCodeParam = body.errorCodeParam
    if (body.mobileNumberParam !== undefined) webhook.mobileNumberParam = body.mobileNumberParam
    if (body.receivedTimeParam !== undefined) webhook.receivedTimeParam = body.receivedTimeParam
    if (body.deliveredTimeParam !== undefined) webhook.deliveredTimeParam = body.deliveredTimeParam
    if (body.readTimeParam !== undefined) webhook.readTimeParam = body.readTimeParam
    if (body.statusParam !== undefined) webhook.statusParam = body.statusParam
    if (body.customParameters !== undefined) webhook.customParameters = body.customParameters
    if (body.customHeaders !== undefined) webhook.customHeaders = body.customHeaders
    if (body.events !== undefined) {
      const validEvents = ['sms.delivered', 'sms.failed', 'sms.sent', 'balance.low', 'campaign.completed']
      const invalidEvents = body.events.filter((e: string) => !validEvents.includes(e))
      if (invalidEvents.length > 0) {
        return NextResponse.json(
          { error: `Invalid events: ${invalidEvents.join(', ')}` },
          { status: 400 }
        )
      }
      webhook.events = body.events
    }
    if (body.status !== undefined) {
      if (!['active', 'inactive'].includes(body.status)) {
        return NextResponse.json(
          { error: 'Status must be either "active" or "inactive"' },
          { status: 400 }
        )
      }
      webhook.status = body.status
    }

    await webhook.save()

    return NextResponse.json({
      success: true,
      message: 'Webhook updated successfully',
      webhook: {
        id: webhook._id?.toString(),
        name: webhook.name,
        url: webhook.url,
        events: webhook.events,
        status: webhook.status,
      },
    })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Update webhook error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB()
    const user = requireAuth(request)

    const userId = new mongoose.Types.ObjectId(user.userId)
    const webhookId = new mongoose.Types.ObjectId(params.id)

    // Find and verify ownership
    const webhook = await UserWebhook.findOne({ _id: webhookId, userId })

    if (!webhook) {
      return NextResponse.json(
        { error: 'Webhook not found' },
        { status: 404 }
      )
    }

    // Delete the webhook
    await UserWebhook.deleteOne({ _id: webhookId })

    return NextResponse.json({
      success: true,
      message: 'Webhook deleted successfully',
    })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Delete webhook error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}


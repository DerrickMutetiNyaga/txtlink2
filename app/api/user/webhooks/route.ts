/**
 * Get and Create User Webhooks
 * GET /api/user/webhooks - Get user's webhooks
 * POST /api/user/webhooks - Create new webhook
 * POST /api/user/webhooks/test - Test webhook
 */

import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db/connect'
import { UserWebhook, UserSenderId } from '@/lib/db/models'
import { requireAuth } from '@/lib/auth/middleware'
import { testWebhook } from '@/lib/services/webhook/delivery'
import mongoose from 'mongoose'
import crypto from 'crypto'

export async function GET(request: NextRequest) {
  try {
    await connectDB()
    const user = requireAuth(request)

    const userId = new mongoose.Types.ObjectId(user.userId)
    const webhooks = await UserWebhook.find({ userId })
      .sort({ createdAt: -1 })
      .lean()

    // Check if user has any sender IDs
    const senderIdCount = await UserSenderId.countDocuments({ userId })

    const formattedWebhooks = webhooks.map((webhook: any) => ({
      id: webhook._id?.toString(),
      name: webhook.name,
      product: webhook.product,
      serverSendMethod: webhook.serverSendMethod,
      reportType: webhook.reportType,
      wabaNumber: webhook.wabaNumber,
      url: webhook.url,
      transactionIdParam: webhook.transactionIdParam,
      messageIdParam: webhook.messageIdParam,
      errorCodeParam: webhook.errorCodeParam,
      mobileNumberParam: webhook.mobileNumberParam,
      receivedTimeParam: webhook.receivedTimeParam,
      deliveredTimeParam: webhook.deliveredTimeParam,
      readTimeParam: webhook.readTimeParam,
      statusParam: webhook.statusParam,
      customParameters: webhook.customParameters || [],
      customHeaders: webhook.customHeaders || [],
      events: webhook.events,
      status: webhook.status,
      lastTriggeredAt: webhook.lastTriggeredAt,
      lastTestResponse: webhook.lastTestResponse,
      createdAt: webhook.createdAt,
      secret: `whsec_${webhook.secret.substring(0, 8)}...`, // Only show prefix
    }))

    return NextResponse.json({
      success: true,
      webhooks: formattedWebhooks,
      hasSenderIds: senderIdCount > 0,
    })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Get webhooks error:', error)
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
    const body = await request.json()

    // Check if this is a test request
    if (body.action === 'test' && body.webhookId) {
      const webhook = await UserWebhook.findOne({
        _id: new mongoose.Types.ObjectId(body.webhookId),
        userId,
      })

      if (!webhook) {
        return NextResponse.json({ error: 'Webhook not found' }, { status: 404 })
      }

      const result = await testWebhook(webhook)

      // Update last test response
      await UserWebhook.findByIdAndUpdate(webhook._id, {
        lastTestResponse: result.success
          ? result.response
          : `Error: ${result.error}`,
      })

      return NextResponse.json({
        success: result.success,
        response: result.response,
        error: result.error,
      })
    }

    // Regular webhook creation
    const {
      name,
      product,
      serverSendMethod,
      reportType,
      wabaNumber,
      url,
      transactionIdParam,
      messageIdParam,
      errorCodeParam,
      mobileNumberParam,
      receivedTimeParam,
      deliveredTimeParam,
      readTimeParam,
      statusParam,
      customParameters,
      customHeaders,
    } = body

    // Validation
    if (!product || !serverSendMethod || !reportType || !url) {
      return NextResponse.json(
        { error: 'Product, Server Send Method, Report Type, and URL are required' },
        { status: 400 }
      )
    }

    // Validate product
    if (!['SMS', 'WhatsApp'].includes(product)) {
      return NextResponse.json({ error: 'Product must be SMS or WhatsApp' }, { status: 400 })
    }

    // Validate server send method
    if (!['POST', 'GET', 'JSON', 'XML'].includes(serverSendMethod)) {
      return NextResponse.json(
        { error: 'Server Send Method must be POST, GET, JSON, or XML' },
        { status: 400 }
      )
    }

    // Validate report type
    if (!['DLR', 'MO'].includes(reportType)) {
      return NextResponse.json({ error: 'Report Type must be DLR or MO' }, { status: 400 })
    }

    // MO is disabled for SMS
    if (product === 'SMS' && reportType === 'MO') {
      return NextResponse.json(
        { error: 'MO report type is not available for SMS product' },
        { status: 400 }
      )
    }

    // Waba Number required for WhatsApp
    if (product === 'WhatsApp' && !wabaNumber) {
      return NextResponse.json(
        { error: 'Waba Number is required for WhatsApp webhooks' },
        { status: 400 }
      )
    }

    // Validate URL format
    try {
      new URL(url)
    } catch {
      return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 })
    }

    // Check if user has at least one sender ID (for SMS)
    if (product === 'SMS') {
      const senderIdCount = await UserSenderId.countDocuments({ userId })
      if (senderIdCount === 0) {
        return NextResponse.json(
          {
            error:
              'You must have at least one approved sender ID before creating a webhook. Please request a sender ID first.',
          },
          { status: 400 }
        )
      }
    }

    // Validate required parameters for DLR
    if (reportType === 'DLR') {
      if (
        !transactionIdParam ||
        !messageIdParam ||
        !errorCodeParam ||
        !mobileNumberParam ||
        !receivedTimeParam ||
        !deliveredTimeParam
      ) {
        return NextResponse.json(
          {
            error:
              'All required parameters must be specified: Transaction ID, Message ID, Error Code, Mobile Number, Received Time, Delivered Time',
          },
          { status: 400 }
        )
      }
    }

    // Generate webhook secret
    const secret = crypto.randomBytes(32).toString('hex')

    // Create webhook
    const webhook = await UserWebhook.create({
      userId,
      name: name || `${product} ${reportType} Webhook`,
      product,
      serverSendMethod,
      reportType,
      wabaNumber: product === 'WhatsApp' ? wabaNumber : undefined,
      url,
      transactionIdParam,
      messageIdParam,
      errorCodeParam,
      mobileNumberParam,
      receivedTimeParam,
      deliveredTimeParam,
      readTimeParam: product === 'WhatsApp' ? readTimeParam : undefined,
      statusParam: product === 'WhatsApp' ? statusParam : undefined,
      customParameters: customParameters || [],
      customHeaders: customHeaders || [],
      secret,
      status: 'active',
    })

    return NextResponse.json({
      success: true,
      webhook: {
        id: webhook._id?.toString(),
        name: webhook.name,
        product: webhook.product,
        serverSendMethod: webhook.serverSendMethod,
        reportType: webhook.reportType,
        wabaNumber: webhook.wabaNumber,
        url: webhook.url,
        status: webhook.status,
        createdAt: webhook.createdAt,
      },
    })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Create webhook error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}


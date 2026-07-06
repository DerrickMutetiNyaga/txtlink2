/**
 * Super Admin: Audit Logs
 * GET /api/super-admin/audit
 */

import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db/connect'
import { AuditLog, WebhookLog } from '@/lib/db/models'
import { requireOwner } from '@/lib/auth/middleware'

export async function GET(request: NextRequest) {
  try {
    await connectDB()
    requireOwner(request)

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'audit' // 'audit' or 'webhook'
    const limit = parseInt(searchParams.get('limit') || '100')
    const skip = parseInt(searchParams.get('skip') || '0')
    const transactionId = searchParams.get('transactionId')

    if (type === 'webhook') {
      const match: any = {}
      if (transactionId) {
        match.transactionId = { $regex: transactionId, $options: 'i' }
      }

      const webhooks = await WebhookLog.find(match)
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(skip)

      const total = await WebhookLog.countDocuments(match)

      return NextResponse.json({
        success: true,
        logs: webhooks,
        total,
      })
    } else {
      // Audit logs with filters
      const match: any = {}
      const startDate = searchParams.get('startDate')
      const endDate = searchParams.get('endDate')
      const action = searchParams.get('action')
      const resource = searchParams.get('resource')
      const userId = searchParams.get('userId')
      const search = searchParams.get('search')

      // Date range filter
      if (startDate || endDate) {
        match.createdAt = {}
        if (startDate) {
          match.createdAt.$gte = new Date(startDate)
        }
        if (endDate) {
          match.createdAt.$lte = new Date(endDate)
        }
      }

      // Action filter
      if (action) {
        match.action = action
      }

      // Resource type filter
      if (resource) {
        match.resource = resource
      }

      // User filter (by email or ID)
      if (userId) {
        const mongoose = require('mongoose')
        // Try to match as ObjectId first, then as email
        if (mongoose.Types.ObjectId.isValid(userId)) {
          match.userId = new mongoose.Types.ObjectId(userId)
        } else {
          match.userEmail = { $regex: userId, $options: 'i' }
        }
      }

      // Search filter (resourceId or userEmail)
      if (search) {
        match.$or = [
          { resourceId: { $regex: search, $options: 'i' } },
          { userEmail: { $regex: search, $options: 'i' } },
        ]
      }

      const logs = await AuditLog.find(match)
        .populate('userId', 'name email')
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(skip)

      const total = await AuditLog.countDocuments(match)

      return NextResponse.json({
        success: true,
        logs,
        total,
      })
    }
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message.includes('Forbidden')) {
      return NextResponse.json(
        { error: error.message },
        { status: error.message.includes('Forbidden') ? 403 : 401 }
      )
    }
    console.error('Get audit logs error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}


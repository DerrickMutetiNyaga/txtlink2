/**
 * Admin: Manage User Sender IDs
 * POST /api/admin/users/[id]/senderids - Assign sender ID
 * DELETE /api/admin/users/[id]/senderids/[senderId] - Remove sender ID
 */

import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db/connect'
import { SenderId, UserSenderId, User } from '@/lib/db/models'
import { requireAdmin } from '@/lib/auth/middleware'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    await connectDB()
    requireAdmin(request)

    const { senderName, senderId, status } = await request.json()
    const resolvedParams = await Promise.resolve(params)
    const userId = resolvedParams.id
    
    console.log('Assign sender ID request:', { userId, senderName, senderId, status })
    
    // Verify user exists
    const mongoose = require('mongoose')
    const userObjectId = new mongoose.Types.ObjectId(userId)
    const user = await User.findById(userObjectId)
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (!senderName && !senderId) {
      return NextResponse.json(
        { error: 'Either senderName or senderId is required' },
        { status: 400 }
      )
    }

    let senderIdDoc

    if (senderId) {
      // Use existing sender ID
      senderIdDoc = await SenderId.findById(senderId)
    } else if (senderName) {
      // Find or create sender ID (case-insensitive search)
      senderIdDoc = await SenderId.findOne({ 
        senderName: { $regex: new RegExp(`^${senderName}$`, 'i') }
      })
      if (!senderIdDoc) {
        // Normalize status from HostPinnacle (if provided)
        const normalizedStatus = status === 'approved' || status === 'active' 
          ? 'active' 
          : status === 'rejected' 
          ? 'rejected' 
          : 'pending'
        
        senderIdDoc = await SenderId.create({
          senderName,
          provider: 'hostpinnacle',
          status: normalizedStatus,
        })
      }
    }

    if (!senderIdDoc) {
      return NextResponse.json({ error: 'Sender ID not found' }, { status: 404 })
    }

    // Check if already linked
    const existing = await UserSenderId.findOne({
      userId,
      senderId: senderIdDoc._id,
    })

    if (existing) {
      return NextResponse.json(
        { error: 'Sender ID already linked to this user' },
        { status: 400 }
      )
    }

    // Link sender ID to user
    await UserSenderId.create({
      userId: userObjectId,
      senderId: senderIdDoc._id,
      isDefault: false,
    })

    console.log('Successfully assigned sender ID:', {
      userId: userObjectId.toString(),
      senderId: senderIdDoc._id.toString(),
      senderName: senderIdDoc.senderName,
    })

    return NextResponse.json({
      success: true,
      senderId: {
        id: senderIdDoc._id,
        senderName: senderIdDoc.senderName,
        status: senderIdDoc.status,
      },
    })
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message.includes('Forbidden')) {
      return NextResponse.json({ error: error.message }, { status: error.message.includes('Forbidden') ? 403 : 401 })
    }
    console.error('Assign sender ID error:', error)
    console.error('Error stack:', error.stack)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message, stack: process.env.NODE_ENV === 'development' ? error.stack : undefined },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; senderId: string }> | { id: string; senderId: string } }
) {
  try {
    await connectDB()
    requireAdmin(request)

    const resolvedParams = await Promise.resolve(params)
    const userId = resolvedParams.id
    const senderId = resolvedParams.senderId

    const mongoose = require('mongoose')
    const userObjectId = new mongoose.Types.ObjectId(userId)
    const senderObjectId = new mongoose.Types.ObjectId(senderId)

    const result = await UserSenderId.findOneAndDelete({
      userId: userObjectId,
      senderId: senderObjectId,
    })

    if (!result) {
      return NextResponse.json(
        { error: 'Sender ID link not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message.includes('Forbidden')) {
      return NextResponse.json({ error: error.message }, { status: error.message.includes('Forbidden') ? 403 : 401 })
    }
    console.error('Remove sender ID error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}


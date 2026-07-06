/**
 * Super Admin: Assign Sender ID to User
 * POST /api/super-admin/accounts/[id]/senderids/assign
 */

import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db/connect'
import { User, SenderId, UserSenderId } from '@/lib/db/models'
import { requireOwner, requireAdmin } from '@/lib/auth/middleware'
import { logAuditAction } from '@/lib/utils/audit'
import mongoose from 'mongoose'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB()
    
    // Allow both owner and admin to assign sender IDs
    let admin: any
    try {
      admin = requireOwner(request)
    } catch (ownerError) {
      try {
        admin = requireAdmin(request)
      } catch (adminError) {
        return NextResponse.json({ error: 'Unauthorized: Owner or Admin access required' }, { status: 403 })
      }
    }
    
    const { id: userId } = await params

    const { senderId, senderName, makeDefault } = await request.json()

    if (!senderId && !senderName) {
      return NextResponse.json({ error: 'senderId or senderName is required' }, { status: 400 })
    }

    const userObjectId = new mongoose.Types.ObjectId(userId)
    const user = await User.findById(userObjectId)
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    let senderIdObject: any = null

    // Helper function to check if a string is a valid ObjectId
    const isValidObjectId = (str: string): boolean => {
      return mongoose.Types.ObjectId.isValid(str) && str.length === 24
    }

    // Determine if we have a senderId (ObjectId) or senderName (string)
    const actualSenderName = senderName || (senderId && !isValidObjectId(senderId) ? senderId : null)
    const actualSenderId = senderId && isValidObjectId(senderId) ? senderId : null

    // Find or create sender ID
    if (actualSenderId) {
      // senderId is a valid ObjectId, find by ID
      senderIdObject = await SenderId.findById(actualSenderId)
      if (!senderIdObject) {
        return NextResponse.json({ error: 'Sender ID not found' }, { status: 404 })
      }
    } else if (actualSenderName) {
      // senderName provided or senderId is actually a name string
      // IMPORTANT: Save exactly as provided (case-sensitive) to match HostPinnacle
      // First check exact case
      let existingSenderId = await SenderId.findOne({ senderName: actualSenderName })
      
      if (!existingSenderId) {
        // Check case-insensitive match
        existingSenderId = await SenderId.findOne({ 
          senderName: { $regex: new RegExp(`^${actualSenderName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } 
        })
        
        if (existingSenderId) {
          // Found with different case - update to exact case
          try {
            existingSenderId.senderName = actualSenderName
            await existingSenderId.save()
            senderIdObject = existingSenderId
          } catch (updateError: any) {
            // Duplicate key error - exact case already exists
            if (updateError.code === 11000 && updateError.keyPattern?.senderName) {
              // Use the exact case one
              senderIdObject = await SenderId.findOne({ senderName: actualSenderName })
              if (!senderIdObject) {
                return NextResponse.json({ error: 'Failed to find or create sender ID' }, { status: 500 })
              }
              // Delete the old case-insensitive match if different
              if (existingSenderId._id.toString() !== senderIdObject._id.toString()) {
                // Transfer any user assignments
                await UserSenderId.updateMany(
                  { senderId: existingSenderId._id },
                  { senderId: senderIdObject._id }
                )
                await SenderId.deleteOne({ _id: existingSenderId._id })
              }
            } else {
              throw updateError
            }
          }
        } else {
          // Create new with exact case
          try {
            senderIdObject = await SenderId.create({
              senderName: actualSenderName, // Exact case - no toUpperCase()
              provider: 'hostpinnacle',
              status: 'active',
            })
          } catch (createError: any) {
            // Handle duplicate key error (race condition)
            if (createError.code === 11000 && createError.keyPattern?.senderName) {
              senderIdObject = await SenderId.findOne({ senderName: actualSenderName })
              if (!senderIdObject) {
                return NextResponse.json({ error: 'Failed to find or create sender ID' }, { status: 500 })
              }
            } else {
              throw createError
            }
          }
        }
      } else {
        // Exact case found - use it
        senderIdObject = existingSenderId
      }
    }

    if (!senderIdObject || !senderIdObject._id) {
      return NextResponse.json({ error: 'Failed to find or create sender ID' }, { status: 500 })
    }

    // Check if sender ID is already assigned
    // As super admin, we can transfer sender IDs by removing the old assignment
    const existingAssignment = await UserSenderId.findOne({ senderId: senderIdObject._id })
    if (existingAssignment) {
      if (existingAssignment.userId.toString() === userId) {
        // Already assigned to this user
        return NextResponse.json({ error: 'Sender ID is already assigned to this user' }, { status: 400 })
      } else {
        // Transfer: Remove old assignment first (super admin privilege)
        await UserSenderId.deleteOne({ _id: existingAssignment._id })
        console.log(`Super admin transferred sender ID ${senderIdObject.senderName} from user ${existingAssignment.userId} to user ${userId}`)
      }
    }

    // If this is the first sender ID for the user, make it default
    const userSenderIdCount = await UserSenderId.countDocuments({ userId: userObjectId })
    const shouldBeDefault = makeDefault || userSenderIdCount === 0

    if (shouldBeDefault) {
      // Unset other defaults
      await UserSenderId.updateMany({ userId: userObjectId }, { isDefault: false })
    }

    // Create assignment
    const userSenderId = await UserSenderId.create({
      userId: userObjectId,
      senderId: senderIdObject._id,
      isDefault: shouldBeDefault,
    })

    // Log audit
    try {
      await logAuditAction(
        String(admin.userId),
        'ASSIGN_SENDERID',
        'UserSenderId',
        String(userSenderId._id),
        {
          userId,
          senderId: String(senderIdObject._id),
          senderName: senderIdObject.senderName,
          makeDefault: shouldBeDefault,
        }
      )
    } catch (auditError) {
      // Log audit error but don't fail the request
      console.error('Failed to log audit action:', auditError)
    }

    return NextResponse.json({
      success: true,
      userSenderId: {
        id: userSenderId._id?.toString() || userSenderId._id,
        senderId: senderIdObject._id?.toString() || senderIdObject._id,
        senderName: senderIdObject.senderName,
        status: senderIdObject.status,
        isDefault: userSenderId.isDefault,
      },
    })
  } catch (error: any) {
    // Handle authentication errors
    if (error.message === 'Unauthorized' || error.message === 'Forbidden: Owner access required' || error.message === 'Forbidden: Admin access required') {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    
    // Handle duplicate key errors (unique index violations)
    if (error.code === 11000) {
      // Check which unique index was violated
      if (error.keyPattern?.senderId) {
        return NextResponse.json({ 
          error: 'Sender ID is already assigned to another user',
          details: 'This sender ID can only be assigned to one user at a time'
        }, { status: 400 })
      }
      if (error.keyPattern?.['userId'] && error.keyPattern?.['isDefault']) {
        return NextResponse.json({ 
          error: 'User already has a default sender ID',
          details: 'Please unset the current default before setting a new one'
        }, { status: 400 })
      }
      return NextResponse.json({ error: 'Duplicate entry violation', details: error.message }, { status: 400 })
    }
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      return NextResponse.json({ error: 'Validation error', details: error.message }, { status: 400 })
    }
    
    // Log full error for debugging
    console.error('Assign sender ID error:', {
      message: error.message,
      stack: error.stack,
      code: error.code,
      name: error.name,
      keyPattern: error.keyPattern,
    })
    
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: process.env.NODE_ENV === 'development' ? error.message : 'An unexpected error occurred'
    }, { status: 500 })
  }
}


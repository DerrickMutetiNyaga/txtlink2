/**
 * Audit Logging Utility
 */

import { AuditLog } from '@/lib/db/models'
import { NextRequest } from 'next/server'
import connectDB from '@/lib/db/connect'
import { User } from '@/lib/db/models'
import mongoose from 'mongoose'

export async function logAudit(
  action: string,
  resource: string,
  userId: string,
  userEmail: string,
  options?: {
    resourceId?: string
    changes?: Record<string, any>
    metadata?: Record<string, any>
    request?: NextRequest
  }
) {
  try {
    const ipAddress = options?.request?.headers.get('x-forwarded-for') || 
                     options?.request?.headers.get('x-real-ip') || 
                     'unknown'
    const userAgent = options?.request?.headers.get('user-agent') || 'unknown'
    
    await AuditLog.create({
      action,
      resource,
      resourceId: options?.resourceId,
      userId: new mongoose.Types.ObjectId(userId),
      userEmail,
      changes: options?.changes,
      metadata: options?.metadata,
      ipAddress,
      userAgent,
    })
  } catch (error) {
    console.error('Failed to log audit:', error)
    // Don't throw - audit logging should not break the main flow
  }
}

/**
 * Simplified audit logging for super admin actions
 */
export async function logAuditAction(
  actorUserId: string,
  action: string,
  entityType: string,
  entityId?: string,
  details: Record<string, any> = {}
) {
  try {
    await connectDB()
    
    // Convert userId to string if it's an ObjectId
    const userIdStr = typeof actorUserId === 'string' 
      ? actorUserId 
      : (actorUserId?.toString ? actorUserId.toString() : String(actorUserId))
    
    if (!userIdStr) {
      console.error('logAuditAction: actorUserId is required')
      return
    }

    const actor = await User.findById(userIdStr)
    if (!actor) {
      console.error(`logAuditAction: User not found for userId: ${userIdStr}`)
      return
    }

    const ipAddress = 'unknown' // Could be passed from request if needed
    const userAgent = 'unknown'

    await AuditLog.create({
      action,
      resource: entityType,
      resourceId: entityId,
      userId: new mongoose.Types.ObjectId(userIdStr),
      userEmail: actor.email,
      changes: details,
      metadata: details,
      ipAddress,
      userAgent,
    })
  } catch (error: any) {
    console.error('Failed to log audit action:', error)
    // Don't throw - audit logging should not break the main flow
  }
}


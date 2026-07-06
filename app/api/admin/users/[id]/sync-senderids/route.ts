/**
 * Admin: Sync Sender IDs from HostPinnacle
 * POST /api/admin/users/[id]/sync-senderids
 */

import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db/connect'
import { SenderId, UserSenderId, HostPinnacleAccount } from '@/lib/db/models'
import { hostPinnacleClient } from '@/lib/services/hostpinnacle/client'
import { requireAdmin } from '@/lib/auth/middleware'
import { decrypt } from '@/lib/utils/encryption'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    await connectDB()
    requireAdmin(request)

    const resolvedParams = await Promise.resolve(params)
    const userId = resolvedParams.id

    const mongoose = require('mongoose')
    const userObjectId = new mongoose.Types.ObjectId(userId)

    // Get HostPinnacle account
    const hpAccount = await HostPinnacleAccount.findOne({ userId: userObjectId })
    if (!hpAccount) {
      return NextResponse.json(
        { error: 'HostPinnacle account not found' },
        { status: 404 }
      )
    }

    // Get credentials
    const apiKey = hpAccount.hpApiKeyEncrypted
      ? decrypt(hpAccount.hpApiKeyEncrypted)
      : undefined
    const password = hpAccount.hpPasswordEncrypted
      ? decrypt(hpAccount.hpPasswordEncrypted)
      : undefined

    // Fetch sender IDs from HostPinnacle
    const hpResult = await hostPinnacleClient.readSenderIds({
      options: {
        apiKey,
        userId: hpAccount.hpUserLoginName,
        password,
      },
    })

    if (!hpResult.success) {
      return NextResponse.json(
        { error: 'Failed to fetch sender IDs from HostPinnacle', details: hpResult.error },
        { status: 500 }
      )
    }

    // Parse response - HostPinnacle format: response.senderidList[].senderid.senderName
    const hpData = hpResult.data || {}
    let senderIdList: any[] = []
    
    // Handle nested structure: response.senderidList[].senderid.senderName
    if (hpData.response && hpData.response.senderidList) {
      senderIdList = hpData.response.senderidList
    } else if (Array.isArray(hpData)) {
      senderIdList = hpData
    } else if (hpData.senderids) {
      senderIdList = Array.isArray(hpData.senderids) ? hpData.senderids : []
    } else if (hpData.data) {
      senderIdList = Array.isArray(hpData.data) ? hpData.data : []
    }

    const synced: any[] = []

    for (const hpSid of senderIdList) {
      // Extract from nested structure: hpSid.senderid.senderName or direct hpSid.senderName
      const senderidObj = hpSid.senderid || hpSid
      // IMPORTANT: Save exactly as it appears in HostPinnacle (case-sensitive)
      const senderName = senderidObj.senderName || senderidObj.senderid || senderidObj.senderId || senderidObj.sender_name || senderidObj.name
      const status = senderidObj.isEnabled || senderidObj.status || hpSid.status || hpSid.approval_status || hpSid.state || 'pending'
      const hpSenderId = senderidObj.sId || senderidObj.id || hpSid.id || hpSid.sId

      if (!senderName) {
        console.warn('Skipping sender ID entry without name:', hpSid)
        continue
      }

      // Find or create sender ID - use exact case from HostPinnacle
      // First, check if exact case already exists
      let senderId = await SenderId.findOne({ senderName })
      
      if (!senderId) {
        // Exact case not found - check for case-insensitive match
        const caseInsensitiveMatch = await SenderId.findOne({ 
          senderName: { $regex: new RegExp(`^${senderName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } 
        })
        
        if (caseInsensitiveMatch) {
          // Found with different case - check if exact case exists (race condition)
          const exactCaseCheck = await SenderId.findOne({ senderName })
          if (exactCaseCheck) {
            // Exact case was created between our checks - use it
            senderId = exactCaseCheck
          } else {
            // Update the case-insensitive match to exact case
            // But first check if exact case exists to avoid duplicate key error
            try {
              caseInsensitiveMatch.senderName = senderName
              await caseInsensitiveMatch.save()
              senderId = caseInsensitiveMatch
            } catch (updateError: any) {
              // Duplicate key error - exact case was created
              if (updateError.code === 11000 && updateError.keyPattern?.senderName) {
                senderId = await SenderId.findOne({ senderName })
                if (!senderId) {
                  console.error('Duplicate key error but exact case sender ID not found')
                  continue
                }
                // Delete the old case-insensitive match if it's different
                if (caseInsensitiveMatch._id.toString() !== senderId._id.toString()) {
                  // Transfer any user assignments to the exact case one
                  await UserSenderId.updateMany(
                    { senderId: caseInsensitiveMatch._id },
                    { senderId: senderId._id }
                  )
                  await SenderId.deleteOne({ _id: caseInsensitiveMatch._id })
                }
              } else {
                throw updateError
              }
            }
          }
        } else {
          // No match found - create new with exact case from HostPinnacle
          try {
            senderId = await SenderId.create({
              senderName, // Exact case from HostPinnacle
              provider: 'hostpinnacle',
              status: status === 'Active' || status === 'approved' || status === 'active' ? 'active' : status === 'rejected' ? 'rejected' : 'pending',
              hpSenderId: hpSenderId,
            })
          } catch (createError: any) {
            // Handle duplicate key error (race condition)
            if (createError.code === 11000 && createError.keyPattern?.senderName) {
              senderId = await SenderId.findOne({ senderName })
              if (!senderId) {
                console.error('Duplicate key error but sender ID not found:', senderName)
                continue
              }
            } else {
              throw createError
            }
          }
        }
      }
      
      // Update status and hpSenderId
      senderId.status = status === 'Active' || status === 'approved' || status === 'active' ? 'active' : status === 'rejected' ? 'rejected' : 'pending'
      if (hpSenderId) {
        senderId.hpSenderId = hpSenderId
      }
      await senderId.save()

      // Link to user if not already linked
      const existing = await UserSenderId.findOne({
        userId: userObjectId,
        senderId: senderId._id,
      })

      if (!existing) {
        await UserSenderId.create({
          userId: userObjectId,
          senderId: senderId._id,
          isDefault: false,
        })
      }

      synced.push({
        id: senderId._id,
        senderName: senderId.senderName,
        status: senderId.status,
      })
    }

    return NextResponse.json({
      success: true,
      synced,
      count: synced.length,
    })
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message.includes('Forbidden')) {
      return NextResponse.json({ error: error.message }, { status: error.message.includes('Forbidden') ? 403 : 401 })
    }
    console.error('Sync sender IDs error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}


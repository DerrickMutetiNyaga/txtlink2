/**
 * Admin: Fetch All Sender IDs from HostPinnacle (Master Account)
 * GET /api/admin/senderids
 */

import { NextRequest, NextResponse } from 'next/server'
import { hostPinnacleClient } from '@/lib/services/hostpinnacle/client'
import { requireAdmin } from '@/lib/auth/middleware'

export async function GET(request: NextRequest) {
  try {
    requireAdmin(request)

    // Use master account credentials from env
    // Try API key first, then fallback to userId/password
    console.log('Fetching sender IDs from HostPinnacle...')
    console.log('Using credentials:', {
      userId: process.env.HOSTPINNACLE_USERID,
      hasPassword: !!process.env.HOSTPINNACLE_PASSWORD,
      hasApiKey: !!process.env.HOSTPINNACLE_API_KEY,
    })
    
    const result = await hostPinnacleClient.readSenderIds({
      options: {
        apiKey: process.env.HOSTPINNACLE_API_KEY,
        userId: process.env.HOSTPINNACLE_USERID,
        password: process.env.HOSTPINNACLE_PASSWORD,
      },
    })

    console.log('HostPinnacle response:', JSON.stringify(result, null, 2))

    if (!result.success) {
      console.error('HostPinnacle error:', result.error)
      return NextResponse.json(
        { error: 'Failed to fetch sender IDs from HostPinnacle', details: result.error },
        { status: 500 }
      )
    }

    // Parse response - HostPinnacle format: { response: { senderidList: [{ senderid: {...} }] } }
    const hpData = result.data || result || {}
    console.log('Raw sender IDs data:', JSON.stringify(hpData, null, 2))
    
    // Extract senderidList from response structure
    let senderIdList: any[] = []
    
    if (hpData.response && hpData.response.senderidList) {
      // HostPinnacle format: response.senderidList[].senderid
      senderIdList = hpData.response.senderidList
    } else if (Array.isArray(hpData)) {
      senderIdList = hpData
    } else if (hpData.senderidList) {
      senderIdList = hpData.senderidList
    } else if (hpData.senderids) {
      senderIdList = Array.isArray(hpData.senderids) ? hpData.senderids : []
    } else if (hpData.senderid) {
      senderIdList = Array.isArray(hpData.senderid) ? hpData.senderid : [hpData.senderid]
    }

    console.log('Parsed sender ID list:', JSON.stringify(senderIdList, null, 2))
    console.log('Sender ID list length:', senderIdList.length)

    // Normalize sender IDs - handle HostPinnacle format: { senderid: { senderName, isEnabled, sId } }
    const normalized = senderIdList.map((item: any) => {
      // Handle nested structure: item.senderid.senderName
      const senderIdObj = item.senderid || item
      
      const senderName = senderIdObj.senderName || 
                         senderIdObj.senderid || 
                         senderIdObj.senderId || 
                         senderIdObj.sender_name || 
                         senderIdObj.name
      
      // Map isEnabled to status
      const isEnabled = senderIdObj.isEnabled || senderIdObj.is_enabled || senderIdObj.status
      let status = 'pending'
      if (isEnabled === 'Active' || isEnabled === 'active' || isEnabled === 'approved') {
        status = 'active'
      } else if (isEnabled === 'Rejected' || isEnabled === 'rejected') {
        status = 'rejected'
      } else if (senderIdObj.status) {
        status = senderIdObj.status.toLowerCase()
      }
      
      const hpSenderId = senderIdObj.sId || senderIdObj.id || senderIdObj.ID
      
      return {
        senderName,
        status,
        hpSenderId,
      }
    }).filter((sid: any) => sid.senderName) // Remove invalid entries

    console.log('Normalized sender IDs:', JSON.stringify(normalized, null, 2))

    return NextResponse.json({
      success: true,
      senderIds: normalized,
      count: normalized.length,
    })
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message.includes('Forbidden')) {
      return NextResponse.json(
        { error: error.message },
        { status: error.message.includes('Forbidden') ? 403 : 401 }
      )
    }
    console.error('Fetch sender IDs error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}


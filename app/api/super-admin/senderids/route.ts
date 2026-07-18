/**
 * Super Admin: Fetch all Sender IDs from HostPinnacle
 * GET /api/super-admin/senderids
 */

import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db/connect'
import { requireOwner } from '@/lib/auth/middleware'
import { hostPinnacleClient } from '@/lib/services/hostpinnacle/client'
import { loadMasterHostPinnacleCredentials } from '@/lib/services/hostpinnacle/credentials'
import {
  parseHostPinnacleSenderIds,
  upsertSenderIdFromHostPinnacle,
  getSenderIdAssignmentMap,
} from '@/lib/services/hostpinnacle/sender-ids'

export async function GET(request: NextRequest) {
  try {
    await connectDB()
    requireOwner(request)

    const creds = await loadMasterHostPinnacleCredentials()
    if (!creds) {
      return NextResponse.json(
        {
          error:
            'HostPinnacle is not configured. Set credentials in Super Admin → Settings or environment variables.',
        },
        { status: 503 }
      )
    }

    const result = await hostPinnacleClient.readSenderIds({
      options: {
        userId: creds.userId,
        password: creds.password,
        apiKey: creds.apiKey,
      },
    })

    if (!result.success) {
      return NextResponse.json(
        { error: 'Failed to fetch sender IDs from HostPinnacle', details: result.error || result.message },
        { status: 502 }
      )
    }

    const normalized = parseHostPinnacleSenderIds(result.data || result)
    const assignmentMap = await getSenderIdAssignmentMap()

    const senderIds = await Promise.all(
      normalized.map(async (item) => {
        const doc = await upsertSenderIdFromHostPinnacle(item)
        const assignees = assignmentMap.get(doc._id.toString()) || []

        return {
          id: doc._id.toString(),
          senderName: doc.senderName,
          status: doc.status,
          hpSenderId: doc.hpSenderId || item.hpSenderId,
          assignedUsers: assignees,
          assignedCount: assignees.length,
        }
      })
    )

    return NextResponse.json({
      success: true,
      senderIds,
      count: senderIds.length,
      source: creds.source,
    })
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message.includes('Forbidden')) {
      return NextResponse.json(
        { error: error.message },
        { status: error.message.includes('Forbidden') ? 403 : 401 }
      )
    }
    console.error('Super admin fetch sender IDs error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

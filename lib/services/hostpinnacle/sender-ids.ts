/**
 * HostPinnacle sender ID parsing and DB sync helpers
 */

import { SenderId, UserSenderId } from '@/lib/db/models'

export interface NormalizedHostPinnacleSenderId {
  senderName: string
  status: 'pending' | 'active' | 'rejected'
  hpSenderId?: string
}

export interface SenderIdAssignee {
  userId: string
  userName?: string
  userEmail?: string
}

export function parseHostPinnacleSenderIds(hpData: any): NormalizedHostPinnacleSenderId[] {
  let senderIdList: any[] = []

  if (hpData?.response?.senderidList) {
    senderIdList = hpData.response.senderidList
  } else if (Array.isArray(hpData)) {
    senderIdList = hpData
  } else if (hpData?.senderidList) {
    senderIdList = hpData.senderidList
  } else if (hpData?.senderids) {
    senderIdList = Array.isArray(hpData.senderids) ? hpData.senderids : []
  } else if (hpData?.senderid) {
    senderIdList = Array.isArray(hpData.senderid) ? hpData.senderid : [hpData.senderid]
  }

  return senderIdList
    .map((item: any) => {
      const senderIdObj = item.senderid || item
      const senderName =
        senderIdObj.senderName ||
        senderIdObj.senderid ||
        senderIdObj.senderId ||
        senderIdObj.sender_name ||
        senderIdObj.name

      if (!senderName) return null

      const isEnabled = senderIdObj.isEnabled || senderIdObj.is_enabled || senderIdObj.status
      let status: 'pending' | 'active' | 'rejected' = 'pending'
      if (isEnabled === 'Active' || isEnabled === 'active' || isEnabled === 'approved') {
        status = 'active'
      } else if (isEnabled === 'Rejected' || isEnabled === 'rejected') {
        status = 'rejected'
      } else if (typeof senderIdObj.status === 'string') {
        const s = senderIdObj.status.toLowerCase()
        if (s === 'active' || s === 'approved') status = 'active'
        else if (s === 'rejected') status = 'rejected'
      }

      return {
        senderName: String(senderName),
        status,
        hpSenderId: senderIdObj.sId || senderIdObj.id || senderIdObj.ID,
      }
    })
    .filter(Boolean) as NormalizedHostPinnacleSenderId[]
}

export async function upsertSenderIdFromHostPinnacle(normalized: NormalizedHostPinnacleSenderId) {
  const { senderName, status, hpSenderId } = normalized

  let senderId = await SenderId.findOne({ senderName })

  if (!senderId) {
    const caseInsensitiveMatch = await SenderId.findOne({
      senderName: {
        $regex: new RegExp(`^${senderName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'),
      },
    })

    if (caseInsensitiveMatch) {
      try {
        caseInsensitiveMatch.senderName = senderName
        await caseInsensitiveMatch.save()
        senderId = caseInsensitiveMatch
      } catch {
        senderId = await SenderId.findOne({ senderName })
      }
    }
  }

  if (!senderId) {
    try {
      senderId = await SenderId.create({
        senderName,
        provider: 'hostpinnacle',
        status,
        hpSenderId,
      })
    } catch (createError: any) {
      if (createError.code === 11000) {
        senderId = await SenderId.findOne({ senderName })
      } else {
        throw createError
      }
    }
  }

  if (!senderId) {
    throw new Error(`Failed to upsert sender ID: ${senderName}`)
  }

  senderId.status = status
  if (hpSenderId) senderId.hpSenderId = hpSenderId
  await senderId.save()

  return senderId
}

/** All accounts using each sender ID (shared sender IDs supported). */
export async function getSenderIdAssignmentMap(): Promise<Map<string, SenderIdAssignee[]>> {
  const assignments = await UserSenderId.find({}).populate('userId', 'name email').populate('senderId')
  const map = new Map<string, SenderIdAssignee[]>()

  for (const assignment of assignments) {
    const sender = assignment.senderId as any
    const user = assignment.userId as any
    if (!sender?._id) continue

    const senderKey = sender._id.toString()
    const entry: SenderIdAssignee = {
      userId: user?._id?.toString() || String(assignment.userId),
      userName: user?.name,
      userEmail: user?.email,
    }

    const existing = map.get(senderKey) || []
    existing.push(entry)
    map.set(senderKey, existing)
  }

  return map
}

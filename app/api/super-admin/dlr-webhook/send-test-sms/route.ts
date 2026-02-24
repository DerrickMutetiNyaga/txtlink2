/**
 * Send a test SMS to verify DLR (delivery reports) are received
 * POST /api/super-admin/dlr-webhook/send-test-sms
 * Body: { mobile: string, message?: string }
 */

import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db/connect'
import { SmsMessage } from '@/lib/db/models'
import { requireOwner } from '@/lib/auth/middleware'
import { hostPinnacleClient } from '@/lib/services/hostpinnacle/client'
import mongoose from 'mongoose'

function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.startsWith('0')) return `+254${digits.substring(1)}`
  if (phone.startsWith('+')) return phone
  if (digits.startsWith('254')) return `+${digits}`
  if (digits.startsWith('7') && digits.length === 9) return `+254${digits}`
  return `+${digits}`
}

function getFirstSenderName(hpData: any): string | null {
  let list: any[] = []
  if (hpData?.response?.senderidList) list = hpData.response.senderidList
  else if (Array.isArray(hpData)) list = hpData
  else if (hpData?.senderidList) list = hpData.senderidList
  else if (hpData?.senderids) list = Array.isArray(hpData.senderids) ? hpData.senderids : []
  const item = list[0]
  if (!item) return null
  const obj = item.senderid || item
  return obj.senderName || obj.senderid || obj.senderId || obj.sender_name || obj.name || null
}

export async function POST(request: NextRequest) {
  try {
    await connectDB()
    const user = requireOwner(request)
    const userId = new mongoose.Types.ObjectId(user.userId)

    const body = await request.json().catch(() => ({}))
    const mobile = body.mobile?.trim()
    const message = (body.message?.trim() || 'DLR test from TXTLINK').slice(0, 500)

    if (!mobile) {
      return NextResponse.json({ success: false, error: 'mobile is required' }, { status: 400 })
    }

    const formattedPhone = formatPhone(mobile)
    const mobileNoPlus = formattedPhone.replace(/^\+/, '')

    const hpResult = await hostPinnacleClient.readSenderIds({})
    if (!hpResult.success) {
      return NextResponse.json(
        { success: false, error: 'Could not load sender IDs from HostPinnacle', details: hpResult.error },
        { status: 502 }
      )
    }

    const senderName = getFirstSenderName(hpResult.data)
    if (!senderName) {
      return NextResponse.json(
        { success: false, error: 'No sender ID found in HostPinnacle. Create one first.' },
        { status: 400 }
      )
    }

    const [smsMessage] = await SmsMessage.create([{
      userId,
      senderName,
      toNumbers: [formattedPhone],
      message,
      segments: 1,
      costPerSegment: 0,
      totalCost: 0,
      chargedKes: 0,
      status: 'queued',
      refunded: false,
    }])

    const sendResult = await hostPinnacleClient.sendSms({
      mobile: mobileNoPlus,
      msg: message,
      senderid: senderName,
    })

    if (!sendResult.success) {
      await SmsMessage.findByIdAndUpdate(smsMessage._id, {
        status: 'failed',
        errorMessage: sendResult.error || sendResult.message,
        failedAt: new Date(),
      })
      return NextResponse.json(
        { success: false, error: sendResult.error || sendResult.message || 'HostPinnacle send failed' },
        { status: 502 }
      )
    }

    const transactionId =
      sendResult.data?.transactionId ??
      sendResult.data?.transactionid ??
      sendResult.data?.id

    await SmsMessage.findByIdAndUpdate(smsMessage._id, {
      hpTransactionId: transactionId,
      status: 'sent',
      sentAt: new Date(),
    })

    return NextResponse.json({
      success: true,
      transactionId,
      message: 'Test SMS sent. Check SMS History for delivery status when HostPinnacle sends the DLR.',
    })
  } catch (e: any) {
    if (e.message === 'Forbidden' || e.message === 'Unauthorized') {
      return NextResponse.json({ error: e.message }, { status: 403 })
    }
    console.error('Send test SMS error:', e)
    return NextResponse.json(
      { success: false, error: e.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

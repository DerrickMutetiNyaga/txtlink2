/**
 * Delivery Report Webhook Handler
 * POST /api/sms/dlr
 *
 * Receives delivery status updates from HostPinnacle.
 * HostPinnacle "Update Webhook" sends: Transactionid, Messageid, ErrorCode, MobileNumber, ReceivedTime, DeliveredTime (POST, form or JSON).
 * If you use WEBHOOK_SECRET, add it to the URL in HostPinnacle: https://yourdomain.com/api/sms/dlr?secret=YOUR_SECRET
 */

import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db/connect'
import { SmsMessage, User, WebhookLog } from '@/lib/db/models'
import { getPricingRule } from '@/lib/utils/pricing'

const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET

export async function POST(request: NextRequest) {
  // Always return 200 to HostPinnacle so they don't show "400 Bad Request" or "refused".
  const ok = (body: object = { received: true }) => NextResponse.json(body)

  try {
    await connectDB()
  } catch (dbErr: any) {
    console.error('DLR connectDB error:', dbErr)
    return ok()
  }

  const secret = request.headers.get('x-webhook-secret') || request.nextUrl.searchParams.get('secret')
  if (WEBHOOK_SECRET && secret !== WEBHOOK_SECRET) {
    // Still return 200 so HostPinnacle test doesn't "refuse". Log the reject.
    console.warn('DLR webhook rejected: invalid or missing secret')
    return ok()
  }

  function normalizePayload(data: Record<string, unknown>): Record<string, unknown> {
  const keyMap: Record<string, string> = {
    Transactionid: 'transactionId',
    Messageid: 'messageId',
    ErrorCode: 'errorCode',
    MobileNumber: 'mobileNumber',
    ReceivedTime: 'receivedTime',
    DeliveredTime: 'deliveredTime',
  }
  const out = { ...data }
  for (const [k, v] of Object.entries(keyMap)) {
    if (data[k] !== undefined && out[v] === undefined) (out as any)[v] = data[k]
  }
  return out
}

  try {
    let data: any
    const contentType = request.headers.get('content-type')

    if (contentType?.includes('application/x-www-form-urlencoded')) {
      const formData = await request.formData()
      data = Object.fromEntries(formData.entries())
    } else {
      try {
        data = await request.json()
      } catch {
        data = {}
      }
    }

    data = normalizePayload(data)

    const transactionId =
      data.transactionId ??
      data.Transactionid ??
      data.transactionid ??
      data.trans_id ??
      data.txnid ??
      data.id

    const status =
      data.status ??
      data.Status ??
      data.delivery_status ??
      data.dlrstatus

    const deliveredTime = data.deliveredTime ?? data.DeliveredTime
    const errorCode = data.errorCode ?? data.ErrorCode

    try {
      await WebhookLog.create({
        transactionId: transactionId ?? undefined,
        provider: 'hostpinnacle',
        eventType: 'dlr',
        payload: data,
        processed: false,
      })
    } catch (logErr) {
      console.warn('WebhookLog create failed:', logErr)
    }

    if (!transactionId) {
      return ok()
    }

    const smsMessage = await SmsMessage.findOne({ hpTransactionId: String(transactionId) })

    if (!smsMessage) {
      return ok()
    }

    let mappedStatus: 'sent' | 'delivered' | 'failed' = 'sent'
    const statusLower = (status || '').toString().toLowerCase()

    if (deliveredTime != null && deliveredTime !== '') {
      mappedStatus = 'delivered'
    } else if (errorCode != null && errorCode !== '') {
      mappedStatus = 'failed'
    } else if (statusLower.includes('deliver') || statusLower === 'success' || statusLower === 'delivered') {
      mappedStatus = 'delivered'
    } else if (
      statusLower.includes('fail') ||
      statusLower.includes('reject') ||
      statusLower === 'error'
    ) {
      mappedStatus = 'failed'
    }

    const updateData: any = {
      status: mappedStatus,
    }

    if (mappedStatus === 'delivered') {
      updateData.deliveredAt = deliveredTime ? new Date(deliveredTime) : new Date()
    } else if (mappedStatus === 'failed') {
      updateData.failedAt = new Date()
      updateData.errorCode = data.errorCode ?? data.ErrorCode
      updateData.errorMessage = data.errorMessage ?? data.errormessage ?? data.message

      const rule = await getPricingRule(smsMessage.userId.toString())
      if (rule.refundOnFail && !smsMessage.refunded) {
        const refundAmount = smsMessage.chargedKes || smsMessage.totalCost
        await User.findByIdAndUpdate(smsMessage.userId, {
          $inc: { credits: refundAmount },
        })
        updateData.refunded = true
        updateData.refundAmountKes = refundAmount
      }
    }

    await SmsMessage.findByIdAndUpdate(smsMessage._id, updateData)

    await WebhookLog.findOneAndUpdate(
      { transactionId },
      { processed: true, processedAt: new Date() }
    ).catch(() => {})

    return ok()
  } catch (error: any) {
    console.error('DLR webhook error:', error)
    return ok()
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({ status: 'ok' })
}


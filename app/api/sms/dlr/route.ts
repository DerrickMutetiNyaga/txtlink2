/**
 * Delivery Report Webhook Handler
 * POST /api/sms/dlr
 *
 * Receives delivery status updates from HostPinnacle.
 * HostPinnacle "Update Webhook" parameters (use exact names):
 * Transaction ID: Transactionid | Message ID: Messageid | Error Code: ErrorCode
 * Mobile Number: mobileNo | Received Time: ReceivedTime | Delivered Time: DeliveredTime
 * If you use WEBHOOK_SECRET, add it to the URL in HostPinnacle: https://yourdomain.com/api/sms/dlr?secret=YOUR_SECRET
 */

import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db/connect'
import { SmsMessage, User, WebhookLog, UserWebhook } from '@/lib/db/models'
import { getPricingRule } from '@/lib/utils/pricing'
import { sendWebhook } from '@/lib/services/webhook/delivery'

const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET

export async function POST(request: NextRequest) {
  // Always return 200 so HostPinnacle does not show 400. Some gateways expect status/success in body.
  const ok = (body: object = { received: true, status: 'ok', success: true }) => NextResponse.json(body)

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
    mobileNo: 'mobileNumber',
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
      console.log('DLR received but no transaction ID found in payload:', data)
      return ok()
    }

    // Try to find the message by transaction ID
    let smsMessage = await SmsMessage.findOne({ hpTransactionId: String(transactionId) })

    // If not found, try alternative lookups
    if (!smsMessage) {
      // Try finding by phone number + recent timestamp (within last 7 days)
      const mobileNumber = data.mobileNumber || data.MobileNumber || data.mobileNo
      if (mobileNumber) {
        // Normalize phone number (remove +, handle 254 prefix)
        const normalizedMobile = String(mobileNumber).replace(/^\+/, '').replace(/^254/, '254')
        const phoneVariations = [
          normalizedMobile,
          `+${normalizedMobile}`,
          `0${normalizedMobile.substring(3)}`, // Convert 254... to 0...
        ]

        // Look for messages sent in the last 7 days to this number
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        smsMessage = await SmsMessage.findOne({
          toNumbers: { $in: phoneVariations },
          createdAt: { $gte: sevenDaysAgo },
          status: { $in: ['queued', 'sent'] },
        }).sort({ createdAt: -1 })
      }

      // If still not found, log for debugging
      if (!smsMessage) {
        console.warn('DLR received but no matching SMS message found:', {
          transactionId: String(transactionId),
          mobileNumber: data.mobileNumber || data.MobileNumber || data.mobileNo,
          payload: data,
        })
        // Still mark the webhook log as processed even if we can't match it
        await WebhookLog.findOneAndUpdate(
          { transactionId: String(transactionId) },
          {
            processed: true,
            processedAt: new Date(),
            error: 'No matching SMS message found for this transaction ID',
          }
        ).catch(() => {})
        return ok()
      } else {
        // Found by phone number - update it with the transaction ID for future lookups
        await SmsMessage.findByIdAndUpdate(smsMessage._id, {
          hpTransactionId: String(transactionId),
        }).catch(() => {})
      }
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
      // Handle Unix timestamp in milliseconds (like "1772111471005")
      if (deliveredTime) {
        const deliveredTimeNum = Number(deliveredTime)
        if (!isNaN(deliveredTimeNum) && deliveredTimeNum > 1000000000000) {
          // It's a Unix timestamp in milliseconds
          updateData.deliveredAt = new Date(deliveredTimeNum)
        } else {
          // Try parsing as date string
          updateData.deliveredAt = new Date(deliveredTime)
        }
      } else {
        updateData.deliveredAt = new Date()
      }
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

    // Mark webhook log as processed
    await WebhookLog.findOneAndUpdate(
      { transactionId: String(transactionId) },
      { processed: true, processedAt: new Date() }
    ).catch(() => {})

    console.log('DLR processed successfully:', {
      transactionId: String(transactionId),
      messageId: smsMessage._id?.toString(),
      status: mappedStatus,
      mobileNumber: smsMessage.toNumbers?.[0],
    })

    // Trigger user webhooks for DLR
    try {
      const userWebhooks = await UserWebhook.find({
        userId: smsMessage.userId,
        product: 'SMS',
        reportType: 'DLR',
        status: 'active',
      })

      const webhookData = {
        transactionId: String(transactionId),
        messageId: smsMessage._id?.toString(),
        errorCode: errorCode || (mappedStatus === 'failed' ? '1' : '0'),
        mobileNumber: smsMessage.toNumbers?.[0] || '',
        receivedTime: data.receivedTime || new Date().toISOString(),
        deliveredTime: deliveredTime || (mappedStatus === 'delivered' ? new Date().toISOString() : undefined),
        status: mappedStatus,
      }

      // Send webhooks asynchronously (don't wait for them)
      Promise.all(
        userWebhooks.map(async (webhook) => {
          try {
            const result = await sendWebhook(webhook, webhookData)
            await UserWebhook.findByIdAndUpdate(webhook._id, {
              lastTriggeredAt: new Date(),
            })
            return result
          } catch (err) {
            console.error(`Failed to send webhook ${webhook._id}:`, err)
            return { success: false, error: String(err) }
          }
        })
      ).catch((err) => {
        console.error('Error sending user webhooks:', err)
      })
    } catch (webhookErr) {
      console.error('Error triggering user webhooks:', webhookErr)
      // Don't fail the DLR processing if webhook sending fails
    }

    return ok()
  } catch (error: any) {
    console.error('DLR webhook error:', error)
    return ok()
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({ status: 'ok' })
}


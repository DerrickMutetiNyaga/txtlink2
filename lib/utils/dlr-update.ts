/**
 * Shared logic to apply a DLR (delivery report) update to an SmsMessage.
 * Used by both the webhook handler and the HostPinnacle report sync.
 */

import { User } from '@/lib/db/models'
import type { ISmsMessage } from '@/lib/db/models'
import { getPricingRule } from '@/lib/utils/pricing'

export interface DlrData {
  transactionId?: string
  status?: string
  deliveredTime?: string | Date | null
  errorCode?: string
  errorMessage?: string
  /** Raw payload for optional fields (ErrorCode, DeliveredTime, etc.) */
  [key: string]: unknown
}

export type MappedStatus = 'sent' | 'delivered' | 'failed'

/**
 * Map raw DLR payload to our status and build update object for SmsMessage.
 * Returns null if status stays 'sent' and no update needed; otherwise the update object.
 */
export async function applyDlrToMessage(
  smsMessage: ISmsMessage & { _id: any; userId: any },
  data: DlrData
): Promise<{ status: MappedStatus; updateData: Record<string, unknown> } | null> {
  const status = (data.status ?? data.Status ?? data.delivery_status ?? data.dlrstatus ?? data.statuscode ?? data.StatusCode ?? '').toString()
  const statusLower = status.toLowerCase()
  const deliveredTime = data.deliveredTime ?? data.DeliveredTime ?? data.deliveredtime
  const errorCode = data.errorCode ?? data.ErrorCode ?? data.errorcode

  let mappedStatus: MappedStatus = 'sent'
  if (deliveredTime != null && String(deliveredTime) !== '') {
    mappedStatus = 'delivered'
  } else if (errorCode != null && String(errorCode) !== '') {
    mappedStatus = 'failed'
  } else if (statusLower.includes('deliver') || statusLower === 'success' || statusLower === 'delivered') {
    mappedStatus = 'delivered'
  } else if (statusLower.includes('fail') || statusLower.includes('reject') || statusLower === 'error') {
    mappedStatus = 'failed'
  } else {
    // Numeric codes and carrier-style codes (GSM 3GPP / HostPinnacle)
    const code = status.trim()
    const codeLower = statusLower.trim()
    if (
      code === '1' || code === '10' || codeLower === 'delivered' || codeLower === 'delivrd' ||
      codeLower === 'success' || codeLower === 'delivery successful' || codeLower === 'accepted'
    ) mappedStatus = 'delivered'
    else if (
      ['2', '3', '4', '5', '6', '7', '8', '9'].includes(code) || codeLower === 'failed' || codeLower === 'rejected' ||
      codeLower === 'undeliv' || codeLower === 'undelivered' || codeLower === 'rejectd' || codeLower === 'expired' ||
      codeLower === 'rejected' || codeLower === 'error'
    ) mappedStatus = 'failed'
    else if (codeLower === 'submitted' || codeLower === 'enroute' || codeLower === 'pending' || codeLower === 'sent' || code === '0') return null
    else return null
  }

  const updateData: Record<string, unknown> = { status: mappedStatus }

  if (mappedStatus === 'delivered') {
    updateData.deliveredAt = deliveredTime ? new Date(String(deliveredTime)) : new Date()
  } else if (mappedStatus === 'failed') {
    updateData.failedAt = new Date()
    updateData.errorCode = data.errorCode ?? data.ErrorCode
    updateData.errorMessage = data.errorMessage ?? data.errormessage ?? data.message

    const rule = await getPricingRule(smsMessage.userId.toString())
    const msg = smsMessage as { refunded?: boolean; chargedKes?: number; totalCost?: number }
    if (rule.refundOnFail && !msg.refunded) {
      const refundAmount = msg.chargedKes ?? msg.totalCost
      if (refundAmount) {
        await User.findByIdAndUpdate(smsMessage.userId, {
          $inc: { credits: refundAmount },
        })
        updateData.refunded = true
        updateData.refundAmountKes = refundAmount
      }
    }
  }

  return { status: mappedStatus, updateData }
}

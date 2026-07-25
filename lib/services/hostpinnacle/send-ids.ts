/**
 * Extract Message ID and Transaction ID from a HostPinnacle SMS send response.
 *
 * Status API (/SMSApi/report/status) uses the Message ID (uuid), e.g. FbpTVT6Pc2mdpfy.
 * DLR webhooks may send the numeric Transaction ID, e.g. 7963869269082784834.
 */

export interface HostPinnacleSendIds {
  messageId?: string
  transactionId?: string
}

function pickString(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (value != null && String(value).trim()) {
      return String(value).trim()
    }
  }
  return undefined
}

function flattenSendData(data: unknown): Record<string, unknown> {
  if (!data || typeof data !== 'object') return {}
  const d = data as Record<string, unknown>
  const nested =
    d.response && typeof d.response === 'object' ? (d.response as Record<string, unknown>) : null
  return { ...d, ...(nested ?? {}) }
}

export function extractHostPinnacleSendIds(data: unknown): HostPinnacleSendIds {
  const d = flattenSendData(data)

  const messageId = pickString(
    d.messageId,
    d.MessageId,
    d.messageid,
    d.Messageid,
    d.uuid,
    d.UUID,
    d.msgid,
    d.msgId
  )

  const transactionId = pickString(
    d.transactionId,
    d.transactionid,
    d.TransactionId,
    d.Transactionid,
    d.trans_id,
    d.txnid
  )

  const fallback = pickString(d.id)

  return {
    messageId: messageId || (fallback && !/^\d{10,}$/.test(fallback) ? fallback : undefined),
    transactionId:
      transactionId || (fallback && /^\d{10,}$/.test(fallback) ? fallback : fallback),
  }
}

/** Primary ID for status API lookup — prefer alphanumeric Message ID */
export function primaryStatusLookupId(ids: HostPinnacleSendIds): string | undefined {
  return ids.messageId || ids.transactionId
}

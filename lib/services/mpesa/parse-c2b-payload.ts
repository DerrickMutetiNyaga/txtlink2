import { NextRequest } from 'next/server'

export interface NormalizedC2bPayment {
  transactionType: string
  transId: string
  transTime: string
  transAmount: string
  businessShortCode: string
  billRefNumber: string
  invoiceNumber: string
  orgAccountBalance: string
  thirdPartyTransId: string
  msisdn: string
  firstName: string
  raw: Record<string, unknown>
}

function firstString(value: unknown): string {
  if (value == null) return ''
  return String(value).trim()
}

function pick(body: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    if (body[key] != null && String(body[key]).trim()) {
      return String(body[key]).trim()
    }
    const match = Object.keys(body).find((k) => k.toLowerCase() === key.toLowerCase())
    if (match && body[match] != null && String(body[match]).trim()) {
      return String(body[match]).trim()
    }
  }
  return ''
}

export function normalizeC2bPayload(body: Record<string, unknown>): NormalizedC2bPayment {
  const nested =
    body.Body && typeof body.Body === 'object'
      ? (body.Body as Record<string, unknown>)
      : body

  return {
    transactionType: pick(nested, ['TransactionType', 'transactiontype']),
    transId: pick(nested, ['TransID', 'TransId', 'transactionId', 'ReceiptNumber']),
    transTime: pick(nested, ['TransTime', 'transactionTime']),
    transAmount: pick(nested, ['TransAmount', 'Amount', 'amount']),
    businessShortCode: pick(nested, ['BusinessShortCode', 'ShortCode']),
    billRefNumber: pick(nested, ['BillRefNumber', 'BillRefNo', 'AccountNumber', 'accountReference']),
    invoiceNumber: pick(nested, ['InvoiceNumber']),
    orgAccountBalance: pick(nested, ['OrgAccountBalance']),
    thirdPartyTransId: pick(nested, ['ThirdPartyTransID']),
    msisdn: pick(nested, ['MSISDN', 'Msisdn', 'PhoneNumber']),
    firstName: pick(nested, ['FirstName']),
    raw: nested,
  }
}

export async function readC2bRequestBody(request: NextRequest): Promise<Record<string, unknown>> {
  const contentType = (request.headers.get('content-type') || '').toLowerCase()

  if (contentType.includes('application/x-www-form-urlencoded')) {
    const text = await request.text()
    const params = new URLSearchParams(text)
    const body: Record<string, unknown> = {}
    params.forEach((value, key) => {
      body[key] = value
    })
    return body
  }

  const text = await request.text()
  if (!text) return {}
  try {
    const parsed = JSON.parse(text)
    if (parsed && typeof parsed === 'object') return parsed as Record<string, unknown>
  } catch {
    const params = new URLSearchParams(text)
    const body: Record<string, unknown> = {}
    params.forEach((value, key) => {
      body[key] = value
    })
    if (Object.keys(body).length > 0) return body
  }
  return { raw: text }
}

export function c2bPhoneOrUnknown(msisdn?: string | null): string {
  const value = firstString(msisdn)
  return value || 'UNKNOWN'
}

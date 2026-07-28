import { describe, it, expect } from 'vitest'
import { NextRequest } from 'next/server'
import { parseSmsSendRequest } from '@/lib/utils/parse-sms-send-body'
import { decodeEscapedNewlines } from '@/lib/services/sms/message-body'

const ENDPOINT = 'https://txtlink.co.ke/api/v1/sms/send'

const VOUCHER_MESSAGE =
  'Dear Customer,\nVoucher: SC4Q8H5\nClick to connect: http://icon.nt/login.html?@SC4Q8H5_\nPackage: 1 Device | 60 MINUTES\nHelp: 254746089137.'

/** JSON template as rendered by hotspot AT gateways: raw newlines inside the message string. */
const RAW_GATEWAY_JSON =
  '{\n' +
  '"to": "254759794658",\n' +
  `"message": "${VOUCHER_MESSAGE}",\n` +
  '"senderIdName": "ICONIC_FBR",\n' +
  '"type": "transactional"\n' +
  '}'

function makeRequest(body: string, contentType: string): NextRequest {
  return new NextRequest(ENDPOINT, {
    method: 'POST',
    headers: { 'content-type': contentType },
    body,
  })
}

describe('parseSmsSendRequest', () => {
  it('parses JSON with raw newlines in the message (application/json)', async () => {
    const parsed = await parseSmsSendRequest(makeRequest(RAW_GATEWAY_JSON, 'application/json'))
    expect(parsed.to).toBe('254759794658')
    expect(parsed.message).toBe(VOUCHER_MESSAGE)
    expect(parsed.senderIdName).toBe('ICONIC_FBR')
  })

  it('parses a JSON body even when Content-Type claims form-urlencoded (hotspot gateway quirk)', async () => {
    const parsed = await parseSmsSendRequest(
      makeRequest(RAW_GATEWAY_JSON, 'application/x-www-form-urlencoded')
    )
    expect(parsed.to).toBe('254759794658')
    expect(parsed.message).toBe(VOUCHER_MESSAGE)
    expect(parsed.senderIdName).toBe('ICONIC_FBR')
  })

  it('still parses genuine form-urlencoded bodies', async () => {
    const body = 'to=254759794658&message=Hello&senderIdName=ICONIC_FBR'
    const parsed = await parseSmsSendRequest(
      makeRequest(body, 'application/x-www-form-urlencoded')
    )
    expect(parsed.to).toBe('254759794658')
    expect(parsed.message).toBe('Hello')
    expect(parsed.senderIdName).toBe('ICONIC_FBR')
  })

  it('parses a single-line JSON payload whose message uses literal \\n sequences', async () => {
    const singleLineMessage = VOUCHER_MESSAGE.replace(/\n/g, '\\n')
    const body =
      '{\n' +
      '"to": "254759794658",\n' +
      `"message": "${singleLineMessage}",\n` +
      '"senderIdName": "ICONIC_FBR",\n' +
      '"type": "transactional"\n' +
      '}'
    // This body is valid strict JSON — gateways that json-validate it will accept it
    expect(() => JSON.parse(body)).not.toThrow()

    const parsed = await parseSmsSendRequest(makeRequest(body, 'application/json'))
    expect(parsed.message).toBe(VOUCHER_MESSAGE)
  })

  it('keeps raw newlines inside a form field value', async () => {
    const body = `to=254759794658&message=${VOUCHER_MESSAGE}&senderIdName=ICONIC_FBR`
    const parsed = await parseSmsSendRequest(
      makeRequest(body, 'application/x-www-form-urlencoded')
    )
    expect(parsed.to).toBe('254759794658')
    expect(parsed.message).toBe(VOUCHER_MESSAGE)
    expect(parsed.senderIdName).toBe('ICONIC_FBR')
  })
})

describe('decodeEscapedNewlines', () => {
  it('converts literal \\n sequences into real newlines', () => {
    expect(decodeEscapedNewlines('Dear Customer,\\nVoucher: SC4Q8H5')).toBe(
      'Dear Customer,\nVoucher: SC4Q8H5'
    )
  })

  it('handles \\r\\n and \\t', () => {
    expect(decodeEscapedNewlines('a\\r\\nb\\tc')).toBe('a\nb\tc')
  })

  it('leaves messages with real newlines untouched', () => {
    const msg = 'Dear Customer,\nVoucher: SC4Q8H5'
    expect(decodeEscapedNewlines(msg)).toBe(msg)
  })
})

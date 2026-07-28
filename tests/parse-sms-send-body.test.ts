import { describe, it, expect } from 'vitest'
import { NextRequest } from 'next/server'
import { parseSmsSendRequest } from '@/lib/utils/parse-sms-send-body'

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

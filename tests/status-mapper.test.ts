import { describe, it, expect } from 'vitest'
import {
  mapProviderStatus,
  parseProviderStatusResponse,
  isFinalStatus,
  isApiEnvelopeStatus,
  isFailureProviderStatus,
  resolveHostPinnacleDlrStatus,
} from '@/lib/services/sms-status/status-mapper'

describe('mapProviderStatus', () => {
  it('maps DELIVERED to a final delivered status', () => {
    const result = mapProviderStatus('DELIVERED')
    expect(result.status).toBe('delivered')
    expect(result.isFinal).toBe(true)
  })

  it('maps SUBMITTED to pending sent', () => {
    const result = mapProviderStatus('SUBMITTED')
    expect(result.status).toBe('sent')
    expect(result.isFinal).toBe(false)
  })

  it('maps SUCCESS/OK to pending sent (API accept, not handset delivery)', () => {
    expect(mapProviderStatus('SUCCESS').status).toBe('sent')
    expect(mapProviderStatus('SUCCESS').isFinal).toBe(false)
    expect(mapProviderStatus('OK').status).toBe('sent')
    expect(mapProviderStatus('ok').isFinal).toBe(false)
  })

  it('maps FAILED with cause to final failed', () => {
    const result = mapProviderStatus('FAILED', 'Absent subscriber')
    expect(result.status).toBe('failed')
    expect(result.isFinal).toBe(true)
    expect(result.cause).toBe('Absent subscriber')
  })

  it('maps EXPIRED / REJECTED / UNDELIV vocabulary to distinct final statuses', () => {
    expect(mapProviderStatus('EXPIRED').status).toBe('expired')
    expect(mapProviderStatus('REJECTED').status).toBe('rejected')
    expect(mapProviderStatus('UNDELIV').status).toBe('undeliverable')
    expect(mapProviderStatus('UNDELIVERABLE').status).toBe('undeliverable')
  })

  it('is case- and whitespace-insensitive', () => {
    expect(mapProviderStatus('  delivered ').status).toBe('delivered')
    expect(mapProviderStatus('DlvRd').status).toBe('delivered')
  })

  it('keeps unknown statuses pending so the worker retries', () => {
    const result = mapProviderStatus('SOME_NEW_PROVIDER_STATE')
    expect(result.status).toBe('processing')
    expect(result.isFinal).toBe(false)
  })
})

describe('parseProviderStatusResponse', () => {
  it('parses the documented reports_statusList shape', () => {
    const result = parseProviderStatusResponse({
      response: {
        reports_statusList: [{ status: { Status: 'DELIVERED', Cause: 'Success' } }],
      },
    })
    expect(result?.status).toBe('delivered')
    expect(result?.cause).toBe('Success')
  })

  it('parses FAILED from reports_statusList', () => {
    const result = parseProviderStatusResponse({
      response: {
        reports_statusList: [{ status: { Status: 'FAILED', Cause: 'Absent Subscriber' } }],
      },
    })
    expect(result?.status).toBe('failed')
    expect(result?.cause).toBe('Absent Subscriber')
  })

  it('parses SUBMITTED / PENDING from reports_statusList', () => {
    expect(
      parseProviderStatusResponse({
        response: { reports_statusList: [{ status: { Status: 'SUBMITTED' } }] },
      })?.status
    ).toBe('sent')
    expect(
      parseProviderStatusResponse({
        response: { reports_statusList: [{ status: { Status: 'PENDING' } }] },
      })?.status
    ).toBe('processing')
  })

  it('parses fallback flat shapes', () => {
    expect(parseProviderStatusResponse({ response: { Status: 'FAILED' } })?.status).toBe('failed')
    expect(parseProviderStatusResponse({ status: 'SUBMITTED' })?.status).toBe('sent')
  })

  it('does not treat API envelope status:success as delivered', () => {
    expect(parseProviderStatusResponse({ status: 'success' })).toBeNull()
    expect(parseProviderStatusResponse({ status: 'ok' })).toBeNull()
    expect(parseProviderStatusResponse({ response: { status: 'success' } })).toBeNull()
    expect(
      parseProviderStatusResponse({
        status: 'success',
        response: { reports_statusList: [] },
      })
    ).toBeNull()
  })

  it('still reads real delivery status when wrapped in a success envelope', () => {
    const result = parseProviderStatusResponse({
      status: 'success',
      response: {
        reports_statusList: [{ status: { Status: 'FAILED', Cause: 'Rejected' } }],
      },
    })
    expect(result?.status).toBe('failed')
    expect(result?.cause).toBe('Rejected')
  })

  it('returns null when the provider has no report yet', () => {
    expect(parseProviderStatusResponse({ response: { reports_statusList: [] } })).toBeNull()
    expect(parseProviderStatusResponse({})).toBeNull()
    expect(parseProviderStatusResponse(null)).toBeNull()
    expect(parseProviderStatusResponse('garbage')).toBeNull()
  })
})

describe('isFinalStatus', () => {
  it('classifies statuses correctly', () => {
    expect(isFinalStatus('delivered')).toBe(true)
    expect(isFinalStatus('provider_timeout')).toBe(true)
    expect(isFinalStatus('sent')).toBe(false)
    expect(isFinalStatus('retrying')).toBe(false)
  })
})

describe('isApiEnvelopeStatus / isFailureProviderStatus', () => {
  it('detects API envelopes', () => {
    expect(isApiEnvelopeStatus('success')).toBe(true)
    expect(isApiEnvelopeStatus('OK')).toBe(true)
    expect(isApiEnvelopeStatus('DELIVERED')).toBe(false)
  })

  it('detects failure vocabulary', () => {
    expect(isFailureProviderStatus('FAILED')).toBe(true)
    expect(isFailureProviderStatus('UNDELIV')).toBe(true)
    expect(isFailureProviderStatus('DELIVERED')).toBe(false)
    expect(isFailureProviderStatus('SUBMITTED')).toBe(false)
  })
})

describe('resolveHostPinnacleDlrStatus', () => {
  it('uses Status=FAILED even when DeliveredTime is set (HostPinnacle portal shape)', () => {
    expect(
      resolveHostPinnacleDlrStatus({
        status: 'FAILED',
        cause: 'Other',
        deliveredTime: '2026-07-31 16:50:01',
      })
    ).toBe('FAILED')
  })

  it('uses Status=DELIVERED when HostPinnacle says delivered', () => {
    expect(
      resolveHostPinnacleDlrStatus({
        status: 'DELIVERED',
        deliveredTime: '2026-07-31 16:50:01',
      })
    ).toBe('DELIVERED')
  })

  it('treats DeliveredTime with no ErrorCode as DELIVERED (HostPinnacle webhook shape)', () => {
    expect(
      resolveHostPinnacleDlrStatus({
        deliveredTime: '2026-07-31 18:19:01',
        errorCode: '0',
      })
    ).toBe('DELIVERED')
    expect(
      resolveHostPinnacleDlrStatus({
        deliveredTime: '2026-07-31 18:19:01',
      })
    ).toBe('DELIVERED')
  })

  it('maps non-zero ErrorCode to FAILED even with DeliveredTime', () => {
    expect(
      resolveHostPinnacleDlrStatus({
        errorCode: '1',
        deliveredTime: '2026-07-31 18:19:01',
      })
    ).toBe('FAILED')
    expect(resolveHostPinnacleDlrStatus({ errorCode: '0' })).toBe('SUBMITTED')
  })

  it('uses status:success + DeliveredTime as DELIVERED, not API envelope alone', () => {
    expect(resolveHostPinnacleDlrStatus({ status: 'success' })).toBe('SUBMITTED')
    expect(
      resolveHostPinnacleDlrStatus({
        status: 'success',
        deliveredTime: '2026-07-31 18:19:01',
      })
    ).toBe('DELIVERED')
    expect(resolveHostPinnacleDlrStatus({ status: 'success', errorCode: '12' })).toBe('FAILED')
  })
})

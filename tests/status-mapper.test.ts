import { describe, it, expect } from 'vitest'
import {
  mapProviderStatus,
  parseProviderStatusResponse,
  isFinalStatus,
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

  it('parses fallback flat shapes', () => {
    expect(parseProviderStatusResponse({ response: { Status: 'FAILED' } })?.status).toBe('failed')
    expect(parseProviderStatusResponse({ status: 'SUBMITTED' })?.status).toBe('sent')
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

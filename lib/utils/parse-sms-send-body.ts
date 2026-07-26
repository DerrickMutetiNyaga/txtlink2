import { NextRequest } from 'next/server'
import { parseLenientJson } from '@/lib/utils/parse-lenient-json'

export type SmsSendBody = Record<string, unknown>

function objectFromSearchParams(params: URLSearchParams): SmsSendBody {
  const out: SmsSendBody = {}
  for (const [key, value] of params.entries()) {
    out[key] = value
  }
  return out
}

function parseFormUrlEncoded(raw: string): SmsSendBody {
  return objectFromSearchParams(new URLSearchParams(raw))
}

function isProbablyFormBody(contentType: string, raw: string): boolean {
  if (contentType.includes('application/x-www-form-urlencoded')) return true
  if (contentType.includes('application/json')) return false
  // Heuristic: key=value pairs without leading {
  const trimmed = raw.trim()
  return Boolean(trimmed) && !trimmed.startsWith('{') && trimmed.includes('=')
}

/**
 * Parse SMS send body from JSON (lenient) or form-urlencoded.
 * Query-string fields fill any missing keys (handy for AT Gateway).
 */
export async function parseSmsSendRequest(request: NextRequest): Promise<SmsSendBody> {
  const contentType = (request.headers.get('content-type') || '').toLowerCase()
  const raw = await request.text()
  const fromQuery = objectFromSearchParams(new URL(request.url).searchParams)

  let fromBody: SmsSendBody = {}

  if (raw.trim()) {
    if (isProbablyFormBody(contentType, raw)) {
      fromBody = parseFormUrlEncoded(raw)
    } else if (contentType.includes('text/plain') && fromQuery.to && !fromQuery.message) {
      // Body is the message; phone/sender come from query
      fromBody = { message: raw }
    } else {
      try {
        const parsed = parseLenientJson(raw)
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          fromBody = parsed as SmsSendBody
        } else {
          throw new Error('JSON body must be an object')
        }
      } catch {
        // Last resort: treat as form if it looks like one
        if (raw.includes('=') && raw.includes('&')) {
          fromBody = parseFormUrlEncoded(raw)
        } else {
          throw new Error('Invalid request body')
        }
      }
    }
  }

  // Query fills gaps only (body wins)
  return { ...fromQuery, ...fromBody }
}

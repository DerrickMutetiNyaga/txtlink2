/**
 * Client helper: consume SMS History SSE with Authorization header
 * (EventSource cannot set custom headers).
 */

export type SmsHistoryLiveMessage = {
  id: string
  time: string
  createdAt?: string
  recipient: string
  senderId: string
  campaign: string
  message: string
  status: string
  displayStatus?: string
  deliveryMethod?: string
  fallbackStatus?: string | null
  fallbackJobId?: string | null
  fallbackFailureReason?: string | null
  requiresPhoneTopUp?: boolean
  providerRetryAttempted?: boolean
  providerRetryStatus?: string | null
  failureReason?: string
  messageId: string
  sentAt: string | Date | null
  deliveredAt?: string | null
  cost: number
  retryCount: number
  lastAttemptAt: string | Date | null
  source?: string | null
  apiKeyName?: string | null
  [key: string]: unknown
}

export type SmsHistoryLivePayload =
  | { type: 'connected'; at: string }
  | { type: 'heartbeat'; at: string }
  | { type: 'error'; message: string; at: string }
  | {
      type: 'sms.upsert'
      op: 'insert' | 'update'
      message: SmsHistoryLiveMessage
      at: string
    }

export type SmsHistoryLiveHandlers = {
  onEvent: (event: SmsHistoryLivePayload) => void
  onConnectionChange?: (state: 'connecting' | 'live' | 'disconnected' | 'error') => void
}

function parseSseChunk(
  buffer: string,
  onEvent: (eventName: string, data: string) => void
): string {
  const parts = buffer.split('\n\n')
  const rest = parts.pop() ?? ''
  for (const part of parts) {
    if (!part.trim()) continue
    let eventName = 'message'
    const dataLines: string[] = []
    for (const line of part.split('\n')) {
      if (line.startsWith('event:')) {
        eventName = line.slice(6).trim()
      } else if (line.startsWith('data:')) {
        dataLines.push(line.slice(5).trim())
      }
    }
    if (dataLines.length) {
      onEvent(eventName, dataLines.join('\n'))
    }
  }
  return rest
}

/**
 * Opens a long-lived SSE connection. Returns an abort function.
 * Auto-reconnects with backoff until aborted.
 */
export function connectSmsHistoryLive(
  getToken: () => string | null,
  handlers: SmsHistoryLiveHandlers
): () => void {
  let aborted = false
  let abortController: AbortController | null = null
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null
  let attempt = 0

  const cleanupTimer = () => {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer)
      reconnectTimer = null
    }
  }

  const connect = async () => {
    if (aborted) return
    const token = getToken()
    if (!token) {
      handlers.onConnectionChange?.('error')
      return
    }

    handlers.onConnectionChange?.('connecting')
    abortController = new AbortController()
    const currentController = abortController

    // Server sends heartbeats every 15s; if nothing arrives for 45s the
    // stream is dead or buffered by a proxy — abort so we reconnect.
    let lastActivity = Date.now()
    const watchdog = setInterval(() => {
      if (Date.now() - lastActivity > 45_000) {
        currentController.abort()
      }
    }, 10_000)

    try {
      const response = await fetch('/api/user/sms/history/live', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'text/event-stream',
        },
        signal: abortController.signal,
        cache: 'no-store',
      })

      if (!response.ok || !response.body) {
        throw new Error(`Live stream HTTP ${response.status}`)
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      // Only report "live" once an event actually arrives through the stream.
      // Headers can arrive even when a proxy/gzip buffers the body forever.
      let sawEvent = false

      while (!aborted) {
        const { done, value } = await reader.read()
        if (done) break
        lastActivity = Date.now()
        buffer += decoder.decode(value, { stream: true })
        buffer = parseSseChunk(buffer, (_eventName, data) => {
          try {
            const parsed = JSON.parse(data) as SmsHistoryLivePayload
            if (!sawEvent) {
              sawEvent = true
              attempt = 0
              handlers.onConnectionChange?.('live')
            }
            handlers.onEvent(parsed)
          } catch {
            // ignore malformed chunks
          }
        })
      }

      if (!aborted) {
        handlers.onConnectionChange?.('disconnected')
        scheduleReconnect()
      }
    } catch {
      if (aborted) return
      // AbortError here means the watchdog killed a stalled stream — reconnect.
      handlers.onConnectionChange?.('error')
      scheduleReconnect()
    } finally {
      clearInterval(watchdog)
    }
  }

  const scheduleReconnect = () => {
    if (aborted) return
    cleanupTimer()
    const delay = Math.min(30_000, 1000 * 2 ** Math.min(attempt, 4))
    attempt += 1
    reconnectTimer = setTimeout(() => {
      void connect()
    }, delay)
  }

  void connect()

  return () => {
    aborted = true
    cleanupTimer()
    abortController?.abort()
    handlers.onConnectionChange?.('disconnected')
  }
}

/** Client-side filter gate so live inserts respect the current history filters. */
export function liveRowMatchesFilters(
  row: SmsHistoryLiveMessage,
  filters: {
    status: string
    senderId: string
    campaign: string
    country: string
    search: string
    fromDate: string
    toDate: string
  }
): boolean {
  if (filters.senderId !== 'all' && row.senderId !== filters.senderId) return false

  if (filters.campaign !== 'all' && row.campaign !== filters.campaign) {
    // API Key rows may be labeled "API Key" while filter value is "API"
    if (!(filters.campaign === 'API' && (row.campaign === 'API' || row.campaign === 'API Key'))) {
      return false
    }
  }

  if (filters.status !== 'all') {
    const status = row.status
    const display = (row.displayStatus || '').toLowerCase()
    const fallback = row.fallbackStatus || ''
    switch (filters.status) {
      case 'delivered':
        if (status !== 'delivered' || display.includes('phone')) return false
        break
      case 'delivered_via_phone':
        if (
          row.deliveryMethod !== 'android_phone_gateway' &&
          fallback !== 'delivered_via_phone' &&
          fallback !== 'sent_via_phone'
        ) {
          return false
        }
        break
      case 'sent':
        if (status !== 'sent') return false
        break
      case 'pending':
        if (!['sent', 'queued', 'processing', 'retrying', 'pending'].includes(status)) return false
        break
      case 'failed':
        if (status !== 'failed' && !['expired', 'rejected', 'undeliverable'].includes(status)) {
          return false
        }
        break
      case 'queued_for_phone':
        if (fallback !== 'queued_for_phone') return false
        break
      case 'retrying_provider':
        if (fallback !== 'retrying_provider') return false
        break
      case 'retry_waiting_delivery':
        if (fallback !== 'retry_waiting_delivery') return false
        break
      case 'phone_failed':
        if (fallback !== 'phone_failed') return false
        break
      case 'phone_requires_topup':
        if (fallback !== 'phone_requires_topup' && !row.requiresPhoneTopUp) return false
        break
      default:
        break
    }
  }

  if (filters.country !== 'all') {
    const recipient = row.recipient || ''
    const prefixes: Record<string, string[]> = {
      Kenya: ['+254', '254'],
      Uganda: ['+256', '256'],
      Tanzania: ['+255', '255'],
    }
    const allowed = prefixes[filters.country]
    if (allowed && !allowed.some((p) => recipient.includes(p))) return false
  }

  if (filters.search.trim()) {
    const q = filters.search.trim().toLowerCase()
    const hay = `${row.recipient} ${row.message} ${row.senderId} ${row.messageId}`.toLowerCase()
    if (!hay.includes(q)) return false
  }

  if (filters.fromDate || filters.toDate) {
    const created = row.createdAt ? new Date(row.createdAt).getTime() : NaN
    if (!Number.isFinite(created)) return true
    if (filters.fromDate) {
      const from = new Date(filters.fromDate)
      from.setHours(0, 0, 0, 0)
      if (created < from.getTime()) return false
    }
    if (filters.toDate) {
      const to = new Date(filters.toDate)
      to.setHours(23, 59, 59, 999)
      if (created > to.getTime()) return false
    }
  }

  return true
}

/**
 * SMS History live updates via Server-Sent Events.
 * GET /api/user/sms/history/live
 *
 * Uses MongoDB Atlas change streams so inserts/status updates from the web
 * app and the separate sms-status worker both push to open browsers.
 */

import { NextRequest } from 'next/server'
import mongoose from 'mongoose'
import connectDB from '@/lib/db/connect'
import { SmsMessage, type ISmsMessage } from '@/lib/db/models'
import { formatSmsHistoryRow } from '@/lib/services/sms-history/format'
import {
  encodeSseEvent,
  isMeaningfulSmsHistoryUpdate,
  verifyAuthForLiveStream,
  type SmsHistoryLiveEvent,
} from '@/lib/services/sms-history/live-stream'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

const HEARTBEAT_MS = 15_000

export async function GET(request: NextRequest) {
  const user = verifyAuthForLiveStream(request)
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  await connectDB()

  const userObjectId = new mongoose.Types.ObjectId(user.userId)
  const encoder = new TextEncoder()
  let closed = false
  let heartbeatTimer: ReturnType<typeof setInterval> | null = null
  let changeStream: mongoose.mongo.ChangeStream | null = null
  let eventSeq = 0

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const send = (event: SmsHistoryLiveEvent) => {
        if (closed) return
        try {
          eventSeq += 1
          controller.enqueue(encoder.encode(encodeSseEvent(event, String(eventSeq))))
        } catch {
          cleanup()
        }
      }

      const cleanup = () => {
        if (closed) return
        closed = true
        if (heartbeatTimer) {
          clearInterval(heartbeatTimer)
          heartbeatTimer = null
        }
        if (changeStream) {
          void changeStream.close().catch(() => undefined)
          changeStream = null
        }
        try {
          controller.close()
        } catch {
          // already closed
        }
      }

      request.signal.addEventListener('abort', cleanup)

      send({ type: 'connected', at: new Date().toISOString() })

      heartbeatTimer = setInterval(() => {
        send({ type: 'heartbeat', at: new Date().toISOString() })
      }, HEARTBEAT_MS)

      try {
        changeStream = SmsMessage.watch(
          [
            {
              $match: {
                operationType: { $in: ['insert', 'update', 'replace'] },
                'fullDocument.userId': userObjectId,
              },
            },
          ],
          {
            fullDocument: 'updateLookup',
          }
        )

        changeStream.on('change', (rawChange) => {
          try {
            const change = rawChange as {
              operationType: string
              fullDocument?: ISmsMessage & { _id?: unknown }
              updateDescription?: {
                updatedFields?: Record<string, unknown>
                removedFields?: string[]
              }
            }
            const op = change.operationType
            if (op !== 'insert' && op !== 'update' && op !== 'replace') return

            if (op === 'update') {
              const updatedFields = change.updateDescription?.updatedFields
              const removedFields = change.updateDescription?.removedFields
              if (!isMeaningfulSmsHistoryUpdate(updatedFields, removedFields)) {
                return
              }
            }

            const doc = change.fullDocument
            if (!doc?._id) return

            // Defensive: pipeline already filters, but keep user boundary explicit
            if (String(doc.userId) !== String(userObjectId)) return

            send({
              type: 'sms.upsert',
              op: op === 'insert' ? 'insert' : 'update',
              message: formatSmsHistoryRow(doc),
              at: new Date().toISOString(),
            })
          } catch (err) {
            console.error('[sms-history-live] Failed to process change:', err)
          }
        })

        changeStream.on('error', (err) => {
          console.error('[sms-history-live] Change stream error:', err)
          send({
            type: 'error',
            message: 'Live connection interrupted',
            at: new Date().toISOString(),
          })
          cleanup()
        })
      } catch (err) {
        console.error('[sms-history-live] Failed to open change stream:', err)
        send({
          type: 'error',
          message:
            'Live updates unavailable (MongoDB change streams required). Falling back to manual refresh.',
          at: new Date().toISOString(),
        })
        cleanup()
      }
    },
    cancel() {
      closed = true
      if (heartbeatTimer) clearInterval(heartbeatTimer)
      if (changeStream) void changeStream.close().catch(() => undefined)
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}

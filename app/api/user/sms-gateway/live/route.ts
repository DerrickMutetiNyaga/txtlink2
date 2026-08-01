/**
 * Phone Gateway dashboard live updates via Server-Sent Events.
 * Near-real-time while connected, with automatic recovery (polling fallback on the page).
 */

import { NextRequest } from 'next/server'
import mongoose from 'mongoose'
import connectDB from '@/lib/db/connect'
import { SmsFallbackJob, SmsGatewayDevice } from '@/lib/db/models'
import { verifyAuthForLiveStream } from '@/lib/services/sms-history/live-stream'
import {
  computeGatewayConnectionStatus,
  listSimStates,
} from '@/lib/services/sms-gateway/status'
import { GATEWAY_SETUP_DEFAULTS } from '@/lib/services/sms-gateway/config'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

const HEARTBEAT_MS = 15_000
const POLL_MS = 8_000

function encodeSse(data: unknown, id?: string): string {
  const lines = [`data: ${JSON.stringify(data)}`]
  if (id) lines.unshift(`id: ${id}`)
  return `${lines.join('\n')}\n\n`
}

async function buildGatewaySnapshot(userId: mongoose.Types.ObjectId) {
  const [
    device,
    pendingPhoneJobs,
    sentViaPhone,
    deliveredViaPhone,
    awaitingDelivery,
    manualReview,
    blockedTopUpJobs,
  ] = await Promise.all([
    SmsGatewayDevice.findOne({ userId }).lean(),
    SmsFallbackJob.countDocuments({ userId, status: 'pending', isTest: { $ne: true } }),
    SmsFallbackJob.countDocuments({ userId, status: 'sent', isTest: { $ne: true } }),
    SmsFallbackJob.countDocuments({ userId, status: 'delivered', isTest: { $ne: true } }),
    SmsFallbackJob.countDocuments({
      userId,
      status: 'sent',
      deliveredAt: null,
      isTest: { $ne: true },
    }),
    SmsFallbackJob.countDocuments({ userId, status: 'failed', isTest: { $ne: true } }),
    SmsFallbackJob.countDocuments({
      userId,
      status: 'blocked',
      requiresTopUp: true,
    }),
  ])

  if (!device) {
    return {
      type: 'gateway' as const,
      at: new Date().toISOString(),
      gateway: {
        hasToken: false,
        isActive: false,
        deviceOnline: false,
        deviceSynchronized: false,
        connectionStatus: 'not_connected',
        syncHealth: 'UNKNOWN',
        pendingPhoneJobs: 0,
        sentViaPhone: 0,
        deliveredViaPhone: 0,
        awaitingDelivery: 0,
        manualReview: 0,
        blockedTopUpJobs: 0,
        sims: [],
        liveUpdateNote: 'Near-real-time while connected, with automatic recovery.',
        setupDefaults: GATEWAY_SETUP_DEFAULTS,
      },
    }
  }

  const status = computeGatewayConnectionStatus(device)
  const sims = listSimStates(device)

  return {
    type: 'gateway' as const,
    at: new Date().toISOString(),
    gateway: {
      hasToken: true,
      isActive: Boolean(device.isActive),
      isOnline: status.isOnline,
      deviceOnline: status.deviceOnline,
      deviceSynchronized: status.deviceSynchronized,
      connectionStatus: status.connectionStatus,
      serviceState: status.serviceState,
      syncHealth: status.syncHealth,
      latestActivityAt: status.latestActivityAt?.toISOString() || null,
      lastHeartbeatAt: device.lastHeartbeatAt || null,
      lastSyncAt: device.lastSyncAt || null,
      lastJobFetchedAt: device.lastJobFetchedAt || null,
      lastPhoneSendAt: device.lastPhoneSendAt || null,
      lastSuccessfulStatusAt: device.lastSuccessfulStatusAt || null,
      isGatewayRunning: device.isGatewayRunning ?? null,
      requiresTopUp: Boolean(device.requiresTopUp),
      pauseScope: device.pauseScope || null,
      pausedSubscriptionId: device.pausedSubscriptionId || null,
      pauseReason: device.pauseReason || null,
      lastTransientError: device.lastTransientError || null,
      pendingPhoneJobs,
      sentViaPhone,
      deliveredViaPhone,
      awaitingDelivery,
      manualReview,
      blockedTopUpJobs,
      sims,
      liveUpdateNote: 'Near-real-time while connected, with automatic recovery.',
    },
  }
}

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
  let pollTimer: ReturnType<typeof setInterval> | null = null
  let changeStream: mongoose.mongo.ChangeStream | null = null
  let seq = 0

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const send = (payload: unknown) => {
        if (closed) return
        try {
          seq += 1
          controller.enqueue(encoder.encode(encodeSse(payload, String(seq))))
        } catch {
          cleanup()
        }
      }

      const cleanup = () => {
        if (closed) return
        closed = true
        if (heartbeatTimer) clearInterval(heartbeatTimer)
        if (pollTimer) clearInterval(pollTimer)
        if (changeStream) void changeStream.close().catch(() => undefined)
        try {
          controller.close()
        } catch {
          // already closed
        }
      }

      request.signal.addEventListener('abort', cleanup)
      controller.enqueue(encoder.encode(`: ${' '.repeat(2048)}\n\n`))
      send({
        type: 'connected',
        at: new Date().toISOString(),
        note: 'Near-real-time while connected, with automatic recovery.',
      })

      const pushSnapshot = () => {
        void buildGatewaySnapshot(userObjectId)
          .then((snap) => send(snap))
          .catch(() => undefined)
      }

      pushSnapshot()

      heartbeatTimer = setInterval(() => {
        send({ type: 'heartbeat', at: new Date().toISOString() })
      }, HEARTBEAT_MS)

      // Polling inside the stream as a recovery path if change streams fail
      pollTimer = setInterval(pushSnapshot, POLL_MS)

      try {
        changeStream = SmsFallbackJob.watch(
          [
            {
              $match: {
                operationType: { $in: ['insert', 'update', 'replace'] },
                'fullDocument.userId': userObjectId,
              },
            },
          ],
          { fullDocument: 'updateLookup' }
        )
        changeStream.on('change', () => pushSnapshot())
        changeStream.on('error', () => {
          // Keep poll-based recovery; do not close the SSE
        })
      } catch {
        // Change streams unavailable — poll-only recovery remains
      }
    },
    cancel() {
      closed = true
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  })
}

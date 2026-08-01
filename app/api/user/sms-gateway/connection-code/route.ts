import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db/connect'
import { SmsGatewayDevice } from '@/lib/db/models'
import { requireAuth } from '@/lib/auth/middleware'
import {
  generateGatewayToken,
  hashGatewayToken,
  clearGatewayTokenActivationFields,
} from '@/lib/services/sms-gateway/auth'
import {
  buildGatewaySetupPayload,
  encodeConnectionCode,
  INVALID_PUBLIC_ORIGIN_MESSAGE,
  resolveGatewayApiBaseUrl,
  resolvePublicOriginFromRequest,
} from '@/lib/services/sms-gateway/connection-code'
import { GATEWAY_SETUP_DEFAULTS, resolveGatewaySetupConfig } from '@/lib/services/sms-gateway/config'
import { logGatewayAudit } from '@/lib/services/sms-gateway/audit'
import mongoose from 'mongoose'

export async function POST(request: NextRequest) {
  try {
    await connectDB()
    const user = requireAuth(request)
    const userId = new mongoose.Types.ObjectId(user.userId)

    const body = await request.json().catch(() => ({}))
    const replaceOldToken =
      body.replaceOldActiveToken !== false && body.replaceOldToken !== false

    const existing = await SmsGatewayDevice.findOne({ userId })

    if (existing?.isActive && !replaceOldToken) {
      return NextResponse.json(
        {
          error:
            'An active token already exists. Enable "Replace old active token" to generate a new connection code.',
        },
        { status: 400 }
      )
    }

    const publicOrigin = resolvePublicOriginFromRequest(request, body.publicOrigin)
    const apiBaseUrl = resolveGatewayApiBaseUrl(publicOrigin)

    const configOverrides = resolveGatewaySetupConfig({
      deviceName: typeof body.deviceName === 'string' ? body.deviceName : undefined,
      pollIntervalSeconds: body.pollIntervalSeconds,
      smsDelaySeconds: body.smsDelaySeconds,
      hourlyLimit: body.hourlyLimit ?? existing?.hourlyLimit,
      dailyLimit: body.dailyLimit ?? existing?.dailyLimit,
      pauseOnFailure:
        typeof body.pauseOnFailure === 'boolean'
          ? body.pauseOnFailure
          : GATEWAY_SETUP_DEFAULTS.pauseOnFailure,
      maxFailuresBeforePause:
        body.maxFailuresBeforePause ?? GATEWAY_SETUP_DEFAULTS.maxFailuresBeforePause,
    })

    const plainToken = generateGatewayToken()
    const tokenHash = hashGatewayToken(plainToken)

    let deviceId: string
    if (existing) {
      existing.tokenHash = tokenHash
      existing.isActive = true
      clearGatewayTokenActivationFields(existing)
      existing.hourlyLimit = configOverrides.hourlyLimit
      existing.dailyLimit = configOverrides.dailyLimit
      existing.clientPauseOnFailure = configOverrides.pauseOnFailure
      existing.clientMaxFailuresBeforePause = configOverrides.maxFailuresBeforePause
      existing.configMigratedAt = new Date()
      existing.configMigrationNote = 'Generated with safe pause defaults'
      await existing.save()
      deviceId = String(existing._id)
    } else {
      const created = await SmsGatewayDevice.create({
        userId,
        tokenHash,
        label: 'Phone Gateway',
        simLabel: '',
        isActive: true,
        hourlyLimit: configOverrides.hourlyLimit,
        dailyLimit: configOverrides.dailyLimit,
        clientPauseOnFailure: configOverrides.pauseOnFailure,
        clientMaxFailuresBeforePause: configOverrides.maxFailuresBeforePause,
        configMigratedAt: new Date(),
        configMigrationNote: 'Generated with safe pause defaults',
      })
      deviceId = String(created._id)
    }

    const payload = buildGatewaySetupPayload(apiBaseUrl, plainToken, configOverrides)
    const connectionCode = encodeConnectionCode(payload)

    await logGatewayAudit(user.userId, 'GATEWAY_SETUP_GENERATED', deviceId, {
      apiBaseUrl,
      pauseOnFailure: configOverrides.pauseOnFailure,
      maxFailuresBeforePause: configOverrides.maxFailuresBeforePause,
    })
    await logGatewayAudit(user.userId, 'GATEWAY_TOKEN_GENERATED', deviceId, {
      replaced: Boolean(existing),
    })

    return NextResponse.json({
      success: true,
      connectionCode,
      apiBaseUrl,
      defaults: {
        pauseOnFailure: configOverrides.pauseOnFailure,
        maxFailuresBeforePause: configOverrides.maxFailuresBeforePause,
        pollIntervalSeconds: configOverrides.pollIntervalSeconds,
        smsDelaySeconds: configOverrides.smsDelaySeconds,
        hourlyLimit: configOverrides.hourlyLimit,
        dailyLimit: configOverrides.dailyLimit,
      },
      message: 'Connection code generated. Copy it now — the token is shown only once.',
    })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (error.message === INVALID_PUBLIC_ORIGIN_MESSAGE) {
      return NextResponse.json({ error: INVALID_PUBLIC_ORIGIN_MESSAGE }, { status: 400 })
    }
    console.error('Generate SMS gateway connection code error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

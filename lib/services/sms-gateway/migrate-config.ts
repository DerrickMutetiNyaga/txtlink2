/**
 * Repair legacy gateway pause defaults and accidental network-driven pauses.
 */

import { SmsGatewayDevice, type ISmsGatewayDevice } from '@/lib/db/models'
import {
  GATEWAY_SETUP_DEFAULTS,
  LEGACY_GATEWAY_SETUP_DEFAULTS,
  isLegacyPauseDefault,
} from './config'
import { isAccidentalGatewayPauseReason } from './failure-classify'
import { logGatewayAudit } from './audit'

export type ConfigRepairResult = {
  repairedConfig: boolean
  clearedAccidentalPause: boolean
  deviceId?: string
}

/**
 * Migrate stored client-config mirrors when they still match old defaults.
 * Does not overwrite values the user customized away from the legacy pair.
 */
export function planLegacyConfigRepair(device: {
  clientPauseOnFailure?: boolean | null
  clientMaxFailuresBeforePause?: number | null
  configMigratedAt?: Date | null
}): {
  shouldRepair: boolean
  from: { pauseOnFailure: boolean; maxFailuresBeforePause: number } | null
  to: { pauseOnFailure: boolean; maxFailuresBeforePause: number }
} {
  const to = {
    pauseOnFailure: GATEWAY_SETUP_DEFAULTS.pauseOnFailure,
    maxFailuresBeforePause: GATEWAY_SETUP_DEFAULTS.maxFailuresBeforePause,
  }

  if (device.configMigratedAt) {
    return { shouldRepair: false, from: null, to }
  }

  // Missing mirrors ⇒ treat as old setup defaults (true / 1)
  const pauseOnFailure =
    device.clientPauseOnFailure ?? LEGACY_GATEWAY_SETUP_DEFAULTS.pauseOnFailure
  const maxFailuresBeforePause =
    device.clientMaxFailuresBeforePause ??
    LEGACY_GATEWAY_SETUP_DEFAULTS.maxFailuresBeforePause

  const current = { pauseOnFailure, maxFailuresBeforePause }

  // Repair the dangerous legacy pair, or maxFailures still stuck at 1
  const isLegacyPair = isLegacyPauseDefault(current)
  const maxFailuresIsOldDefault = maxFailuresBeforePause === 1
  const pauseIsOldDefault = pauseOnFailure === true && maxFailuresIsOldDefault

  if (!isLegacyPair && !maxFailuresIsOldDefault && !pauseIsOldDefault) {
    // User customized away from old defaults (e.g. true/10 or false/3) — preserve
    return { shouldRepair: false, from: null, to }
  }

  // Only rewrite fields that still match old defaults
  const repaired = {
    pauseOnFailure: pauseIsOldDefault || isLegacyPair ? to.pauseOnFailure : pauseOnFailure,
    maxFailuresBeforePause: maxFailuresIsOldDefault
      ? to.maxFailuresBeforePause
      : maxFailuresBeforePause,
  }

  if (
    repaired.pauseOnFailure === pauseOnFailure &&
    repaired.maxFailuresBeforePause === maxFailuresBeforePause
  ) {
    return { shouldRepair: false, from: null, to }
  }

  return { shouldRepair: true, from: current, to: repaired }
}

export async function repairGatewayDeviceConfigAndPause(
  device: ISmsGatewayDevice & { _id?: unknown; save: () => Promise<unknown> }
): Promise<ConfigRepairResult> {
  const result: ConfigRepairResult = {
    repairedConfig: false,
    clearedAccidentalPause: false,
    deviceId: device._id ? String(device._id) : undefined,
  }

  const plan = planLegacyConfigRepair(device)
  if (plan.shouldRepair && plan.from) {
    device.clientPauseOnFailure = plan.to.pauseOnFailure
    device.clientMaxFailuresBeforePause = plan.to.maxFailuresBeforePause
    device.configMigratedAt = new Date()
    device.configMigrationNote = `Repaired legacy pause defaults ${plan.from.pauseOnFailure}/${plan.from.maxFailuresBeforePause} → ${plan.to.pauseOnFailure}/${plan.to.maxFailuresBeforePause}`
    result.repairedConfig = true

    await logGatewayAudit(String(device.userId), 'GATEWAY_LEGACY_PAUSE_REPAIRED', result.deviceId, {
      from: plan.from,
      to: plan.to,
    })
  }

  // Clear accidental gateway-level pauses from network / heartbeat / sync errors
  if (
    device.pausedAt &&
    device.pauseScope !== 'SIM' &&
    isAccidentalGatewayPauseReason(device.pauseReason, device.lastFailureCode)
  ) {
    const oldReason = device.pauseReason
    device.pausedAt = undefined
    device.pauseReason = undefined
    device.pauseScope = undefined
    device.pausedSubscriptionId = undefined
    device.consecutiveTransientFailures = 0
    device.resumedAt = new Date()
    device.resumedBy = 'system_accidental_pause_repair'
    result.clearedAccidentalPause = true

    await logGatewayAudit(
      String(device.userId),
      'GATEWAY_ACCIDENTAL_PAUSE_CLEARED',
      result.deviceId,
      { oldReason, lastFailureCode: device.lastFailureCode }
    )
  }

  if (result.repairedConfig || result.clearedAccidentalPause) {
    await device.save()
  }

  return result
}

/** Batch repair for all devices (safe, idempotent). */
export async function repairAllGatewayDevices(limit = 200): Promise<{
  scanned: number
  repairedConfig: number
  clearedPause: number
}> {
  const devices = await SmsGatewayDevice.find({
    $or: [
      { configMigratedAt: { $exists: false } },
      {
        pausedAt: { $ne: null },
        pauseScope: { $ne: 'SIM' },
      },
      {
        pausedAt: { $ne: null },
        pauseScope: { $exists: false },
      },
    ],
  })
    .limit(limit)
    .exec()

  let repairedConfig = 0
  let clearedPause = 0
  for (const device of devices) {
    const r = await repairGatewayDeviceConfigAndPause(device)
    if (r.repairedConfig) repairedConfig++
    if (r.clearedAccidentalPause) clearedPause++
  }

  return { scanned: devices.length, repairedConfig, clearedPause }
}

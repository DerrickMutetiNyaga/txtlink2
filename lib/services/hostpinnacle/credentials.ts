/**
 * Resolves HostPinnacle credentials from all supported sources, in order:
 *   1. Per-user HostPinnacleAccount (sub-account)
 *   2. SystemSettings in MongoDB (Super Admin → Settings)
 *   3. Environment variables (Render / .env)
 */

import mongoose from 'mongoose'
import connectDB from '@/lib/db/connect'
import { HostPinnacleAccount, SystemSettings } from '@/lib/db/models'
import { decrypt } from '@/lib/utils/encryption'

export interface HostPinnacleCredentials {
  userId: string
  password?: string
  apiKey?: string
  source: 'user_account' | 'system_settings' | 'environment'
}

function envUserId(): string | undefined {
  return process.env.HOSTPINNACLE_USERID || process.env.HOSTPINNACLE_USER_ID
}

function envPassword(): string | undefined {
  return process.env.HOSTPINNACLE_PASSWORD
}

function envApiKey(): string | undefined {
  return process.env.HOSTPINNACLE_API_KEY || process.env.HOSTPINNACLE_APIKEY
}

function hasUsableCredentials(creds: {
  userId?: string
  password?: string
  apiKey?: string
}): boolean {
  if (!creds.userId?.trim()) return false
  return !!(creds.password?.trim() || creds.apiKey?.trim())
}

/**
 * Master account credentials (SystemSettings, then env fallback).
 */
export async function loadMasterHostPinnacleCredentials(): Promise<HostPinnacleCredentials | null> {
  await connectDB()

  const systemSettings = await SystemSettings.findOne().lean()
  const userId = systemSettings?.hostpinnacleUserId || envUserId()
  const password = systemSettings?.hostpinnaclePassword || envPassword()
  const apiKey = systemSettings?.hostpinnacleApiKey || envApiKey()

  if (!hasUsableCredentials({ userId, password, apiKey })) {
    return null
  }

  const fromDb =
    !!systemSettings?.hostpinnacleUserId &&
    !!(systemSettings?.hostpinnaclePassword || systemSettings?.hostpinnacleApiKey)

  return {
    userId: userId!.trim(),
    password: password?.trim() || undefined,
    apiKey: apiKey?.trim() || undefined,
    source: fromDb ? 'system_settings' : 'environment',
  }
}

/**
 * Credentials for sending SMS: user sub-account first, then master account.
 */
export async function resolveHostPinnacleCredentials(
  userId?: mongoose.Types.ObjectId | string
): Promise<HostPinnacleCredentials | null> {
  await connectDB()

  if (userId) {
    const userObjectId =
      typeof userId === 'string' ? new mongoose.Types.ObjectId(userId) : userId
    const hpAccount = await HostPinnacleAccount.findOne({ userId: userObjectId }).lean()

    if (hpAccount?.hpUserLoginName) {
      const password = hpAccount.hpPasswordEncrypted
        ? decrypt(hpAccount.hpPasswordEncrypted)
        : undefined
      const apiKey = hpAccount.hpApiKeyEncrypted
        ? decrypt(hpAccount.hpApiKeyEncrypted)
        : undefined

      if (hasUsableCredentials({ userId: hpAccount.hpUserLoginName, password, apiKey })) {
        return {
          userId: hpAccount.hpUserLoginName,
          password,
          apiKey,
          source: 'user_account',
        }
      }
    }
  }

  return loadMasterHostPinnacleCredentials()
}

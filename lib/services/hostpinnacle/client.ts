/**
 * HostPinnacle API Client
 * Handles all API calls to HostPinnacle SMS portal
 * Reads configuration from database (SystemSettings) with environment variable fallback
 */

import { SystemSettings } from '@/lib/db/models'
import connectDB from '@/lib/db/connect'

// Cache for settings to avoid repeated DB calls
let settingsCache: {
  baseUrl: string
  userId?: string
  password?: string
  apiKey?: string
  statusEndpoint: string
  timeout: number
  smsSendTimeout: number
  statusTimeout: number
  cachedAt: number
} | null = null

const CACHE_TTL = 60000 // Cache for 60 seconds

/**
 * Get HostPinnacle settings from database or environment variables
 */
async function getHostPinnacleSettings() {
  // Return cached settings if still valid
  if (settingsCache && Date.now() - settingsCache.cachedAt < CACHE_TTL) {
    return settingsCache
  }

  try {
    await connectDB()
    const systemSettings = await SystemSettings.findOne().lean()
    
    if (systemSettings) {
      settingsCache = {
        baseUrl: systemSettings.hostpinnacleBaseUrl || process.env.HOSTPINNACLE_BASE_URL || 'https://smsportal.hostpinnacle.co.ke',
        userId: systemSettings.hostpinnacleUserId || process.env.HOSTPINNACLE_USERID,
        password: systemSettings.hostpinnaclePassword || process.env.HOSTPINNACLE_PASSWORD,
        apiKey: systemSettings.hostpinnacleApiKey || process.env.HOSTPINNACLE_API_KEY,
        statusEndpoint: systemSettings.hostpinnacleStatusEndpoint || process.env.HOSTPINNACLE_STATUS_ENDPOINT || '/SMSApi/report/status',
        timeout: systemSettings.hostpinnacleTimeout || parseInt(process.env.HOSTPINNACLE_TIMEOUT || '30000'),
        smsSendTimeout: systemSettings.hostpinnacleSmsSendTimeout || parseInt(process.env.HOSTPINNACLE_SMS_SEND_TIMEOUT || '45000'),
        statusTimeout: systemSettings.hostpinnacleStatusTimeout || parseInt(process.env.HOSTPINNACLE_STATUS_TIMEOUT || '15000'),
        cachedAt: Date.now(),
      }
      return settingsCache
    }
  } catch (error) {
    console.warn('Failed to load HostPinnacle settings from database, using env vars:', error)
  }

  // Fallback to environment variables
  settingsCache = {
    baseUrl: process.env.HOSTPINNACLE_BASE_URL || 'https://smsportal.hostpinnacle.co.ke',
    userId: process.env.HOSTPINNACLE_USERID,
    password: process.env.HOSTPINNACLE_PASSWORD,
    apiKey: process.env.HOSTPINNACLE_API_KEY,
    statusEndpoint: process.env.HOSTPINNACLE_STATUS_ENDPOINT || '/SMSApi/report/status',
    timeout: parseInt(process.env.HOSTPINNACLE_TIMEOUT || '30000'),
    smsSendTimeout: parseInt(process.env.HOSTPINNACLE_SMS_SEND_TIMEOUT || '45000'),
    statusTimeout: parseInt(process.env.HOSTPINNACLE_STATUS_TIMEOUT || '15000'),
    cachedAt: Date.now(),
  }
  return settingsCache
}

// Clear cache when settings are updated (call this from settings API)
export function clearHostPinnacleSettingsCache() {
  settingsCache = null
}

interface HostPinnacleRequestOptions {
  apiKey?: string
  userId?: string
  password?: string
}

interface HostPinnacleResponse {
  success: boolean
  data?: any
  error?: string
  message?: string
}

/**
 * Make a form-urlencoded POST request to HostPinnacle
 */
async function requestForm(
  endpoint: string,
  body: Record<string, string | number>,
  options: HostPinnacleRequestOptions & { timeout?: number } = {}
): Promise<HostPinnacleResponse> {
  const settings = await getHostPinnacleSettings()
  const url = `${settings.baseUrl}${endpoint}`

  // Build form data
  const formData = new URLSearchParams()
  for (const [key, value] of Object.entries(body)) {
    formData.append(key, String(value))
  }

  // Add auth: prefer apiKey in header (from options or env), otherwise userId+password in body
  const headers: Record<string, string> = {
    'Content-Type': 'application/x-www-form-urlencoded',
  }

  if (options.apiKey) {
    // Explicit API key passed in options
    headers['apiKey'] = options.apiKey
  } else if (settings.apiKey) {
    // Use API key from settings (database or env)
    headers['apiKey'] = settings.apiKey
  } else if (options.userId && options.password) {
    formData.append('userid', options.userId)
    formData.append('password', options.password)
  } else if (settings.userId && settings.password) {
    // Use credentials from settings (database or env)
    formData.append('userid', settings.userId)
    formData.append('password', settings.password)
  }

  // Use custom timeout if provided, otherwise use default from settings
  const timeout = options.timeout || settings.timeout

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: formData.toString(),
      signal: AbortSignal.timeout(timeout),
    })

    const text = await response.text()

    // Concise, PII-free log: never dump the raw body (it can contain
    // customer phone numbers) or headers.
    console.log(
      `[HostPinnacle] ${endpoint} -> HTTP ${response.status} (${text.length} bytes)`
    )

    let data: any

    try {
      data = JSON.parse(text)
    } catch (parseError) {
      console.error(`[HostPinnacle] ${endpoint} returned non-JSON response (${text.length} bytes)`)
      // If not JSON, treat as error
      return {
        success: false,
        error: `Invalid response: ${text.substring(0, 100)}`,
      }
    }

    if (!response.ok) {
      return {
        success: false,
        error: data.error || data.message || `HTTP ${response.status}`,
        message: data.message,
      }
    }

    // HostPinnacle often returns success in different formats
    // Check for nested response object (common format)
    if (data.response) {
      const response = data.response
      if (response.status === 'success' || response.Status === 'Success') {
        return {
          success: true,
          data: response, // Return the response object which contains senderidList
        }
      }
      if (response.status === 'error' || response.Status === 'Error') {
        return {
          success: false,
          error: response.error || response.msg || 'Unknown error',
          message: response.msg,
        }
      }
    }

    if (data.status === 'success' || data.Status === 'Success' || data.success === true) {
      return {
        success: true,
        data: data.data || data.result || data,
      }
    }

    if (data.status === 'error' || data.Status === 'Error' || data.error) {
      return {
        success: false,
        error: data.error || data.message || 'Unknown error',
        message: data.message,
      }
    }

    // Default: assume success if no error indicators
    return {
      success: true,
      data,
    }
  } catch (error: any) {
    if (error.name === 'AbortError' || error.message?.includes('timeout') || error.message?.includes('aborted')) {
      return {
        success: false,
        error: `Request timeout after ${timeout}ms. The HostPinnacle API may be slow or unavailable. Please try again.`,
      }
    }
    return {
      success: false,
      error: error.message || 'Network error',
    }
  }
}

/**
 * Read SMS delivery status by message ID (uuid/msgid)
 * HostPinnacle requires at least: userid, password/apiKey, uuid (or msgid), output=json
 * PHP example uses 'uuid' parameter, but we support both for compatibility
 */
export async function readSmsStatus(params: {
  msgid?: string
  uuid?: string
  options?: HostPinnacleRequestOptions
}): Promise<HostPinnacleResponse> {
  const body: Record<string, string> = {
    output: 'json',
  }

  // Use uuid if provided (matching PHP example), otherwise use msgid
  if (params.uuid) {
    body.uuid = params.uuid
  } else if (params.msgid) {
    body.msgid = params.msgid
    // Also try uuid with the same value (some endpoints accept both)
    body.uuid = params.msgid
  } else {
    return {
      success: false,
      error: 'Either msgid or uuid must be provided',
    }
  }

  const settings = await getHostPinnacleSettings()

  // Ensure userid is always sent for status checks to avoid error 213
  const authOptions = { ...params.options }
  if (!authOptions.userId && settings.userId) {
    authOptions.userId = settings.userId
  }
  if (!authOptions.password && settings.password) {
    authOptions.password = settings.password
  }
  if (!authOptions.apiKey && settings.apiKey) {
    authOptions.apiKey = settings.apiKey
  }

  const result = await requestForm(settings.statusEndpoint, body, {
    ...authOptions,
    timeout: settings.statusTimeout, // Use shorter timeout for status checks
  })

  console.log(
    `[HostPinnacle] status lookup uuid=${body.uuid} success=${result.success}` +
      (result.error ? ` error=${result.error}` : '')
  )

  return result
}

/**
 * Create a sub-user (customer) in HostPinnacle
 */
export async function createSubUser(params: {
  userLoginName: string
  email: string
  mobileNo: string
  fullName: string
  address?: string
  city?: string
  expiryDate?: string // Format: YYYY-MM-DD
  options?: HostPinnacleRequestOptions
}): Promise<HostPinnacleResponse> {
  const body: Record<string, string> = {
    userloginname: params.userLoginName,
    usertype: 'customer',
    email: params.email,
    mobileno: params.mobileNo,
    fullname: params.fullName,
    expirydate: params.expiryDate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 1 year from now
  }

  if (params.address) body.address = params.address
  if (params.city) body.city = params.city
  body.output = 'json'

  return requestForm('/SMSApi/reseller/createuser', body, params.options)
}

/**
 * Add credits to a sub-user
 */
export async function addCredits(params: {
  userLoginName: string
  credits: number
  transactionType?: string
  comment?: string
  options?: HostPinnacleRequestOptions
}): Promise<HostPinnacleResponse> {
  const body: Record<string, string | number> = {
    userloginname: params.userLoginName,
    product: 'SMS',
    transactiontype: params.transactionType || 'credit',
    credits: params.credits,
    comment: params.comment || 'Credits added via reseller API',
    output: 'json',
  }

  return requestForm('/SMSApi/reseller/addcredit', body, params.options)
}

/**
 * Create a Sender ID
 */
export async function createSenderId(params: {
  senderId: string
  options?: HostPinnacleRequestOptions
}): Promise<HostPinnacleResponse> {
  const body: Record<string, string> = {
    senderid: params.senderId,
    output: 'json',
  }

  return requestForm('/SMSApi/senderid/create', body, params.options)
}

/**
 * Read Sender IDs for a user
 */
export async function readSenderIds(params: {
  options?: HostPinnacleRequestOptions
}): Promise<HostPinnacleResponse> {
  const body: Record<string, string> = {
    output: 'json',
  }

  return requestForm('/SMSApi/senderid/read', body, params.options)
}

/**
 * Send SMS batch
 * Uses longer timeout (90 seconds) as SMS sending can take time
 * Includes retry logic for timeout errors (up to 2 retries)
 */
export async function sendSms(params: {
  mobile: string | string[] // Comma-separated or array
  msg: string
  senderid: string
  msgType?: string
  options?: HostPinnacleRequestOptions
  retries?: number // Number of retries on timeout (default: 2)
}): Promise<HostPinnacleResponse> {
  const mobileStr = Array.isArray(params.mobile) ? params.mobile.join(',') : params.mobile

  const body: Record<string, string> = {
    sendMethod: 'quick',
    mobile: mobileStr,
    msg: params.msg,
    senderid: params.senderid,
    msgType: params.msgType || 'text',
    output: 'json',
  }

  const maxRetries = params.retries ?? 1 // Reduced from 2 to 1 for faster failure
  let lastError: HostPinnacleResponse | null = null

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const result = await requestForm('/SMSApi/send', body, {
      ...params.options,
      timeout: (await getHostPinnacleSettings()).smsSendTimeout, // Use timeout for SMS send
    })

    // If successful, return immediately
    if (result.success) {
      return result
    }

    // If timeout error and we have retries left, wait and retry
    if (
      result.error?.includes('timeout') &&
      attempt < maxRetries
    ) {
      lastError = result
      // Wait before retrying (reduced backoff: 1s, 2s)
      const waitTime = Math.min(1000 * Math.pow(2, attempt), 5000)
      console.log(`SMS send timeout, retrying in ${waitTime}ms (attempt ${attempt + 1}/${maxRetries + 1})...`)
      await new Promise((resolve) => setTimeout(resolve, waitTime))
      continue
    }

    // If not a timeout or no retries left, return the error
    return result
  }

  // All retries exhausted
  return lastError || {
    success: false,
    error: 'Request failed after multiple retries',
  }
}

/**
 * Create webhook for delivery reports
 */
export async function createWebhook(params: {
  smsWebhook: string // Your webhook URL
  smsWebhookRate?: number // TPS rate
  options?: HostPinnacleRequestOptions
}): Promise<HostPinnacleResponse> {
  const body: Record<string, string | number> = {
    smswebhook: params.smsWebhook,
    smswebhookrate: params.smsWebhookRate || 10,
    output: 'json',
  }

  return requestForm('/SMSApi/webhook/create', body, params.options)
}

export const hostPinnacleClient = {
  createSubUser,
  addCredits,
  createSenderId,
  readSenderIds,
  sendSms,
  readSmsStatus,
  createWebhook,
}


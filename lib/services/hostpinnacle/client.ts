/**
 * HostPinnacle API Client
 * Handles all API calls to HostPinnacle SMS portal
 */

const HOSTPINNACLE_BASE_URL = process.env.HOSTPINNACLE_BASE_URL || 'https://smsportal.hostpinnacle.co.ke'
const HOSTPINNACLE_USERID = process.env.HOSTPINNACLE_USERID
const HOSTPINNACLE_PASSWORD = process.env.HOSTPINNACLE_PASSWORD

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
  options: HostPinnacleRequestOptions = {}
): Promise<HostPinnacleResponse> {
  const url = `${HOSTPINNACLE_BASE_URL}${endpoint}`

  // Build form data
  const formData = new URLSearchParams()
  for (const [key, value] of Object.entries(body)) {
    formData.append(key, String(value))
  }

  // Add auth: prefer apiKey in header, otherwise userId+password in body
  const headers: Record<string, string> = {
    'Content-Type': 'application/x-www-form-urlencoded',
  }

  if (options.apiKey) {
    headers['apiKey'] = options.apiKey
  } else if (options.userId && options.password) {
    formData.append('userid', options.userId)
    formData.append('password', options.password)
  } else if (HOSTPINNACLE_USERID && HOSTPINNACLE_PASSWORD) {
    // Fallback to env vars
    formData.append('userid', HOSTPINNACLE_USERID)
    formData.append('password', HOSTPINNACLE_PASSWORD)
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: formData.toString(),
      signal: AbortSignal.timeout(30000),
    })

    const text = await response.text()
    let data: any

    try {
      data = JSON.parse(text)
    } catch {
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
    if (error.name === 'AbortError') {
      return {
        success: false,
        error: 'Request timeout',
      }
    }
    return {
      success: false,
      error: error.message || 'Network error',
    }
  }
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
 */
export async function sendSms(params: {
  mobile: string | string[] // Comma-separated or array
  msg: string
  senderid: string
  msgType?: string
  options?: HostPinnacleRequestOptions
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

  return requestForm('/SMSApi/send', body, params.options)
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
  createWebhook,
}


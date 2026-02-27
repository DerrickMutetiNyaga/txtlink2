/**
 * Webhook Delivery Service
 * Handles sending webhooks to user-configured endpoints
 */

import { IUserWebhook } from '@/lib/db/models'

interface WebhookPayload {
  transactionId?: string
  messageId?: string
  errorCode?: string
  mobileNumber?: string
  receivedTime?: string
  deliveredTime?: string
  readTime?: string
  status?: string
  [key: string]: any // For custom parameters
}

/**
 * Format payload according to webhook configuration
 */
function formatPayload(
  webhook: IUserWebhook,
  data: WebhookPayload
): Record<string, any> {
  const payload: Record<string, any> = {}

  // Map standard fields to configured parameter names
  if (webhook.transactionIdParam && data.transactionId) {
    payload[webhook.transactionIdParam] = data.transactionId
  }
  if (webhook.messageIdParam && data.messageId) {
    payload[webhook.messageIdParam] = data.messageId
  }
  if (webhook.errorCodeParam && data.errorCode) {
    payload[webhook.errorCodeParam] = data.errorCode
  }
  if (webhook.mobileNumberParam && data.mobileNumber) {
    payload[webhook.mobileNumberParam] = data.mobileNumber
  }
  if (webhook.receivedTimeParam && data.receivedTime) {
    payload[webhook.receivedTimeParam] = data.receivedTime
  }
  if (webhook.deliveredTimeParam && data.deliveredTime) {
    payload[webhook.deliveredTimeParam] = data.deliveredTime
  }
  if (webhook.readTimeParam && data.readTime) {
    payload[webhook.readTimeParam] = data.readTime
  }
  if (webhook.statusParam && data.status) {
    payload[webhook.statusParam] = data.status
  }

  // Add custom parameters
  if (webhook.customParameters && webhook.customParameters.length > 0) {
    webhook.customParameters.forEach((param) => {
      payload[param.name] = param.value
    })
  }

  return payload
}

/**
 * Send webhook to user's endpoint
 */
export async function sendWebhook(
  webhook: IUserWebhook,
  data: WebhookPayload
): Promise<{ success: boolean; response?: string; error?: string }> {
  if (webhook.status !== 'active') {
    return { success: false, error: 'Webhook is inactive' }
  }

  try {
    const payload = formatPayload(webhook, data)
    const headers: Record<string, string> = {
      'User-Agent': 'Enterprise-SMS-Platform/1.0',
    }

    // Add custom headers
    if (webhook.customHeaders && webhook.customHeaders.length > 0) {
      webhook.customHeaders.forEach((header) => {
        headers[header.name] = header.value
      })
    }

    let response: Response
    const url = new URL(webhook.url)

    switch (webhook.serverSendMethod) {
      case 'GET':
        // Append payload as query parameters
        Object.entries(payload).forEach(([key, value]) => {
          url.searchParams.append(key, String(value))
        })
        response = await fetch(url.toString(), {
          method: 'GET',
          headers,
        })
        break

      case 'POST':
        // Send as form-urlencoded
        const formData = new URLSearchParams()
        Object.entries(payload).forEach(([key, value]) => {
          formData.append(key, String(value))
        })
        headers['Content-Type'] = 'application/x-www-form-urlencoded'
        response = await fetch(webhook.url, {
          method: 'POST',
          headers,
          body: formData.toString(),
        })
        break

      case 'JSON':
        // Send as JSON
        headers['Content-Type'] = 'application/json'
        response = await fetch(webhook.url, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
        })
        break

      case 'XML':
        // Send as XML (simple format)
        headers['Content-Type'] = 'application/xml'
        const xmlBody = `<?xml version="1.0" encoding="UTF-8"?><webhook>${Object.entries(payload)
          .map(([key, value]) => `<${key}>${String(value)}</${key}>`)
          .join('')}</webhook>`
        response = await fetch(webhook.url, {
          method: 'POST',
          headers,
          body: xmlBody,
        })
        break

      default:
        return { success: false, error: 'Invalid server send method' }
    }

    const responseText = await response.text()

    if (response.ok) {
      return { success: true, response: responseText }
    } else {
      return {
        success: false,
        error: `HTTP ${response.status}: ${responseText.substring(0, 200)}`,
      }
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to send webhook',
    }
  }
}

/**
 * Test webhook by sending a test payload
 */
export async function testWebhook(
  webhook: IUserWebhook
): Promise<{ success: boolean; response?: string; error?: string }> {
  const testData: WebhookPayload = {
    transactionId: 'TEST_TXN_' + Date.now(),
    messageId: 'TEST_MSG_' + Date.now(),
    errorCode: '0',
    mobileNumber: '+254712345678',
    receivedTime: new Date().toISOString(),
    deliveredTime: new Date().toISOString(),
    status: 'delivered',
  }

  return sendWebhook(webhook, testData)
}


/**
 * M-Pesa Service Class
 * Handles STK Push and C2B integration with M-Pesa API
 */

import crypto from 'crypto'

interface MpesaConfig {
  consumerKey: string
  consumerSecret: string
  passkey: string
  shortcode: string
  callbackUrl: string
  environment: 'sandbox' | 'production'
}

interface StkPushRequest {
  phoneNumber: string
  amount: number
  accountReference: string
  transactionDesc?: string
}

interface StkPushResponse {
  merchantRequestId: string
  checkoutRequestId: string
  responseCode: string
  responseDescription: string
  customerMessage: string
}

interface C2BRegisterUrlResponse {
  originatorConversationID: string
  responseCode: string
  responseDescription: string
}

export class MpesaService {
  private config: MpesaConfig
  private baseUrl: string

  constructor(config: MpesaConfig) {
    this.config = config
    this.baseUrl =
      config.environment === 'production'
        ? 'https://api.safaricom.co.ke'
        : 'https://sandbox.safaricom.co.ke'
  }

  /**
   * Generate access token for M-Pesa API
   */
  private async getAccessToken(): Promise<string> {
    const auth = Buffer.from(`${this.config.consumerKey}:${this.config.consumerSecret}`).toString('base64')

    console.log('Consumer Key:', this.config.consumerKey)
    console.log('Consumer Secret:', this.config.consumerSecret)


    const response = await fetch(`${this.baseUrl}/oauth/v1/generate?grant_type=client_credentials`, {
      method: 'GET',
      headers: {
        Authorization: `Basic ${auth}`,
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Failed to get access token: ${response.status} ${errorText}`)
    }

    const data = await response.json()
    return data.access_token
  }

  /**
   * Generate password for STK Push (Base64 encoded)
   */
  private generatePassword(): string {
    const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, -3)
    const password = Buffer.from(`${this.config.shortcode}${this.config.passkey}${timestamp}`).toString('base64')
    return password
  }

  /**
   * Generate timestamp in format YYYYMMDDHHmmss
   */
  private generateTimestamp(): string {
    return new Date().toISOString().replace(/[^0-9]/g, '').slice(0, -3)
  }

  /**
   * Format phone number to 254XXXXXXXXX format
   */
  private formatPhoneNumber(phone: string): string {
    // Remove all non-digit characters
    let cleaned = phone.replace(/\D/g, '')
    
    // If starts with 0, replace with 254
    if (cleaned.startsWith('0')) {
      cleaned = '254' + cleaned.substring(1)
    }
    // If starts with +254, remove +
    else if (cleaned.startsWith('254')) {
      // Already correct
    }
    // If starts with 254, it's already correct
    // Otherwise, assume it's missing country code
    else if (cleaned.length === 9) {
      cleaned = '254' + cleaned
    }

    return cleaned
  }

  /**
   * Initiate STK Push payment request
   */
  async initiateStkPush(request: StkPushRequest): Promise<StkPushResponse> {
    try {
      const accessToken = await this.getAccessToken()
      const timestamp = this.generateTimestamp()
      const password = this.generatePassword()
      const phoneNumber = this.formatPhoneNumber(request.phoneNumber)

      const payload = {
        BusinessShortCode: this.config.shortcode,
        Password: password,
        Timestamp: timestamp,
        TransactionType: 'CustomerPayBillOnline',
        Amount: Math.floor(request.amount), // M-Pesa requires integer amount
        PartyA: phoneNumber,
        PartyB: this.config.shortcode,
        PhoneNumber: phoneNumber,
        CallBackURL: this.config.callbackUrl,
        AccountReference: request.accountReference,
        TransactionDesc: request.transactionDesc || 'Payment',
      }

      const response = await fetch(`${this.baseUrl}/mpesa/stkpush/v1/processrequest`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`STK Push failed: ${response.status} ${errorText}`)
      }

      const data = await response.json()

      if (data.ResponseCode !== '0') {
        // Map common M-Pesa error codes to user-friendly messages
        const errorMessages: Record<string, string> = {
          '1032': 'Payment was cancelled. Please try again.',
          '1037': 'Payment request timed out. Please check your phone and try again.',
          '1': 'Invalid request. Please check your details and try again.',
          '2': 'Invalid subscriber information. Please verify your phone number.',
          '3': 'Subscriber is not on the network. Please check your phone connection.',
          '4': 'Insufficient funds. Please ensure you have enough balance in your M-Pesa account.',
          '5': 'Transaction limit exceeded. Please try a smaller amount.',
          '17': 'Transaction could not be processed. Please try again later.',
          '20': 'Invalid request. Please check your details and try again.',
          '26': 'Transaction could not be completed. Please try again.',
        }
        
        const errorCode = data.ResponseCode?.toString()
        const userFriendlyMessage = errorMessages[errorCode] || data.ResponseDescription || data.errorMessage || 'Failed to initiate payment. Please try again.'
        
        throw new Error(userFriendlyMessage)
      }

      return {
        merchantRequestId: data.MerchantRequestID,
        checkoutRequestId: data.CheckoutRequestID,
        responseCode: data.ResponseCode,
        responseDescription: data.ResponseDescription,
        customerMessage: data.CustomerMessage,
      }
    } catch (error: any) {
      console.error('STK Push error:', error)
      throw new Error(`Failed to initiate STK Push: ${error.message}`)
    }
  }

  /**
   * Query STK Push status
   */
  async queryStkPushStatus(checkoutRequestId: string): Promise<any> {
    try {
      const accessToken = await this.getAccessToken()
      const timestamp = this.generateTimestamp()
      const password = this.generatePassword()

      const payload = {
        BusinessShortCode: this.config.shortcode,
        Password: password,
        Timestamp: timestamp,
        CheckoutRequestID: checkoutRequestId,
      }

      const response = await fetch(`${this.baseUrl}/mpesa/stkpushquery/v1/query`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`STK Query failed: ${response.status} ${errorText}`)
      }

      return await response.json()
    } catch (error: any) {
      console.error('STK Query error:', error)
      throw new Error(`Failed to query STK Push status: ${error.message}`)
    }
  }

  /**
   * Register C2B URLs (Validation and Confirmation)
   * Uses M-Pesa C2B v2 API endpoint
   */
  async registerC2BUrls(validationUrl: string, confirmationUrl: string): Promise<C2BRegisterUrlResponse> {
    try {
      const accessToken = await this.getAccessToken()

      console.log('Access Token on C2B registration:', accessToken)
      console.log('Short Code on C2B registration:', this.config.shortcode)
      console.log('Confirmation URL on C2B registration:', confirmationUrl)
      console.log('Validation URL on C2B registration:', validationUrl)
      console.log('Base URL on C2B registration:', this.baseUrl+'/mpesa/c2b/v2/registerurl')

      const payload = {
        ShortCode: this.config.shortcode,
        ResponseType: 'Completed', // As per M-Pesa API documentation mpesa/c2b/v2/registerurl
        ConfirmationURL: confirmationUrl,
        ValidationURL: validationUrl,
      }

      // Use v2 endpoint as per official M-Pesa API
      const response = await fetch(`${this.baseUrl}/mpesa/c2b/v2/registerurl`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`C2B URL registration failed: ${response.status} ${errorText}`)
      }

      const data = await response.json()

      console.log('Data on C2B registration:', data)

      if (data.ResponseCode !== '0') {
        throw new Error(`C2B registration error: ${data.ResponseDescription || 'Unknown error'}`)
      }

      // Handle both possible field name variations (API docs show typo in some responses)
      return {
        originatorConversationID: data.OriginatorConversationID || data.OriginatorCoversationID,
        responseCode: data.ResponseCode,
        responseDescription: data.ResponseDescription,
      }
    } catch (error: any) {
      console.error('C2B URL registration error:', error)
      throw new Error(`Failed to register C2B URLs: ${error.message}`)
    }
  }

  /**
   * Simulate C2B payment (for testing in sandbox only)
   * Note: Simulation is not supported on production
   */
  async simulateC2BPayment(
    phoneNumber: string,
    amount: number,
    billRefNumber: string,
    commandId: 'CustomerPayBillOnline' | 'CustomerBuyGoodsOnline' = 'CustomerPayBillOnline'
  ): Promise<any> {
    if (this.config.environment === 'production') {
      throw new Error('C2B simulation is not supported in production. Use M-Pesa App, USSD, or Sim Toolkit for payments.')
    }

    try {
      const accessToken = await this.getAccessToken()
      const formattedPhone = this.formatPhoneNumber(phoneNumber)

      const payload = {
        ShortCode: parseInt(this.config.shortcode), // Should be number, not string
        CommandID: commandId,
        Amount: Math.floor(amount),
        Msisdn: parseInt(formattedPhone), // Should be number, not string
        BillRefNumber: billRefNumber || null, // null for CustomerBuyGoodsOnline
      }

      // Use v2 endpoint as per official M-Pesa API
      const response = await fetch(`${this.baseUrl}/mpesa/c2b/v2/simulate`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`C2B simulation failed: ${response.status} ${errorText}`)
      }

      const data = await response.json()

      if (data.ResponseCode !== '0') {
        throw new Error(`C2B simulation error: ${data.ResponseDescription || 'Unknown error'}`)
      }

      return data
    } catch (error: any) {
      console.error('C2B simulation error:', error)
      throw new Error(`Failed to simulate C2B payment: ${error.message}`)
    }
  }

  /**
   * Get M-Pesa configuration from SystemSettings
   */
  static async getMpesaConfig(): Promise<MpesaConfig | null> {
    const { SystemSettings } = await import('@/lib/db/models')
    const { default: connectDB } = await import('@/lib/db/connect')

    await connectDB()
    const settings = await SystemSettings.findOne()

    if (!settings || !settings.mpesaEnabled || !settings.mpesaConsumerKey) {
      return null
    }

    return {
      consumerKey: settings.mpesaConsumerKey || '',
      consumerSecret: settings.mpesaConsumerSecret || '',
      passkey: settings.mpesaPasskey || '',
      shortcode: settings.mpesaShortcode || '',
      callbackUrl: settings.mpesaCallbackUrl || '',
      environment: settings.mpesaEnvironment || 'sandbox',
    }
  }

  /**
   * Create M-Pesa service instance from system settings
   */
  static async createFromSettings(): Promise<MpesaService | null> {
    const config = await this.getMpesaConfig()
    if (!config) {
      return null
    }
    return new MpesaService(config)
  }
}


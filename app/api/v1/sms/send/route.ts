/**
 * Public SMS Send API v1
 * POST /api/v1/sms/send
 * 
 * Supports two authentication methods:
 * 1. API Key: Bearer token in Authorization header
 * 2. Username/Password: Basic Auth or in request body
 */

import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db/connect'
import { User, SenderId, UserSenderId, SmsMessage, HostPinnacleAccount, ApiKey } from '@/lib/db/models'
import { hostPinnacleClient } from '@/lib/services/hostpinnacle/client'
import { decrypt } from '@/lib/utils/encryption'
import { calculateSegments153, getEffectivePricePerCreditKes } from '@/lib/utils/credits'
import { initialNextCheckAt } from '@/lib/services/sms-status/build-synchronizer'
import { maskPhone } from '@/lib/utils/log-sanitize'
import bcrypt from 'bcryptjs'
import mongoose from 'mongoose'

// Format phone number to E.164
function formatPhoneNumber(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  
  // If starts with 0, assume Kenya and convert to +254
  if (digits.startsWith('0')) {
    return `+254${digits.substring(1)}`
  }
  
  // If already has country code, ensure it starts with +
  if (phone.startsWith('+')) {
    return phone
  }
  
  // If digits start with 254 (Kenya), add +
  if (digits.startsWith('254')) {
    return `+${digits}`
  }
  
  // If digits start with 7 or 1 (Kenya mobile without country code), add +254
  if ((digits.startsWith('7') || digits.startsWith('1')) && digits.length === 9) {
    return `+254${digits}`
  }
  
  // Default: add + prefix
  return `+${digits}`
}

/**
 * Authenticate using API Key (Bearer token)
 */
async function authenticateWithApiKey(apiKey: string): Promise<{ userId: string; user: any } | null> {
  try {
    // Fast lookup: narrow candidates by stored keyPrefix (sk_live_ + 8 chars / sk_test_ + 8 chars)
    const normalized = apiKey.trim()
    if (!normalized.startsWith('sk_live_') && !normalized.startsWith('sk_test_')) {
      return null
    }

    // keyPrefix is stored like: sk_live_<first8> or sk_test_<first8>
    const prefixLen = 'sk_live_'.length + 8
    const lookupPrefix = normalized.substring(0, prefixLen)

    // Find candidate API keys by prefix, then compare hash
    const apiKeys = await ApiKey.find({ status: 'active', keyPrefix: lookupPrefix }).lean()
    
    for (const key of apiKeys) {
      // Try to match the API key
      // Since we store hashes, we need to check if the provided key matches any hash
      const isMatch = await bcrypt.compare(apiKey, key.keyHash)
      if (isMatch) {
        const user = await User.findById(key.userId).lean()
        if (user && user.isActive) {
          // Update last used timestamp
          await ApiKey.findByIdAndUpdate(key._id, { lastUsedAt: new Date() })
          return { userId: key.userId.toString(), user }
        }
      }
    }
    
    return null
  } catch (error) {
    console.error('API key authentication error:', error)
    return null
  }
}

/**
 * Authenticate using username (email) and password
 */
async function authenticateWithCredentials(email: string, password: string): Promise<{ userId: string; user: any } | null> {
  try {
    const user = await User.findOne({ email: email.toLowerCase() }).lean()
    
    if (!user || !user.isActive) {
      return null
    }
    
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash)
    if (!isPasswordValid) {
      return null
    }
    
    return { userId: user._id!.toString(), user }
  } catch (error) {
    console.error('Username/password authentication error:', error)
    return null
  }
}

/**
 * Authenticate request - supports both API key and username/password
 * Returns auth result
 */
async function authenticateRequest(request: NextRequest, body?: any): Promise<{ userId: string; user: any } | null> {
  // Try API Key authentication first (Bearer token)
  const authHeader = request.headers.get('authorization')
  
  if (authHeader) {
    // Check for Bearer token (API Key)
    if (authHeader.startsWith('Bearer ')) {
      const apiKey = authHeader.substring(7).trim()
      const auth = await authenticateWithApiKey(apiKey)
      if (auth) return auth
    }
    
    // Check for Basic Auth (username:password)
    if (authHeader.startsWith('Basic ')) {
      const base64Credentials = authHeader.substring(6).trim()
      const credentials = Buffer.from(base64Credentials, 'base64').toString('utf-8')
      const [email, password] = credentials.split(':')
      
      if (email && password) {
        const auth = await authenticateWithCredentials(email, password)
        if (auth) return auth
      }
    }
  }
  
  // Try username/password from request body (if provided)
  if (body) {
    const { username, email, password } = body
    const emailToUse = username || email
    if (emailToUse && password) {
      const auth = await authenticateWithCredentials(emailToUse, password)
      if (auth) return auth
    }
  }
  
  return null
}

export async function POST(request: NextRequest) {
  try {
    await connectDB()
    
    // Parse request body first
    let body: any
    try {
      body = await request.json()
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      )
    }
    
    // Authenticate request (can use body for username/password auth)
    const auth = await authenticateRequest(request, body)
    if (!auth) {
      return NextResponse.json(
        { 
          error: 'Unauthorized',
          message: 'Invalid API key or credentials. Please check your authentication method.',
          hint: 'Use Bearer token for API key, or Basic Auth/username+password for credentials'
        },
        { status: 401 }
      )
    }
    
    const { userId, user } = auth
    const userObjectId = new mongoose.Types.ObjectId(userId)
    
    // Remove auth fields from body if they were used
    delete body.username
    delete body.email
    delete body.password
    
    const { to, message, senderId, senderIdName } = body
    
    // Validate inputs
    if (!to || !message) {
      return NextResponse.json(
        { error: 'to and message are required' },
        { status: 400 }
      )
    }
    
    // Determine sender ID - support both ID and name
    let senderIdObj: any = null
    
    if (senderId) {
      // Try to find by ID
      const userSenderId = await UserSenderId.findOne({
        userId: userObjectId,
        senderId: senderId,
      }).populate('senderId')
      
      if (userSenderId) {
        senderIdObj = userSenderId.senderId
      }
    } else if (senderIdName) {
      // Try to find by name
      const senderIdDoc = await SenderId.findOne({ senderName: senderIdName })
      
      if (senderIdDoc) {
        const userSenderId = await UserSenderId.findOne({
          userId: userObjectId,
          senderId: senderIdDoc._id,
        }).populate('senderId')
        
        if (userSenderId) {
          senderIdObj = userSenderId.senderId
        }
      }
    } else {
      // Use default sender ID
      const defaultSenderId = await UserSenderId.findOne({
        userId: userObjectId,
        isDefault: true,
      }).populate('senderId')
      
      if (defaultSenderId) {
        senderIdObj = defaultSenderId.senderId
      }
    }
    
    if (!senderIdObj) {
      return NextResponse.json(
        { error: 'Sender ID not found or not authorized. Please specify a valid senderId or senderIdName' },
        { status: 403 }
      )
    }
    
    if (senderIdObj.status !== 'active') {
      return NextResponse.json(
        { error: `Sender ID is ${senderIdObj.status}. Only active sender IDs can be used.` },
        { status: 400 }
      )
    }
    
    // CREDIT-BASED PRICING
    const segments = calculateSegments153(message)
    const recipientsCount = 1
    const requiredCredits = segments * recipientsCount
    
    if (requiredCredits <= 0) {
      return NextResponse.json(
        { error: 'Message is empty; cannot send' },
        { status: 400 }
      )
    }
    
    // Check user credit balance
    const dbUser = await User.findById(userObjectId)
    if (!dbUser || (dbUser.creditsBalance || 0) < requiredCredits) {
      return NextResponse.json(
        { error: 'Insufficient SMS credits' },
        { status: 402 }
      )
    }
    
    // For transparency & logging
    const pricePerCreditKes = getEffectivePricePerCreditKes()
    const totalCostKes = requiredCredits * pricePerCreditKes
    
    // Format phone number
    const formattedPhone = formatPhoneNumber(to)
    
    // Validate phone number format
    let phoneValidationError: string | null = null
    let phoneErrorCode: string | null = null
    
    if (!formattedPhone.startsWith('+')) {
      phoneValidationError = 'Invalid phone number format. Must include country code (e.g., +254712345678)'
      phoneErrorCode = 'INVALID_PHONE_NUMBER'
    } else if (formattedPhone.startsWith('+254')) {
      const digitsAfter254 = formattedPhone.substring(4).replace(/\D/g, '')
      if (digitsAfter254.length !== 9) {
        phoneValidationError = `Invalid Kenya phone number. Should be +254 followed by 9 digits (e.g., +254712345678). Got: ${formattedPhone}`
        phoneErrorCode = 'INVALID_PHONE_NUMBER'
      } else if (!(digitsAfter254.startsWith('7') || digitsAfter254.startsWith('1'))) {
        phoneValidationError = `Invalid Kenya mobile number. Mobile numbers should start with 7 or 1 (e.g., +254712345678 or +254112345678). Got: ${formattedPhone}`
        phoneErrorCode = 'INVALID_PHONE_NUMBER'
      }
    } else if (formattedPhone.startsWith('+7')) {
      phoneValidationError = `Invalid phone number format. Did you mean Kenya (+254)? Current: ${formattedPhone}. Please use format: +254712345678`
      phoneErrorCode = 'INVALID_PHONE_NUMBER'
    }
    
    if (phoneValidationError) {
      return NextResponse.json(
        { 
          error: phoneValidationError,
          errorCode: phoneErrorCode,
        },
        { status: 400 }
      )
    }
    
    // Get HostPinnacle account
    const hpAccount = await HostPinnacleAccount.findOne({ userId: userObjectId })
    
    let apiKey: string | undefined
    let hpUserId: string
    let password: string | undefined
    
    if (hpAccount) {
      apiKey = hpAccount.hpApiKeyEncrypted
        ? decrypt(hpAccount.hpApiKeyEncrypted)
        : undefined
      password = hpAccount.hpPasswordEncrypted
        ? decrypt(hpAccount.hpPasswordEncrypted)
        : undefined
      hpUserId = hpAccount.hpUserLoginName
    } else {
      hpUserId = process.env.HOSTPINNACLE_USERID || ''
      password = process.env.HOSTPINNACLE_PASSWORD
      
      if (!hpUserId || !password) {
        return NextResponse.json(
          { error: 'HostPinnacle configuration not found. Please contact support.' },
          { status: 500 }
        )
      }
    }
    
    // Use MongoDB transaction for atomicity
    const session = await mongoose.startSession()
    session.startTransaction()
    
    try {
      // Deduct credits FIRST
      const updatedUser = await User.findOneAndUpdate(
        { _id: userObjectId },
        { $inc: { creditsBalance: -requiredCredits } },
        { new: true, session }
      )
      
      if (!updatedUser) {
        await session.abortTransaction()
        return NextResponse.json({ error: 'User not found' }, { status: 404 })
      }
      
      const newBalance = updatedUser.creditsBalance || 0
      
      // Create SMS log entry
      const [smsMessage] = await SmsMessage.create([{
        userId: userObjectId,
        senderName: senderIdObj.senderName,
        toNumbers: [formattedPhone],
        message,
        segments,
        costPerSegment: pricePerCreditKes,
        totalCost: totalCostKes,
        encoding: 'gsm7',
        parts: segments,
        chargedKes: totalCostKes,
        status: 'queued',
        nextCheckAt: initialNextCheckAt(),
        lastCheckedAt: null,
        statusCheckAttempts: 0,
        finalizedAt: null,
        creditDeducted: true,
        channel: 'sms',
      }], { session })
      
      await session.commitTransaction()
      
      // Return success immediately
      const response = NextResponse.json({
        success: true,
        messageId: smsMessage._id.toString(),
        segments,
        totalCredits: requiredCredits,
        totalCostKes,
        newBalance,
        status: 'queued',
        to: formattedPhone,
        senderId: senderIdObj.senderName,
      })
      
      // Send SMS asynchronously
      Promise.resolve().then(async () => {
        try {
          console.log('Sending SMS via HostPinnacle:', {
            mobile: maskPhone(formattedPhone),
            senderid: senderIdObj.senderName,
            messageLength: message.length,
          })
          
          const hpResult = await hostPinnacleClient.sendSms({
            mobile: formattedPhone.replace('+', ''),
            msg: message,
            senderid: senderIdObj.senderName,
            options: {
              apiKey,
              userId: hpUserId,
              password,
            },
          })
          
          if (!hpResult.success) {
            const errorMsg = hpResult.error || hpResult.message || 'HostPinnacle API returned failure'
            
            // Refund credits on failure
            await User.findByIdAndUpdate(userObjectId, {
              $inc: { creditsBalance: requiredCredits },
            })
            
            await SmsMessage.findByIdAndUpdate(smsMessage._id, {
              status: 'failed',
              errorCode: 'HP_API_ERROR',
              errorMessage: errorMsg,
              failedAt: new Date(),
              finalizedAt: new Date(),
              nextCheckAt: null,
              refunded: true,
            })
          } else {
            const transactionId = hpResult.data?.transactionId || hpResult.data?.transactionid || hpResult.data?.id
            
            await SmsMessage.findByIdAndUpdate(smsMessage._id, {
              hpTransactionId: transactionId,
              externalMsgId: transactionId,
              status: 'sent',
              providerStatus: 'SUBMITTED',
              sentAt: new Date(),
              nextCheckAt: initialNextCheckAt(),
            })
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error)
          
          // Refund credits on error
          await User.findByIdAndUpdate(userObjectId, {
            $inc: { creditsBalance: requiredCredits },
          })
          await SmsMessage.findByIdAndUpdate(smsMessage._id, {
            status: 'failed',
            errorCode: 'ASYNC_ERROR',
            errorMessage: errorMessage || 'Unknown error occurred while sending SMS',
            failedAt: new Date(),
            finalizedAt: new Date(),
            nextCheckAt: null,
            refunded: true,
          })
        }
      })
      
      return response
    } catch (error) {
      await session.abortTransaction()
      throw error
    } finally {
      session.endSession()
    }
  } catch (error: any) {
    console.error('Send SMS error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}


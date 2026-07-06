/**
 * Send SMS API
 * POST /api/sms/send
 */

import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db/connect'
import { User, SenderId, UserSenderId, SmsMessage } from '@/lib/db/models'
import { resolveHostPinnacleCredentials } from '@/lib/services/hostpinnacle/credentials'
import { hostPinnacleClient } from '@/lib/services/hostpinnacle/client'
import { requireAuth } from '@/lib/auth/middleware'
import { calculateSegments153, getEffectivePricePerCreditKes } from '@/lib/utils/credits'
import { initialNextCheckAt } from '@/lib/services/sms-status/build-synchronizer'
import { maskPhone } from '@/lib/utils/log-sanitize'

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

export async function POST(request: NextRequest) {
  try {
    await connectDB()
    const user = requireAuth(request)

    const { recipient, message, senderIdId } = await request.json()

    // Validate inputs
    if (!recipient || !message || !senderIdId) {
      return NextResponse.json(
        { error: 'recipient, message, and senderIdId are required' },
        { status: 400 }
      )
    }

    // Convert userId to ObjectId
    const mongoose = require('mongoose')
    const userObjectId = new mongoose.Types.ObjectId(user.userId)

    // Validate sender ID belongs to user
    const userSenderId = await UserSenderId.findOne({
      userId: userObjectId,
      senderId: senderIdId,
    }).populate('senderId')

    if (!userSenderId) {
      return NextResponse.json(
        { error: 'Sender ID not found or not authorized' },
        { status: 403 }
      )
    }

    const senderId = userSenderId.senderId as any
    if (senderId.status !== 'active') {
      return NextResponse.json(
        { error: `Sender ID is ${senderId.status}. Only active sender IDs can be used.` },
        { status: 400 }
      )
    }

    // CREDIT-BASED PRICING
    // 1 credit = 1 SMS segment of up to 153 characters, per recipient
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
      return NextResponse.json({ error: 'Insufficient SMS credits' }, { status: 402 })
    }

    // For transparency & logging, also compute money-equivalent cost in KSh
    const pricePerCreditKes = getEffectivePricePerCreditKes()
    const totalCostKes = requiredCredits * pricePerCreditKes

    // Format phone number
    const formattedPhone = formatPhoneNumber(recipient)
    
    // Validate phone number format (should be E.164 with country code)
    let phoneValidationError: string | null = null
    let phoneErrorCode: string | null = null
    
    if (!formattedPhone.startsWith('+')) {
      phoneValidationError = 'Invalid phone number format. Must include country code (e.g., +254712345678)'
      phoneErrorCode = 'INVALID_PHONE_NUMBER'
    } else if (formattedPhone.startsWith('+254')) {
      // Validate Kenya phone numbers specifically (most common use case)
      const digitsAfter254 = formattedPhone.substring(4).replace(/\D/g, '')
      if (digitsAfter254.length !== 9) {
        phoneValidationError = `Invalid Kenya phone number. Should be +254 followed by 9 digits (e.g., +254712345678). Got: ${formattedPhone}`
        phoneErrorCode = 'INVALID_PHONE_NUMBER'
      } else if (!(digitsAfter254.startsWith('7') || digitsAfter254.startsWith('1'))) {
        // Allow both 07xx... and 01xx... Kenya mobile ranges
        phoneValidationError = `Invalid Kenya mobile number. Mobile numbers should start with 07 or 01 (e.g., +254712345678 or +254112345678). Got: ${formattedPhone}`
        phoneErrorCode = 'INVALID_PHONE_NUMBER'
      }
    } else if (formattedPhone.startsWith('+7')) {
      // Common mistake: +7 is Russia, but user probably meant Kenya +254
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
    
    // Log phone number formatting for debugging (masked - phone numbers are PII)
    console.log('Phone number formatted:', maskPhone(formattedPhone))

    // HostPinnacle credentials: user sub-account → SystemSettings → env vars
    const hpCreds = await resolveHostPinnacleCredentials(userObjectId)
    if (!hpCreds) {
      return NextResponse.json(
        {
          error:
            'HostPinnacle is not configured. Set credentials in Super Admin → Settings or add HOSTPINNACLE_USERID and HOSTPINNACLE_PASSWORD on the server.',
        },
        { status: 500 }
      )
    }

    const { userId: hpUserId, password, apiKey } = hpCreds

    // Use MongoDB transaction for atomicity
    const session = await mongoose.startSession()
    session.startTransaction()

    try {
      // Deduct credits FIRST (immediate) - using findOneAndUpdate for atomic operation
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

      // Create SMS log entry (parallel with credit deduction)
      const [smsMessage] = await SmsMessage.create([{
        userId: userObjectId,
        senderName: senderId.senderName,
        toNumbers: [formattedPhone],
        message,
        segments, // Total segments for this message
        costPerSegment: pricePerCreditKes,
        totalCost: totalCostKes,
        encoding: 'gsm7',
        parts: segments,
        chargedKes: totalCostKes,
        status: 'queued',
        providerStatus: 'PROCESSING',
        // Delivery-status worker scheduling: even if the async send below dies,
        // the background worker will pick this message up at nextCheckAt.
        nextCheckAt: initialNextCheckAt(),
        lastCheckedAt: null,
        statusCheckAttempts: 0,
        finalizedAt: null,
        creditDeducted: true, // Credits are deducted in this transaction
        channel: 'sms',
        email: dbUser.email,
      }], { session })

      await session.commitTransaction()

      // Return success immediately with new balance (non-blocking) - SUPER FAST RESPONSE
      const response = NextResponse.json({
        success: true,
        messageId: smsMessage._id,
        segments,
        totalCredits: requiredCredits,
        totalCostKes,
        newBalance, // Return new balance immediately for real-time update
        status: 'queued', // Will be updated async
      })

      // Send SMS asynchronously (fire and forget) - don't block response
      // This makes the API response instant!
      // Use Promise.resolve().then() for cross-platform compatibility
      Promise.resolve().then(async () => {
        try {
          // Log the request details for debugging (phone masked - PII)
          console.log('Sending SMS via HostPinnacle:', {
            mobile: maskPhone(formattedPhone),
            senderid: senderId.senderName,
            messageLength: message.length,
            hasApiKey: !!apiKey,
            hasUserId: !!hpUserId,
            hasPassword: !!password,
          })

          const hpResult = await hostPinnacleClient.sendSms({
            mobile: formattedPhone.replace('+', ''), // HostPinnacle may need without +
            msg: message,
            senderid: senderId.senderName,
            options: {
              apiKey,
              userId: hpUserId,
              password,
            },
          })

          // Concise, PII-free response log
          console.log('HostPinnacle SMS send result:', {
            messageId: smsMessage._id?.toString(),
            recipient: maskPhone(formattedPhone),
            senderId: senderId.senderName,
            success: hpResult.success,
            error: hpResult.error || undefined,
          })

          // Note: "success" means HostPinnacle accepted the message. Actual delivery to the
          // handset is confirmed later via the DLR webhook (/api/sms/dlr). If messages
          // do not reach recipients, check: sender ID approval on carrier, HostPinnacle
          // account is live (not test), and DLR webhook for failure status.
          if (hpResult.success && hpResult.data?.reason && hpResult.data.reason !== 'success') {
            console.warn('HostPinnacle returned success but reason may indicate issue:', hpResult.data.reason)
          }

          if (!hpResult.success) {
            const errorMsg = hpResult.error || hpResult.message || 'HostPinnacle API returned failure'
            console.error('SMS send failed:', {
              smsMessageId: smsMessage._id,
              recipient: maskPhone(formattedPhone),
              senderId: senderId.senderName,
              error: errorMsg,
            })

            // Refund credits on failure
            await User.findByIdAndUpdate(userObjectId, {
              $inc: { creditsBalance: requiredCredits },
            })

            // Provider rejected the send outright: final failure, no further status checks
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
            // Update SMS message with transaction ID
            const transactionId = hpResult.data?.transactionId || hpResult.data?.transactionid || hpResult.data?.id

            console.log('SMS sent successfully:', {
              smsMessageId: smsMessage._id,
              transactionId,
              recipient: maskPhone(formattedPhone),
            })

            // The background worker takes over from here: it will check
            // delivery status at nextCheckAt using the shared retry schedule.
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
          const errorStack = error instanceof Error ? error.stack : undefined

          console.error('Async SMS send error:', {
            smsMessageId: smsMessage._id,
            recipient: maskPhone(formattedPhone),
            error: errorMessage,
            stack: errorStack,
          })

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
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Send SMS error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}


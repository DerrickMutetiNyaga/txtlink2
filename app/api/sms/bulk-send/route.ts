/**
 * Bulk SMS Send API
 * POST /api/sms/bulk-send
 * 
 * Efficiently sends SMS to multiple recipients using a queue system
 */

import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db/connect'
import { SmsMessage, User, UserSenderId } from '@/lib/db/models'
import { requireAuth } from '@/lib/auth/middleware'
import { calculateSegments153, getEffectivePricePerCreditKes } from '@/lib/utils/credits'
import { advancedSmsQueue } from '@/lib/services/sms/advanced-queue'
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

export async function POST(request: NextRequest) {
  try {
    await connectDB()
    const user = requireAuth(request)
    const userObjectId = new mongoose.Types.ObjectId(user.userId)

    const { recipients, message, senderIdId } = await request.json()

    // Validate inputs
    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return NextResponse.json(
        { error: 'recipients must be a non-empty array' },
        { status: 400 }
      )
    }

    if (!message || !senderIdId) {
      return NextResponse.json(
        { error: 'message and senderIdId are required' },
        { status: 400 }
      )
    }

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

    // Calculate segments and credits
    const segments = calculateSegments153(message)
    const recipientsCount = recipients.length
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

    // Calculate costs
    const pricePerCreditKes = getEffectivePricePerCreditKes()
    const totalCostKes = requiredCredits * pricePerCreditKes

    // Format phone numbers
    const formattedPhones = recipients.map(formatPhoneNumber)

    // Deduct credits and create message records in a transaction
    const session = await mongoose.startSession()
    session.startTransaction()

    try {
      // Deduct credits
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

      // Create SMS message records (one per recipient for tracking)
      const smsMessages = await SmsMessage.create(
        formattedPhones.map((phone) => ({
          userId: userObjectId,
          senderName: senderId.senderName,
          toNumbers: [phone],
          message,
          segments,
          costPerSegment: pricePerCreditKes,
          totalCost: pricePerCreditKes * segments,
          encoding: 'gsm7',
          parts: segments,
          chargedKes: pricePerCreditKes * segments,
          status: 'queued',
          providerStatus: 'PROCESSING',
          statusCheckAttempts: 0,
          creditDeducted: true,
          channel: 'sms',
          email: dbUser.email,
        })),
        { session, ordered: true }
      )

      await session.commitTransaction()

      // Return success immediately (non-blocking)
      const response = NextResponse.json({
        success: true,
        messageIds: smsMessages.map(m => m._id.toString()),
        totalMessages: smsMessages.length,
        segments,
        totalCredits: requiredCredits,
        totalCostKes,
        newBalance,
        status: 'queued',
      })

      // Enqueue for background processing (fire and forget - non-blocking)
      Promise.resolve().then(async () => {
        try {
          // Create queue items
          const queueItems = smsMessages.map((smsMsg, index) => ({
            messageId: smsMsg._id!.toString(),
            phoneNumber: formattedPhones[index],
            message,
            senderId: senderId.senderName,
            userId: userObjectId,
            segments,
            priority: 0,
            retryCount: 0,
          }))

          // Enqueue for background processing (returns immediately)
          const result = await advancedSmsQueue.enqueueBulk(queueItems)
          console.log(`Bulk send queued: ${result.queued} messages for user ${userObjectId}`)
          
          if (result.errors.length > 0) {
            console.error(`Bulk send errors: ${result.errors.length}`, result.errors)
          }
        } catch (error) {
          console.error('Error enqueueing bulk SMS:', error)
        }
      })

      return response
    } catch (error: any) {
      await session.abortTransaction()
      throw error
    } finally {
      await session.endSession()
    }
  } catch (error: any) {
    console.error('Bulk SMS send error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to send bulk SMS' },
      { status: 500 }
    )
  }
}


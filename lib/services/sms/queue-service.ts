/**
 * SMS Queue Service
 * 
 * Efficiently manages bulk SMS sending with:
 * - Concurrency control (max concurrent sends)
 * - Rate limiting
 * - Automatic retry on failure
 * - Progress tracking
 */

import { SmsMessage } from '@/lib/db/models'
import { hostPinnacleClient } from '@/lib/services/hostpinnacle/client'
import { initialNextCheckAt } from '@/lib/services/sms-status/build-synchronizer'
import mongoose from 'mongoose'

interface QueueItem {
  messageId: string
  phoneNumber: string
  message: string
  senderId: string
  userId: mongoose.Types.ObjectId
  segments: number
  priority?: number
}

interface QueueConfig {
  maxConcurrent: number // Max concurrent sends
  batchSize: number // Messages per API call
  delayBetweenBatches: number // ms delay between batches
  retryAttempts: number
  retryDelay: number // ms
}

const DEFAULT_CONFIG: QueueConfig = {
  maxConcurrent: 5, // Process 5 messages concurrently
  batchSize: 10, // Send 10 messages per API call to HostPinnacle
  delayBetweenBatches: 100, // 100ms delay between batches
  retryAttempts: 2,
  retryDelay: 2000, // 2 seconds
}

class SMSQueue {
  private config: QueueConfig
  private activeWorkers: number = 0
  private processing: Set<string> = new Set()
  private isRunning: boolean = false

  constructor(config?: Partial<QueueConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  /**
   * Add messages to queue and process them
   */
  async enqueueBulk(
    items: QueueItem[],
    onProgress?: (completed: number, total: number, failed: number) => void
  ): Promise<{ success: number; failed: number; errors: Array<{ item: QueueItem; error: string }> }> {
    const results = {
      success: 0,
      failed: 0,
      errors: [] as Array<{ item: QueueItem; error: string }>,
    }

    // Sort by priority (higher first)
    const sortedItems = [...items].sort((a, b) => (b.priority || 0) - (a.priority || 0))

    // Process in batches
    for (let i = 0; i < sortedItems.length; i += this.config.batchSize) {
      const batch = sortedItems.slice(i, i + this.config.batchSize)
      
      // Wait if we've hit max concurrent
      while (this.activeWorkers >= this.config.maxConcurrent) {
        await new Promise(resolve => setTimeout(resolve, 50))
      }

      // Process batch concurrently
      const batchPromises = batch.map(item => this.processItem(item))
      const batchResults = await Promise.allSettled(batchPromises)

      // Count results
      batchResults.forEach((result, idx) => {
        if (result.status === 'fulfilled' && result.value.success) {
          results.success++
        } else {
          results.failed++
          const error = result.status === 'rejected' 
            ? result.reason?.message || 'Unknown error'
            : result.value.error || 'Failed to send'
          results.errors.push({ item: batch[idx], error })
        }
      })

      // Report progress
      if (onProgress) {
        onProgress(results.success + results.failed, items.length, results.failed)
      }

      // Delay between batches (except for last batch)
      if (i + this.config.batchSize < sortedItems.length) {
        await new Promise(resolve => setTimeout(resolve, this.config.delayBetweenBatches))
      }
    }

    return results
  }

  /**
   * Process a single queue item
   */
  private async processItem(item: QueueItem): Promise<{ success: boolean; error?: string }> {
    if (this.processing.has(item.messageId)) {
      return { success: false, error: 'Already processing' }
    }

    this.processing.add(item.messageId)
    this.activeWorkers++

    try {
      // Format phone number (remove + for HostPinnacle)
      const phoneNo = item.phoneNumber.replace(/^\+/, '')

      // Send SMS via HostPinnacle
      const sendResult = await hostPinnacleClient.sendSms({
        mobile: phoneNo,
        msg: item.message,
        senderid: item.senderId,
        retries: this.config.retryAttempts,
      })

      if (!sendResult.success) {
        // Update message status to failed (final)
        await SmsMessage.findByIdAndUpdate(item.messageId, {
          status: 'failed',
          errorMessage: sendResult.error || sendResult.message || 'Send failed',
          failedAt: new Date(),
          finalizedAt: new Date(),
          nextCheckAt: null,
        })

        return { success: false, error: sendResult.error || sendResult.message || 'Send failed' }
      }

      // Extract transaction ID from response
      const transactionId = sendResult.data?.transactionId || 
                           sendResult.data?.response?.transactionId ||
                           sendResult.data?.uuid ||
                           sendResult.data?.msgid

      // Update message with transaction ID and mark as sent.
      // The background status worker picks it up at nextCheckAt.
      await SmsMessage.findByIdAndUpdate(item.messageId, {
        status: 'sent',
        hpTransactionId: transactionId,
        externalMsgId: transactionId,
        sentAt: new Date(),
        providerStatus: 'SUBMITTED',
        nextCheckAt: initialNextCheckAt(),
      })

      return { success: true }
    } catch (error: any) {
      // Update message status to failed
      await SmsMessage.findByIdAndUpdate(item.messageId, {
        status: 'failed',
        errorMessage: error.message || 'Unknown error',
        failedAt: new Date(),
        finalizedAt: new Date(),
        nextCheckAt: null,
      })

      return { success: false, error: error.message || 'Unknown error' }
    } finally {
      this.processing.delete(item.messageId)
      this.activeWorkers--
    }
  }

  /**
   * Get queue status
   */
  getStatus() {
    return {
      activeWorkers: this.activeWorkers,
      processing: this.processing.size,
      isRunning: this.isRunning,
    }
  }
}

// Singleton instance
export const smsQueue = new SMSQueue()

/**
 * Helper function to create queue items from recipients
 */
export function createQueueItems(
  recipients: string[],
  message: string,
  senderId: string,
  userId: mongoose.Types.ObjectId,
  segments: number
): QueueItem[] {
  return recipients.map((phoneNumber, index) => ({
    messageId: '', // Will be set when message is created
    phoneNumber,
    message,
    senderId,
    userId,
    segments,
    priority: 0, // Can be adjusted based on business logic
  }))
}


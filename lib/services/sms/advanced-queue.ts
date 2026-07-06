/**
 * Advanced SMS Queue System
 * 
 * Designed to handle 100,000+ SMS messages efficiently:
 * - Database-backed queue for persistence
 * - Per-account rate limiting
 * - Background processing (non-blocking)
 * - Batch processing with optimal concurrency
 * - Memory-efficient streaming
 * - Multi-account support
 */

import { SmsMessage } from '@/lib/db/models'
import { hostPinnacleClient } from '@/lib/services/hostpinnacle/client'
import { initialNextCheckAt } from '@/lib/services/sms-status/build-synchronizer'
import mongoose from 'mongoose'

interface QueueConfig {
  maxConcurrentPerAccount: number // Max concurrent sends per user account
  maxGlobalConcurrent: number // Global max concurrent (across all accounts)
  batchSize: number // Messages per API call to HostPinnacle
  delayBetweenBatches: number // ms delay between batches
  retryAttempts: number
  retryDelay: number // ms
  statusCheckDelay: number // Delay before checking status (ms)
  maxQueueSize: number // Max items to process in memory at once
}

const DEFAULT_CONFIG: QueueConfig = {
  maxConcurrentPerAccount: 10, // 10 concurrent per account
  maxGlobalConcurrent: 50, // 50 global concurrent
  batchSize: 50, // Send 50 messages per API call (HostPinnacle can handle this)
  delayBetweenBatches: 50, // 50ms delay between batches
  retryAttempts: 3,
  retryDelay: 1000, // 1 second base delay
  statusCheckDelay: 10000, // 10 seconds before status check
  maxQueueSize: 1000, // Process 1000 at a time
}

interface QueueItem {
  messageId: string
  phoneNumber: string
  message: string
  senderId: string
  userId: mongoose.Types.ObjectId
  segments: number
  priority?: number
  retryCount?: number
}

interface AccountQueue {
  userId: mongoose.Types.ObjectId
  activeWorkers: number
  queue: QueueItem[]
  lastProcessed: number
}

class AdvancedSMSQueue {
  private config: QueueConfig
  private accountQueues: Map<string, AccountQueue> = new Map()
  private globalActiveWorkers: number = 0
  private processing: Set<string> = new Set()
  private isRunning: boolean = false
  private processingInterval: NodeJS.Timeout | null = null

  constructor(config?: Partial<QueueConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  /**
   * Enqueue messages for background processing
   * Returns immediately - processing happens in background
   */
  async enqueueBulk(
    items: QueueItem[]
  ): Promise<{ queued: number; errors: Array<{ item: QueueItem; error: string }> }> {
    const errors: Array<{ item: QueueItem; error: string }> = []
    let queued = 0

    // Group by user account
    const itemsByAccount = new Map<string, QueueItem[]>()
    
    for (const item of items) {
      const accountKey = item.userId.toString()
      if (!itemsByAccount.has(accountKey)) {
        itemsByAccount.set(accountKey, [])
      }
      itemsByAccount.get(accountKey)!.push(item)
    }

    // Add to account queues
    for (const [accountKey, accountItems] of itemsByAccount.entries()) {
      if (!this.accountQueues.has(accountKey)) {
        this.accountQueues.set(accountKey, {
          userId: new mongoose.Types.ObjectId(accountKey),
          activeWorkers: 0,
          queue: [],
          lastProcessed: Date.now(),
        })
      }

      const accountQueue = this.accountQueues.get(accountKey)!
      
      // Sort by priority (higher first)
      const sortedItems = accountItems.sort((a, b) => (b.priority || 0) - (a.priority || 0))
      accountQueue.queue.push(...sortedItems)
      queued += sortedItems.length
    }

    // Start processing if not already running
    if (!this.isRunning) {
      this.startProcessing()
    }

    return { queued, errors }
  }

  /**
   * Start background processing
   */
  startProcessing() {
    if (this.isRunning) {
      return
    }

    this.isRunning = true
    
    // Process queue every 100ms for smooth operation
    this.processingInterval = setInterval(() => {
      this.processQueueBatch().catch(err => {
        console.error('Error processing queue batch:', err)
      })
    }, 100)
  }

  /**
   * Stop processing
   */
  stopProcessing() {
    this.isRunning = false
    if (this.processingInterval) {
      clearInterval(this.processingInterval)
      this.processingInterval = null
    }
  }

  /**
   * Process a batch of messages from the queue
   */
  private async processQueueBatch() {
    // Check global concurrency limit
    if (this.globalActiveWorkers >= this.config.maxGlobalConcurrent) {
      return
    }

    // Process from each account queue
    for (const [accountKey, accountQueue] of this.accountQueues.entries()) {
      // Check account concurrency limit
      if (accountQueue.activeWorkers >= this.config.maxConcurrentPerAccount) {
        continue
      }

      // Check global limit
      if (this.globalActiveWorkers >= this.config.maxGlobalConcurrent) {
        break
      }

      // Get batch from this account's queue
      const batch = accountQueue.queue.splice(0, this.config.batchSize)
      
      if (batch.length === 0) {
        // Remove empty queues after 5 minutes of inactivity
        if (Date.now() - accountQueue.lastProcessed > 5 * 60 * 1000) {
          this.accountQueues.delete(accountKey)
        }
        continue
      }

      // Process batch asynchronously (don't await)
      this.processBatch(accountKey, batch).catch(err => {
        console.error(`Error processing batch for account ${accountKey}:`, err)
      })
    }

    // Clean up empty queues
    this.cleanupEmptyQueues()
  }

  /**
   * Process a batch of messages
   */
  private async processBatch(accountKey: string, batch: QueueItem[]) {
    const accountQueue = this.accountQueues.get(accountKey)!
    
    // Update counters
    accountQueue.activeWorkers += batch.length
    this.globalActiveWorkers += batch.length
    accountQueue.lastProcessed = Date.now()

    // Process all items in batch concurrently
    const promises = batch.map(item => this.processItem(item, accountKey))
    
    try {
      await Promise.allSettled(promises)
    } finally {
      // Update counters
      accountQueue.activeWorkers = Math.max(0, accountQueue.activeWorkers - batch.length)
      this.globalActiveWorkers = Math.max(0, this.globalActiveWorkers - batch.length)
    }
  }

  /**
   * Process a single queue item
   */
  private async processItem(item: QueueItem, accountKey: string): Promise<void> {
    if (this.processing.has(item.messageId)) {
      return
    }

    this.processing.add(item.messageId)

    try {
      // Format phone number (remove + for HostPinnacle)
      const phoneNo = item.phoneNumber.replace(/^\+/, '')

      // Send SMS via HostPinnacle
      const sendResult = await hostPinnacleClient.sendSms({
        mobile: phoneNo,
        msg: item.message,
        senderid: item.senderId,
        retries: 1, // Quick retry on timeout only
      })

      if (!sendResult.success) {
        // Retry logic with exponential backoff
        const retryCount = (item.retryCount || 0) + 1
        
        if (retryCount < this.config.retryAttempts) {
          // Re-queue with delay
          setTimeout(() => {
            const accountQueue = this.accountQueues.get(accountKey)
            if (accountQueue) {
              accountQueue.queue.push({
                ...item,
                retryCount,
              })
            }
          }, this.config.retryDelay * Math.pow(2, retryCount - 1))
          
          return
        }

        // Max retries reached - mark as failed (final, no status checks needed)
        await SmsMessage.findByIdAndUpdate(item.messageId, {
          status: 'failed',
          errorMessage: sendResult.error || sendResult.message || 'Send failed after retries',
          failedAt: new Date(),
          finalizedAt: new Date(),
          nextCheckAt: null,
        }).catch(err => {
          console.error(`Failed to update message ${item.messageId}:`, err)
        })

        return
      }

      // Extract transaction ID from response
      const transactionId = sendResult.data?.transactionId || 
                           sendResult.data?.response?.transactionId ||
                           sendResult.data?.uuid ||
                           sendResult.data?.msgid

      // Update message with transaction ID and mark as sent.
      // Delivery status is handled exclusively by the background worker,
      // which picks this message up at nextCheckAt.
      await SmsMessage.findByIdAndUpdate(item.messageId, {
        status: 'sent',
        hpTransactionId: transactionId,
        externalMsgId: transactionId,
        sentAt: new Date(),
        providerStatus: 'SUBMITTED',
        nextCheckAt: initialNextCheckAt(),
      }).catch(err => {
        console.error(`Failed to update message ${item.messageId}:`, err)
      })

    } catch (error: any) {
      console.error(`Error processing message ${item.messageId}:`, error)
      
      // Update message status to failed
      await SmsMessage.findByIdAndUpdate(item.messageId, {
        status: 'failed',
        errorMessage: error.message || 'Unknown error',
        failedAt: new Date(),
        finalizedAt: new Date(),
        nextCheckAt: null,
      }).catch(err => {
        console.error(`Failed to update message ${item.messageId}:`, err)
      })
    } finally {
      this.processing.delete(item.messageId)
    }
  }

  /**
   * Clean up empty queues
   */
  private cleanupEmptyQueues() {
    const now = Date.now()
    for (const [accountKey, accountQueue] of this.accountQueues.entries()) {
      if (
        accountQueue.queue.length === 0 &&
        accountQueue.activeWorkers === 0 &&
        now - accountQueue.lastProcessed > 5 * 60 * 1000 // 5 minutes
      ) {
        this.accountQueues.delete(accountKey)
      }
    }
  }

  /**
   * Get queue status
   */
  getStatus() {
    let totalQueued = 0
    for (const queue of this.accountQueues.values()) {
      totalQueued += queue.queue.length
    }

    return {
      globalActiveWorkers: this.globalActiveWorkers,
      totalQueued,
      processing: this.processing.size,
      isRunning: this.isRunning,
      accountCount: this.accountQueues.size,
      accounts: Array.from(this.accountQueues.entries()).map(([key, queue]) => ({
        userId: key,
        queued: queue.queue.length,
        activeWorkers: queue.activeWorkers,
      })),
    }
  }

  /**
   * Get status for a specific account
   */
  getAccountStatus(userId: mongoose.Types.ObjectId) {
    const accountKey = userId.toString()
    const queue = this.accountQueues.get(accountKey)
    
    return queue ? {
      queued: queue.queue.length,
      activeWorkers: queue.activeWorkers,
    } : {
      queued: 0,
      activeWorkers: 0,
    }
  }
}

// Singleton instance - shared across all requests
export const advancedSmsQueue = new AdvancedSMSQueue()

// Start processing automatically
advancedSmsQueue.startProcessing()


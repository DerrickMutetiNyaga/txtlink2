/**
 * Real-time Status Checker
 * 
 * Checks one message at a time until completion (delivered or failed)
 * Stops checking once status is final
 */

import { SmsMessage } from '@/lib/db/models'
import { checkSmsStatusForMessage } from './status-job'

interface StatusCheckResult {
  messageId: string
  status: 'queued' | 'sent' | 'delivered' | 'failed' | 'processing'
  completed: boolean
  error?: string
}

/**
 * Check status of a single message until completion
 * Returns immediately if message is already delivered/failed
 */
export async function checkMessageUntilComplete(
  messageId: string,
  maxAttempts: number = 10,
  intervalSeconds: number = 10
): Promise<StatusCheckResult> {
  const message = await SmsMessage.findById(messageId)
  
  if (!message) {
    return {
      messageId,
      status: 'failed',
      completed: true,
      error: 'Message not found',
    }
  }

  // If already completed, return immediately
  if (message.status === 'delivered' || message.status === 'failed') {
    return {
      messageId,
      status: message.status,
      completed: true,
    }
  }

  // Check status immediately
  await checkSmsStatusForMessage(messageId, 0)
  
  // Refresh message from DB
  const updatedMessage = await SmsMessage.findById(messageId)
  
  if (!updatedMessage) {
    return {
      messageId,
      status: 'failed',
      completed: true,
      error: 'Message not found after check',
    }
  }

  // If completed after first check, return
  if (updatedMessage.status === 'delivered' || updatedMessage.status === 'failed') {
    return {
      messageId,
      status: updatedMessage.status,
      completed: true,
    }
  }

  // Continue checking at intervals until completion or max attempts
  let attempts = 1
  while (attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, intervalSeconds * 1000))
    
    await checkSmsStatusForMessage(messageId, 0)
    
    const currentMessage = await SmsMessage.findById(messageId)
    
    if (!currentMessage) {
      return {
        messageId,
        status: 'failed',
        completed: true,
        error: 'Message not found during check',
      }
    }

    // If completed, return
    if (currentMessage.status === 'delivered' || currentMessage.status === 'failed') {
      return {
        messageId,
        status: currentMessage.status,
        completed: true,
      }
    }

    attempts++
  }

  // Max attempts reached, return current status
  const finalMessage = await SmsMessage.findById(messageId)
  return {
    messageId,
    status: finalMessage?.status || 'processing',
    completed: false,
    error: 'Max attempts reached',
  }
}

/**
 * Check status of multiple messages (one at a time)
 * Returns status for each message
 */
export async function checkMessagesStatus(
  messageIds: string[]
): Promise<StatusCheckResult[]> {
  const results: StatusCheckResult[] = []
  
  for (const messageId of messageIds) {
    const result = await checkMessageUntilComplete(messageId)
    results.push(result)
  }
  
  return results
}


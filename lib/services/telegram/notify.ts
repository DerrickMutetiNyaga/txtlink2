/**
 * Telegram Notification Service
 * Sends formatted messages to admin via Telegram bot
 */

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID

interface TelegramNotificationOptions {
  message: string
  parseMode?: 'HTML' | 'Markdown' | 'MarkdownV2'
}

/**
 * Send a notification to Telegram
 */
export async function sendTelegramNotification(
  options: TelegramNotificationOptions
): Promise<{ success: boolean; error?: string }> {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    console.warn('Telegram bot token or chat ID not configured. Skipping notification.')
    return { success: false, error: 'Telegram not configured' }
  }

  try {
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: options.message,
        parse_mode: options.parseMode || 'HTML',
      }),
    })

    const data = await response.json()

    if (!response.ok || !data.ok) {
      console.error('Telegram notification failed:', data)
      return { success: false, error: data.description || 'Telegram API error' }
    }

    return { success: true }
  } catch (error: any) {
    console.error('Error sending Telegram notification:', error)
    return { success: false, error: error.message || 'Network error' }
  }
}

/**
 * Format SMS status notification message (matching PHP format)
 */
export function formatSmsStatusNotification(params: {
  messageId: string
  reportStatus: string
  phoneNumber: string
  senderId: string
  email: string
  channel: string
  message: string
  fullResponse: any
}): string {
  const lines: string[] = []
  lines.push('─'.repeat(40))
  lines.push('       HOSTPINNACLE SMS STATUS')
  lines.push('─'.repeat(40))
  lines.push(`Message ID       : ${params.messageId}`)
  lines.push(`Report Status    : ${params.reportStatus}`)
  lines.push('─'.repeat(40))
  lines.push(`Request          : ${params.message}`)
  lines.push(`Phone Number     : ${params.phoneNumber}`)
  lines.push(`Sender ID        : ${params.senderId}`)
  lines.push(`Email            : ${params.email}`)
  lines.push(`Channel          : ${params.channel}`)
  lines.push('─'.repeat(40))
  lines.push('Response         :')
  lines.push(JSON.stringify(params.fullResponse, null, 2))
  lines.push('─'.repeat(40))
  
  return lines.join('\n')
}


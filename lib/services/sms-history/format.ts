import { ISmsMessage } from '@/lib/db/models'
import { deriveCampaignLabel } from './constants'
import {
  getDisplayMessageText,
  REDACTED_MESSAGE_LABEL,
  getSourceDisplayLabel,
  getAuthMethodDisplayLabel,
} from '@/lib/services/sms/message-body'

function normalizeFailureReason(baseReason?: string | null): string | undefined {
  if (!baseReason) return undefined
  if (baseReason !== 'Unknown error') return baseReason
  return 'The SMS gateway returned an unknown error. Common causes are: invalid phone number format, inactive sender ID, or gateway credentials/credits issues.'
}

export function getDisplayStatus(msg: ISmsMessage): string {
  if (
    msg.deliveryMethod === 'android_phone_gateway' ||
    msg.fallbackStatus === 'delivered_via_phone' ||
    msg.fallbackStatus === 'sent_via_phone'
  ) {
    return 'Delivered via Phone'
  }
  if (msg.fallbackStatus === 'queued_for_phone') return 'Queued for Phone'
  if (msg.fallbackStatus === 'retrying_provider') return 'Retrying Provider'
  if (msg.fallbackStatus === 'retry_waiting_delivery') return 'Retry Waiting Delivery'
  if (msg.fallbackStatus === 'phone_requires_topup') return 'Phone Needs Reload'
  if (msg.fallbackStatus === 'phone_failed') return 'Phone Failed'
  if (msg.status === 'delivered') return 'Delivered'
  if (msg.status === 'failed') return 'Failed'
  if (msg.status === 'sent') return 'Sent'
  if (msg.status === 'queued' || msg.status === 'processing' || msg.status === 'retrying') {
    return 'Pending'
  }
  return msg.status.charAt(0).toUpperCase() + msg.status.slice(1)
}

export function getFailureReason(msg: ISmsMessage): string | undefined {
  const isInvalidPhone =
    msg.status === 'failed' &&
    (msg.errorCode === 'INVALID_PHONE_NUMBER' ||
      (msg.errorMessage &&
        (msg.errorMessage.toLowerCase().includes('invalid phone') ||
          msg.errorMessage.toLowerCase().includes('invalid number') ||
          msg.errorMessage.toLowerCase().includes('phone number format'))))

  if (msg.status !== 'failed' && msg.fallbackStatus !== 'phone_failed') return undefined
  if (isInvalidPhone) return 'Invalid number'
  return normalizeFailureReason(msg.deliveryCause || msg.errorMessage || msg.errorCode || msg.fallbackFailureReason)
}

export function formatTimeAgo(date: Date): string {
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)
  if (diffInSeconds < 60) return 'Just now'
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
  return `${Math.floor(diffInSeconds / 86400)}d ago`
}

export interface FormattedSmsHistoryRow {
  id: string
  time: string
  createdAt: string
  recipient: string
  senderId: string
  campaign: string
  message: string
  status: string
  displayStatus: string
  deliveryMethod: string
  fallbackStatus: string | null
  fallbackJobId: string | null
  fallbackFailureReason: string | null
  fallbackProvider: string | null
  requiresPhoneTopUp: boolean
  providerRetryAttempted: boolean
  providerRetryStatus: string | null
  failureReason?: string
  messageId: string
  providerMessageId: string | null
  providerStatus: string | null
  sentAt: string | null
  deliveredAt: string | null
  cost: number
  retryCount: number
  lastAttemptAt: string | null
  source: string | null
  sourceLabel: string
  authMethod: string | null
  authMethodLabel: string
  apiKeyName: string | null
  clientUsername: string | null
  clientName: string | null
  toNumbers: string[]
  segments: number
  messageRedacted?: boolean
  campaignName?: string | null
}

export function formatSmsHistoryRow(msg: ISmsMessage & { _id?: unknown }): FormattedSmsHistoryRow {
  const createdAt = new Date(msg.createdAt)
  const displayMessage = getDisplayMessageText(msg)
  return {
    id: String(msg._id),
    time: formatTimeAgo(createdAt),
    createdAt: createdAt.toISOString(),
    recipient: msg.toNumbers.join(', '),
    senderId: msg.senderName,
    campaign: msg.campaignName || deriveCampaignLabel(msg.source),
    message: displayMessage,
    status: msg.status,
    displayStatus: getDisplayStatus(msg),
    deliveryMethod: msg.deliveryMethod || 'provider',
    fallbackStatus: msg.fallbackStatus || null,
    fallbackJobId: msg.fallbackJobId || null,
    fallbackFailureReason: msg.fallbackFailureReason || null,
    fallbackProvider: msg.fallbackProvider || null,
    requiresPhoneTopUp: Boolean(msg.requiresPhoneTopUp),
    providerRetryAttempted: Boolean(msg.providerRetryAttempted),
    providerRetryStatus: msg.providerRetryStatus || null,
    failureReason: getFailureReason(msg),
    messageId: msg.hpTransactionId || String(msg._id),
    providerMessageId: msg.hpTransactionId || msg.externalMsgId || msg.providerRetrySmsId || null,
    providerStatus: msg.providerStatus || null,
    sentAt: msg.sentAt ? new Date(msg.sentAt).toISOString() : null,
    deliveredAt: msg.deliveredAt ? new Date(msg.deliveredAt).toISOString() : null,
    cost: msg.totalCost || 0,
    retryCount: msg.statusCheckAttempts || 0,
    lastAttemptAt: msg.failedAt
      ? new Date(msg.failedAt).toISOString()
      : msg.sentAt
        ? new Date(msg.sentAt).toISOString()
        : null,
    source: msg.source || null,
    sourceLabel: getSourceDisplayLabel(msg.source, msg.authMethod),
    authMethod: msg.authMethod || null,
    authMethodLabel: getAuthMethodDisplayLabel(msg.authMethod),
    apiKeyName: msg.apiKeyName || null,
    clientUsername: msg.clientUsername || null,
    clientName: msg.clientName || null,
    toNumbers: msg.toNumbers,
    segments: msg.segments || 1,
    messageRedacted: Boolean(msg.messageRedacted),
  }
}

export function escapeCsvValue(value: unknown): string {
  const str = value == null ? '' : String(value)
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

export function formatSmsHistoryCsvRow(msg: ISmsMessage & { _id?: unknown }): string {
  const row = formatSmsHistoryRow(msg)
  const messageCol = row.messageRedacted ? REDACTED_MESSAGE_LABEL : row.message
  return [
    row.createdAt,
    row.sentAt || '',
    row.deliveredAt || '',
    row.recipient,
    row.senderId,
    row.campaign,
    messageCol,
    row.displayStatus,
    row.deliveryMethod,
    row.providerMessageId || '',
    row.providerStatus || '',
    row.failureReason || '',
    row.fallbackStatus || '',
    row.fallbackProvider || '',
    row.fallbackJobId || '',
    row.sourceLabel || row.source || '',
    row.authMethodLabel || row.authMethod || '',
    row.apiKeyName || '',
    row.clientUsername || '',
    row.clientName || '',
    row.cost,
  ]
    .map(escapeCsvValue)
    .join(',')
}

export const SMS_HISTORY_CSV_HEADERS = [
  'Created At',
  'Sent At',
  'Delivered At',
  'Recipient',
  'Sender ID',
  'Campaign',
  'Message',
  'Status',
  'Delivery Method',
  'Provider Message ID',
  'Provider Status',
  'Failure Reason',
  'Fallback Status',
  'Fallback Provider',
  'Fallback Job ID',
  'Source',
  'Auth Method',
  'API Key Name',
  'Client Username',
  'Client Name',
  'Credits Used',
]

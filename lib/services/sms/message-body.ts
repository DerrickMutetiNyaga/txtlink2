import { ISmsMessage } from '@/lib/db/models'

export const REDACTED_MESSAGE_LABEL = 'Message deleted after delivery'

export type MessageBodyFieldSource =
  | 'messageBody'
  | 'renderedMessageBody'
  | 'originalMessageBody'
  | 'message'
  | 'text'
  | 'body'
  | 'content'
  | 'sms'
  | 'messageText'
  | 'message_body'
  | 'missing'

export type OutgoingMessageInputField =
  | 'message'
  | 'text'
  | 'body'
  | 'content'
  | 'sms'
  | 'messageText'
  | 'message_body'

export interface MessageBodyMetadata {
  apiKeyName?: string | null
  clientUsername?: string | null
  clientName?: string | null
  accountName?: string | null
  campaignName?: string | null
  senderId?: string | null
  senderName?: string | null
  recipientName?: string | null
  routeName?: string | null
  integrationName?: string | null
  username?: string | null
}

const OUTGOING_MESSAGE_FIELDS: OutgoingMessageInputField[] = [
  'message',
  'text',
  'body',
  'content',
  'sms',
  'messageText',
  'message_body',
]

export type NormalizeOutgoingSmsResult =
  | { ok: true; message: string; usedField: OutgoingMessageInputField }
  | { ok: false; error: string; status: 400 }

/** Extract and validate the real SMS body from an outgoing request payload. */
export function normalizeOutgoingSmsPayload(
  input: Record<string, unknown>,
  metadata: MessageBodyMetadata = {}
): NormalizeOutgoingSmsResult {
  let usedField: OutgoingMessageInputField | null = null
  let message: string | null = null

  for (const field of OUTGOING_MESSAGE_FIELDS) {
    const candidate = input[field]
    if (typeof candidate === 'string') {
      const trimmed = candidate.trim()
      if (trimmed) {
        usedField = field
        message = trimmed
        break
      }
    }
  }

  if (!message || !usedField) {
    return { ok: false, error: 'SMS message body is required', status: 400 }
  }

  if (isMetadataUsedAsMessageBody(message, metadata)) {
    console.error('Invalid SMS body: metadata was used instead of message body', {
      usedField,
      messagePreview: getMessagePreview(message),
      metadata,
    })
    return {
      ok: false,
      error: 'Invalid SMS body: metadata was used instead of message body',
      status: 400,
    }
  }

  return { ok: true, message, usedField }
}

/** @deprecated Use normalizeOutgoingSmsPayload */
export function extractMessageFromRequest(body: Record<string, unknown>): string | null {
  const result = normalizeOutgoingSmsPayload(body)
  return result.ok ? result.message : null
}

export function buildMetadataFromSms(
  sms: Pick<
    ISmsMessage,
    'apiKeyName' | 'clientUsername' | 'clientName' | 'campaignName' | 'senderName' | 'email'
  > & { recipientName?: string | null }
): MessageBodyMetadata {
  return {
    apiKeyName: sms.apiKeyName,
    clientUsername: sms.clientUsername || sms.email,
    clientName: sms.clientName,
    accountName: sms.clientName,
    campaignName: sms.campaignName,
    senderId: sms.senderName,
    senderName: sms.senderName,
    recipientName: sms.recipientName,
    username: sms.clientUsername || sms.email,
  }
}

/** Read the best available SMS body from a stored message (legacy + new fields). */
export function resolveSmsMessageBody(
  sms: Pick<
    ISmsMessage,
    | 'messageBody'
    | 'renderedMessageBody'
    | 'originalMessageBody'
    | 'message'
    | 'messageRedacted'
  > & {
    text?: string
    body?: string
    content?: string
    sms?: string
  }
): { body: string; usedField: MessageBodyFieldSource } | null {
  if (sms.messageRedacted) return null

  const fields: Array<[MessageBodyFieldSource, string | undefined | null]> = [
    ['messageBody', sms.messageBody],
    ['renderedMessageBody', sms.renderedMessageBody],
    ['originalMessageBody', sms.originalMessageBody],
    ['message', sms.message === REDACTED_MESSAGE_LABEL ? null : sms.message],
    ['text', sms.text],
    ['body', sms.body],
    ['content', sms.content],
    ['sms', sms.sms],
  ]

  for (const [usedField, value] of fields) {
    if (typeof value === 'string' && value.trim()) {
      return { body: value.trim(), usedField }
    }
  }

  return null
}

export function isMetadataUsedAsMessageBody(
  message: string,
  metadata: MessageBodyMetadata
): boolean {
  const normalized = message.trim().toLowerCase()
  if (!normalized) return true

  const forbidden = [
    metadata.apiKeyName,
    metadata.clientUsername,
    metadata.clientName,
    metadata.accountName,
    metadata.username,
    metadata.campaignName,
    metadata.senderId,
    metadata.senderName,
    metadata.recipientName,
    metadata.routeName,
    metadata.integrationName,
  ]
    .filter(Boolean)
    .map((v) => String(v).trim().toLowerCase())

  return forbidden.includes(normalized)
}

export function validateFallbackMessageBody(
  message: string,
  metadata: MessageBodyMetadata
): void {
  if (!message.trim()) {
    throw new Error('Invalid fallback message body: empty message')
  }
  if (isMetadataUsedAsMessageBody(message, metadata)) {
    throw new Error('Invalid fallback message body: metadata was used instead of SMS body')
  }
}

export function buildMessageBodyFields(actualMessage: string, template?: string) {
  const body = actualMessage.trim()
  return {
    messageBody: body,
    originalMessageBody: template?.trim() || body,
    renderedMessageBody: body,
    message: body,
  }
}

export function renderBulkTemplate(
  template: string,
  vars: Record<string, string | undefined | null>
): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => {
    const value = vars[key]
    return value != null && String(value).trim() ? String(value).trim() : `{${key}}`
  })
}

export function getMessagePreview(message: string, max = 30): string {
  const trimmed = message.trim()
  if (trimmed.length <= max) return trimmed
  return `${trimmed.slice(0, max)}…`
}

export function logSmsMessageCreateDebug(params: {
  source: string
  authMethod?: string | null
  apiKeyName?: string | null
  clientUsername?: string | null
  clientName?: string | null
  message: string
  usedMessageField: string
}): void {
  console.log('Creating SmsMessage', {
    source: params.source,
    authMethod: params.authMethod || null,
    apiKeyName: params.apiKeyName || null,
    clientUsername: params.clientUsername || null,
    clientName: params.clientName || null,
    messageLength: params.message.length,
    messagePreview: getMessagePreview(params.message),
    usedMessageField: params.usedMessageField,
  })
}

export function logFallbackJobMessageDebug(params: {
  originalSmsId: string
  source?: string | null
  authMethod?: string | null
  apiKeyName?: string | null
  clientUsername?: string | null
  clientName?: string | null
  message: string
  usedFieldName: MessageBodyFieldSource
}): void {
  console.log('Creating phone fallback job message', {
    originalSmsId: params.originalSmsId,
    source: params.source || null,
    authMethod: params.authMethod || null,
    apiKeyName: params.apiKeyName || null,
    clientUsername: params.clientUsername || null,
    clientName: params.clientName || null,
    messageLength: params.message.length,
    messagePreview: getMessagePreview(params.message),
    usedFieldName: params.usedFieldName,
  })

  const preview = params.message.trim().toLowerCase()
  for (const value of [params.apiKeyName, params.clientUsername, params.clientName]) {
    if (value && preview === String(value).trim().toLowerCase()) {
      console.error('FALLBACK MESSAGE ERROR: message equals metadata', {
        originalSmsId: params.originalSmsId,
        conflict: value,
      })
    }
  }
}

/** Reserved for a future optional "Delete message body after delivery" privacy setting (default: off). */
export function buildRedactedMessageUpdate(now = new Date()): Record<string, unknown> {
  return {
    messageBody: null,
    renderedMessageBody: null,
    originalMessageBody: null,
    message: REDACTED_MESSAGE_LABEL,
    messageRedacted: true,
    messageRedactedAt: now,
  }
}

export function getDisplayMessageText(
  sms: Pick<ISmsMessage, 'message' | 'messageBody' | 'messageRedacted'>
): string {
  if (sms.messageRedacted) return REDACTED_MESSAGE_LABEL
  const resolved = resolveSmsMessageBody(sms)
  return resolved?.body || (sms.message === REDACTED_MESSAGE_LABEL ? REDACTED_MESSAGE_LABEL : sms.message || '')
}

export function getSourceDisplayLabel(source?: string | null, authMethod?: string | null): string {
  switch (source) {
    case 'api_key':
      return 'API Key'
    case 'username_password':
      return 'Username/Password Client'
    case 'external_client':
      return 'External Client'
    case 'dashboard':
      return 'Send SMS'
    case 'bulk':
      return 'Bulk SMS'
    case 'system':
      return authMethod === 'username_password' ? 'Username/Password Client' : 'System'
    case 'test':
      return 'Test'
    default:
      if (authMethod === 'username_password') return 'Username/Password Client'
      if (authMethod === 'api_key') return 'API Key'
      if (authMethod === 'session') return 'Send SMS'
      return source || 'SMS'
  }
}

export function getAuthMethodDisplayLabel(authMethod?: string | null): string {
  switch (authMethod) {
    case 'api_key':
      return 'API Key'
    case 'username_password':
      return 'Username/Password'
    case 'session':
      return 'Dashboard Session'
    case 'system':
      return 'System'
    default:
      return authMethod || ''
  }
}

export function resolveFallbackMessageForSms(
  sms: ISmsMessage & { text?: string; body?: string; content?: string; sms?: string }
): { body: string; usedField: MessageBodyFieldSource } | null {
  const resolved = resolveSmsMessageBody(sms)
  if (!resolved) return null

  if (isMetadataUsedAsMessageBody(resolved.body, buildMetadataFromSms(sms))) {
    console.error('Resolved SMS body matches metadata — rejecting for fallback', {
      smsId: String(sms._id),
      usedField: resolved.usedField,
      apiKeyName: sms.apiKeyName,
      clientUsername: sms.clientUsername,
      preview: getMessagePreview(resolved.body),
    })
    return null
  }

  return resolved
}

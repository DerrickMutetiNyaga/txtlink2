import mongoose from 'mongoose'
import { SMS_PENDING_STATUSES } from '@/lib/db/models'
import {
  ACTIVE_FALLBACK_STATUSES,
  DELETABLE_STATUSES,
  FAILED_LIKE_STATUSES,
} from './constants'

export interface SmsHistoryQueryParams {
  userId: mongoose.Types.ObjectId
  page?: number
  limit?: number
  status?: string
  senderId?: string
  campaign?: string
  country?: string
  fromDate?: string | null
  toDate?: string | null
  search?: string
}

export interface ParsedSmsHistoryQuery {
  filter: Record<string, unknown>
  page: number
  limit: number
  skip: number
}

function startOfDay(dateStr: string): Date {
  const d = new Date(dateStr)
  d.setHours(0, 0, 0, 0)
  return d
}

function endOfDay(dateStr: string): Date {
  const d = new Date(dateStr)
  d.setHours(23, 59, 59, 999)
  return d
}

function campaignToSource(campaign: string): string | null {
  switch (campaign) {
    case 'Send SMS':
      return 'dashboard'
    case 'Bulk SMS':
      return 'bulk'
    case 'API':
      return 'api_key'
    case 'System':
      return 'system'
    case 'Test':
      return 'test'
    default:
      return null
  }
}

function buildStatusFilter(status: string): Record<string, unknown> | null {
  switch (status) {
    case 'all':
      return null
    case 'delivered':
      return {
        status: 'delivered',
        deliveryMethod: { $ne: 'android_phone_gateway' },
        fallbackStatus: { $nin: ['delivered_via_phone', 'sent_via_phone'] },
      }
    case 'delivered_via_phone':
      return {
        $or: [
          { deliveryMethod: 'android_phone_gateway' },
          { fallbackStatus: { $in: ['delivered_via_phone', 'sent_via_phone'] } },
        ],
      }
    case 'sent':
      return { status: 'sent' }
    case 'pending':
      return { status: { $in: [...SMS_PENDING_STATUSES] } }
    case 'failed':
      return { status: { $in: [...FAILED_LIKE_STATUSES] } }
    case 'queued_for_phone':
      return { fallbackStatus: 'queued_for_phone' }
    case 'retrying_provider':
      return { fallbackStatus: 'retrying_provider' }
    case 'retry_waiting_delivery':
      return { fallbackStatus: 'retry_waiting_delivery' }
    case 'phone_failed':
      return { fallbackStatus: 'phone_failed' }
    case 'phone_requires_topup':
      return { fallbackStatus: 'phone_requires_topup' }
    default:
      return { status }
  }
}

function buildCountryFilter(country: string): Record<string, unknown> | null {
  if (country === 'all') return null
  switch (country) {
    case 'KE':
      return {
        $or: [
          { normalizedPhone: { $regex: '^254' } },
          { toNumbers: { $elemMatch: { $regex: '^\\+?254|^0' } } },
        ],
      }
    case 'UG':
      return {
        $or: [
          { normalizedPhone: { $regex: '^256' } },
          { toNumbers: { $elemMatch: { $regex: '^\\+?256|^0' } } },
        ],
      }
    case 'TZ':
      return {
        $or: [
          { normalizedPhone: { $regex: '^255' } },
          { toNumbers: { $elemMatch: { $regex: '^\\+?255|^0' } } },
        ],
      }
    default:
      return null
  }
}

export function buildSmsHistoryFilter(params: SmsHistoryQueryParams): Record<string, unknown> {
  const and: Record<string, unknown>[] = [{ userId: params.userId }]

  const statusFilter = buildStatusFilter(params.status || 'all')
  if (statusFilter) and.push(statusFilter)

  if (params.senderId && params.senderId !== 'all') {
    and.push({ senderName: params.senderId })
  }

  if (params.campaign && params.campaign !== 'all') {
    const source = campaignToSource(params.campaign)
    if (source) {
      and.push({ source })
    }
  }

  const countryFilter = buildCountryFilter(params.country || 'all')
  if (countryFilter) and.push(countryFilter)

  if (params.fromDate || params.toDate) {
    const dateClause: Record<string, Date> = {}
    if (params.fromDate) dateClause.$gte = startOfDay(params.fromDate)
    if (params.toDate) dateClause.$lte = endOfDay(params.toDate)
    and.push({ createdAt: dateClause })
  }

  const search = (params.search || '').trim()
  if (search) {
    const regex = { $regex: search, $options: 'i' }
    and.push({
      $or: [
        { toNumbers: regex },
        { normalizedPhone: regex },
        { message: regex },
        { senderName: regex },
        { hpTransactionId: regex },
        { externalMsgId: regex },
        { providerRetrySmsId: regex },
        { fallbackJobId: regex },
        { apiKeyName: regex },
        { source: regex },
      ],
    })
  }

  if (and.length === 1) return and[0]
  return { $and: and }
}

export function parseSmsHistoryQuery(params: SmsHistoryQueryParams): ParsedSmsHistoryQuery {
  const page = Math.max(parseInt(String(params.page || 1), 10) || 1, 1)
  const rawLimit = parseInt(String(params.limit || 25), 10) || 25
  const limit = [25, 50, 100].includes(rawLimit) ? rawLimit : 25
  const skip = (page - 1) * limit
  const filter = buildSmsHistoryFilter(params)

  return { filter, page, limit, skip }
}

export function isActiveFallbackSms(fallbackStatus?: string | null): boolean {
  if (!fallbackStatus) return false
  return (ACTIVE_FALLBACK_STATUSES as readonly string[]).includes(fallbackStatus)
}

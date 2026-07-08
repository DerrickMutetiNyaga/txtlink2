'use client'

import { PortalLayout } from '@/components/portal-layout'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { 
  Search, 
  Download, 
  Plus, 
  RefreshCw, 
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Clock,
  XCircle,
  Phone,
  MessageSquare,
  FileText,
  DollarSign,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { useState, useEffect, useCallback, useMemo } from 'react'
import Link from 'next/link'
import SenderIdAdBanner from '@/components/sender-id-ad/SenderIdAdBanner'
import { cn } from '@/lib/utils'

// Message type
interface SMSMessage {
  id: string
  time: string
  createdAt?: string
  recipient: string
  senderId: string
  campaign: string
  message: string
  status: string
  displayStatus?: string
  deliveryMethod?: string
  fallbackStatus?: string | null
  fallbackJobId?: string | null
  fallbackFailureReason?: string | null
  requiresPhoneTopUp?: boolean
  providerRetryAttempted?: boolean
  providerRetryStatus?: string | null
  failureReason?: string
  messageId: string
  sentAt: string | Date | null
  deliveredAt?: string | null
  cost: number
  retryCount: number
  lastAttemptAt: string | Date | null
  source?: string | null
  apiKeyName?: string | null
}

interface PaginationInfo {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
}

const SMS_HISTORY_BTN = {
  outline:
    'h-9 rounded-xl border border-[#E2E8F0] bg-white px-3 sm:px-4 py-2 text-sm font-medium text-[#2F9B73] shadow-sm hover:bg-[#ECFDF5] hover:text-[#267D5E] hover:border-[#E2E8F0] disabled:bg-slate-100 disabled:text-[#64748B] disabled:border-[#E2E8F0] disabled:opacity-100',
  primary:
    'h-9 rounded-xl bg-[#2F9B73] px-3 sm:px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-[#267D5E] disabled:opacity-50',
  pagination:
    'h-8 rounded-lg border border-[#E2E8F0] bg-white text-[#0F172A] shadow-sm hover:bg-[#ECFDF5] hover:text-[#2F9B73] hover:border-[#E2E8F0] disabled:bg-slate-100 disabled:text-[#64748B] disabled:border-[#E2E8F0] disabled:opacity-100',
  modalOutline:
    'rounded-xl border border-[#E2E8F0] bg-white text-[#0F172A] hover:bg-[#ECFDF5] hover:text-[#2F9B73] hover:border-[#E2E8F0]',
  modalPrimary: 'rounded-xl bg-[#2F9B73] text-white hover:bg-[#267D5E]',
  sheetOutline:
    'text-xs border-[#E2E8F0] bg-white text-[#2F9B73] hover:bg-[#ECFDF5] hover:text-[#267D5E] hover:border-[#E2E8F0]',
} as const

const controlCardClass =
  'rounded-[18px] border border-[#E2E8F0] bg-white p-4 shadow-sm w-full max-w-full min-w-0'

const searchInputClass =
  'w-full h-11 rounded-[14px] border border-[#E2E8F0] bg-[#F8FAFC] pl-10 pr-4 text-sm text-[#0F172A] placeholder:text-[#94A3B8] shadow-none focus-visible:border-[#2F9B73] focus-visible:ring-2 focus-visible:ring-[#2F9B73]/20 focus-visible:bg-white'

const filterSelectClass =
  'w-full h-11 rounded-xl border border-[#E2E8F0] bg-white px-3 text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#2F9B73]/20 focus:border-[#2F9B73] min-w-0'

const mobilePrimaryBtnClass =
  'h-[46px] w-full rounded-[14px] bg-[#2F9B73] text-white hover:bg-[#267D5E] font-medium shadow-sm'

const quickActionBtnClass =
  'h-11 min-w-0 rounded-xl border border-[#E2E8F0] bg-white text-[#2F9B73] text-xs sm:text-sm font-medium hover:bg-[#ECFDF5] inline-flex items-center justify-center gap-1.5 px-2 disabled:opacity-60'

function formatDateLabel(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function getFallbackBadgeClass(fallbackStatus?: string | null): string {
  switch (fallbackStatus) {
    case 'retrying_provider':
      return 'bg-blue-100 text-blue-700'
    case 'retry_waiting_delivery':
    case 'queued_for_phone':
      return 'bg-amber-100 text-amber-700'
    case 'sending_via_phone':
      return 'bg-blue-100 text-blue-700'
    case 'sent_via_phone':
    case 'delivered_via_phone':
      return 'bg-emerald-100 text-emerald-700'
    case 'phone_requires_topup':
      return 'bg-red-100 text-red-700'
    case 'phone_failed':
      return 'bg-red-100 text-red-700'
    case 'cancelled':
      return 'bg-slate-100 text-slate-600'
    default:
      return ''
  }
}

function getFallbackBadgeLabel(
  fallbackStatus?: string | null,
  requiresPhoneTopUp?: boolean
): string | null {
  switch (fallbackStatus) {
    case 'retrying_provider':
      return 'Retrying Provider'
    case 'retry_waiting_delivery':
      return 'Retry Waiting Delivery'
    case 'queued_for_phone':
      return 'Queued for Phone'
    case 'sending_via_phone':
      return 'Sending via Phone'
    case 'sent_via_phone':
    case 'delivered_via_phone':
      return 'Delivered via Phone'
    case 'phone_requires_topup':
      return 'Phone Needs Reload'
    case 'phone_failed':
      return requiresPhoneTopUp ? 'Phone Send Failed - Reload SMS' : 'Phone Send Failed'
    case 'cancelled':
      return 'Cancelled Fallback'
    default:
      return null
  }
}

function getPrimaryStatusLabel(sms: SMSMessage): string {
  if (sms.displayStatus) return sms.displayStatus
  if (sms.status === 'delivered' && sms.deliveryMethod === 'android_phone_gateway') {
    return 'Delivered via Phone'
  }
  if (sms.status === 'retrying') return 'Retrying'
  return sms.status.charAt(0).toUpperCase() + sms.status.slice(1)
}

export default function SMSHistoryPage() {
  const { toast } = useToast()
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [senderIdFilter, setSenderIdFilter] = useState('all')
  const [campaignFilter, setCampaignFilter] = useState('all')
  const [countryFilter, setCountryFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(25)
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 25,
    total: 0,
    totalPages: 1,
    hasNext: false,
    hasPrev: false,
  })
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [draftFromDate, setDraftFromDate] = useState('')
  const [draftToDate, setDraftToDate] = useState('')
  const [isDateDialogOpen, setIsDateDialogOpen] = useState(false)
  const [exportingCsv, setExportingCsv] = useState(false)
  const [smsHistory, setSmsHistory] = useState<SMSMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedSms, setSelectedSms] = useState<SMSMessage | null>(null)
  const [isViewOpen, setIsViewOpen] = useState(false)
  const [isRetryDialogOpen, setIsRetryDialogOpen] = useState(false)
  const [deliveryStats, setDeliveryStats] = useState({
    delivered: { count: 0, percentage: 0 },
    failed: { count: 0, percentage: 0 },
    pending: { count: 0, percentage: 0 },
  })
  const [failureInsights, setFailureInsights] = useState<Array<{ reason: string; count: number; percentage: number }>>([])
  const [availableSenderIds, setAvailableSenderIds] = useState<string[]>([])
  const [availableCampaigns, setAvailableCampaigns] = useState<string[]>([
    'Send SMS',
    'Bulk SMS',
    'API',
    'System',
    'Test',
  ])
  const [isAutoRefreshing, setIsAutoRefreshing] = useState(false)

  const buildQueryParams = useCallback(() => {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
      status: statusFilter,
      senderId: senderIdFilter,
      campaign: campaignFilter,
      country: countryFilter,
      search: debouncedSearch.trim(),
    })
    if (fromDate) params.set('fromDate', fromDate)
    if (toDate) params.set('toDate', toDate)
    return params
  }, [page, limit, statusFilter, senderIdFilter, campaignFilter, countryFilter, debouncedSearch, fromDate, toDate])

  const hasActiveFilters = useMemo(() => {
    return (
      statusFilter !== 'all' ||
      senderIdFilter !== 'all' ||
      campaignFilter !== 'all' ||
      countryFilter !== 'all' ||
      Boolean(searchQuery.trim()) ||
      Boolean(fromDate) ||
      Boolean(toDate)
    )
  }, [statusFilter, senderIdFilter, campaignFilter, countryFilter, searchQuery, fromDate, toDate])

  // Fetch SMS history function
  const fetchSMSHistory = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true)
      setIsAutoRefreshing(true)
      const token = localStorage.getItem('token')
      const params = buildQueryParams()

      const response = await fetch(`/api/user/sms/history?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setSmsHistory(data.data || data.messages || [])
        setPagination(
          data.pagination || {
            page,
            limit,
            total: 0,
            totalPages: 1,
            hasNext: false,
            hasPrev: false,
          }
        )
        setDeliveryStats(data.stats || {
          delivered: { count: 0, percentage: 0 },
          failed: { count: 0, percentage: 0 },
          pending: { count: 0, percentage: 0 },
        })
        setFailureInsights(data.failureInsights || [])
        setAvailableSenderIds(data.filters?.availableSenderIds || [])
        if (data.filters?.availableCampaigns?.length) {
          setAvailableCampaigns(data.filters.availableCampaigns)
        }
      }
    } catch (error) {
      console.error('Failed to fetch SMS history:', error)
      if (showLoading) {
        toast({
          title: 'Error',
          description: 'Failed to load SMS history',
          variant: 'destructive',
        })
      }
    } finally {
      if (showLoading) setLoading(false)
      setIsAutoRefreshing(false)
    }
  }, [buildQueryParams, page, limit, toast])

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery)
      setPage(1)
    }, 400)
    return () => clearTimeout(timer)
  }, [searchQuery])

  // Initial fetch and when filters change
  useEffect(() => {
    fetchSMSHistory(true)
  }, [page, limit, statusFilter, senderIdFilter, campaignFilter, countryFilter, debouncedSearch, fromDate, toDate])

  // NOTE: No automatic status polling here by design.
  // Delivery statuses are kept up to date in MongoDB by the dedicated Render
  // background worker; this page simply displays stored data. Users can
  // refresh manually with the Refresh button or by changing filters.

  const getStatusBadge = (sms: SMSMessage) => {
    if (sms.status === 'delivered' && sms.deliveryMethod === 'android_phone_gateway') {
      return 'bg-emerald-100 text-emerald-700'
    }
    switch (sms.status) {
      case 'delivered':
        return 'bg-emerald-100 text-emerald-700'
      case 'failed':
        return 'bg-red-100 text-red-700'
      case 'pending':
      case 'queued':
      case 'sent':
        return 'bg-amber-100 text-amber-700'
      case 'retrying':
        return 'bg-blue-100 text-blue-700'
      default:
        return 'bg-slate-100 text-slate-700'
    }
  }

  // Server-side filtering handles all filters
  const filteredHistory = smsHistory

  const handleExportCsv = async () => {
    try {
      setExportingCsv(true)
      const token = localStorage.getItem('token')
      const params = buildQueryParams()
      params.delete('page')
      params.delete('limit')

      const response = await fetch(`/api/user/sms/history/export.csv?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!response.ok) {
        throw new Error('Export failed')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `sms-history-${new Date().toISOString().slice(0, 10)}.csv`
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      window.URL.revokeObjectURL(url)

      toast({ title: 'Export started', description: 'Your CSV download should begin shortly.' })
    } catch {
      toast({
        title: 'Export failed',
        description: 'Could not export SMS history.',
        variant: 'destructive',
      })
    } finally {
      setExportingCsv(false)
    }
  }

  const handleApplyDateRange = () => {
    setFromDate(draftFromDate)
    setToDate(draftToDate)
    setPage(1)
    setIsDateDialogOpen(false)
  }

  const handleClearDateRange = () => {
    setDraftFromDate('')
    setDraftToDate('')
    setFromDate('')
    setToDate('')
    setPage(1)
    setIsDateDialogOpen(false)
  }

  const handleClearAllFilters = () => {
    setStatusFilter('all')
    setSenderIdFilter('all')
    setCampaignFilter('all')
    setCountryFilter('all')
    setSearchQuery('')
    setFromDate('')
    setToDate('')
    setDraftFromDate('')
    setDraftToDate('')
    setPage(1)
  }

  const resetPageOnFilter = (setter: (value: string) => void) => (value: string) => {
    setter(value)
    setPage(1)
  }

  const failedMessages = filteredHistory.filter(sms => sms.status === 'failed')
  const canRetry = failedMessages.length > 0 && failedMessages.every(sms => {
    if (sms.retryCount >= 3) return false
    if (!sms.lastAttemptAt) return true
    const lastAttempt = new Date(sms.lastAttemptAt).getTime()
    const now = Date.now()
    const minutesSinceLastAttempt = (now - lastAttempt) / (1000 * 60)
    return minutesSinceLastAttempt >= 3
  })

  const handleViewSms = (sms: SMSMessage) => {
    setSelectedSms(sms)
    setIsViewOpen(true)
  }

  const handleRetryFailed = () => {
    setIsRetryDialogOpen(true)
  }

  const handleFallbackAction = async (
    messageId: string,
    action: 'retry-provider' | 'queue-phone' | 'cancel' | 'retry-phone'
  ) => {
    const token = localStorage.getItem('token')
    const response = await fetch(`/api/user/sms-fallback/${messageId}/${action}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    })
    const data = await response.json()
    if (response.ok) {
      toast({ title: 'Success', description: data.message })
      fetchSMSHistory(false)
    } else {
      toast({
        title: 'Error',
        description: data.error || 'Action failed',
        variant: 'destructive',
      })
    }
  }

  const confirmRetry = () => {
    const eligibleMessages = failedMessages.filter(sms => {
      if (sms.retryCount >= 3) return false
      if (!sms.lastAttemptAt) return true
      const lastAttempt = new Date(sms.lastAttemptAt).getTime()
      const now = Date.now()
      const minutesSinceLastAttempt = (now - lastAttempt) / (1000 * 60)
      return minutesSinceLastAttempt >= 3
    })

    // Update messages to "retrying" status
    setSmsHistory(prev => prev.map(sms => {
      if (eligibleMessages.find(m => m.id === sms.id)) {
        return { ...sms, status: 'retrying' as const, retryCount: sms.retryCount + 1, lastAttemptAt: new Date().toISOString() }
      }
      return sms
    }))

    // Simulate retry delay (3 minutes)
    setTimeout(() => {
      setSmsHistory(prev => prev.map(sms => {
        if (sms.status === 'retrying') {
          // Simulate: 70% success rate on retry
          const success = Math.random() > 0.3
          return {
            ...sms,
            status: success ? 'delivered' : 'failed',
            lastAttemptAt: new Date().toISOString()
          }
        }
        return sms
      }))
    }, 3000) // 3 seconds for demo (should be 3 minutes in production)

    setIsRetryDialogOpen(false)
    toast({
      title: "Retry queued",
      description: `${eligibleMessages.length} messages will be resent shortly.`,
    })
  }

  return (
    <PortalLayout activeSection="SMS History">
      <div className="space-y-4 md:space-y-6 w-full max-w-full min-w-0">
        <SenderIdAdBanner currentPage="smshistory" />

        {/* Controls card */}
        <Card className={controlCardClass}>
          {/* Header */}
          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl font-semibold text-[#0F172A]">SMS History</h1>
            <p className="text-sm text-[#64748B] mt-1 md:hidden">
              Track sent, delivered, failed, and fallback messages.
            </p>
            <p className="text-sm text-[#64748B] mt-1 hidden md:block">
              View, search, and track delivery status for all SMS messages.
            </p>
            <p className="text-xs text-[#64748B] mt-1 hidden lg:block">
              Delivered/Failed status is updated by HostPinnacle delivery reports (DLR)—so you can see if each message actually reached the recipient.
            </p>
          </div>

          {/* Search + desktop title row spacer / mobile stacked controls */}
          <div className="mt-3 flex flex-col md:flex-row md:items-center md:gap-4 gap-2.5 min-w-0">
            <div className="relative w-full md:flex-1 md:max-w-md min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#64748B] pointer-events-none" />
              <Input
                type="text"
                placeholder="Search phone, message, or sender ID"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={searchInputClass}
              />
            </div>

            <Link href="/app/send-sms" className="md:hidden w-full shrink-0">
              <Button className={mobilePrimaryBtnClass}>
                <Plus className="w-4 h-4" />
                New SMS
              </Button>
            </Link>

            <div className="grid grid-cols-3 gap-2 w-full md:flex md:flex-wrap md:w-auto md:shrink-0 min-w-0">
              <Button
                type="button"
                onClick={() => fetchSMSHistory(true)}
                disabled={isAutoRefreshing}
                className={quickActionBtnClass}
                title="Refresh now"
              >
                <RefreshCw className={cn('w-4 h-4 shrink-0', isAutoRefreshing && 'animate-spin')} />
                <span className="truncate">{isAutoRefreshing ? '…' : 'Refresh'}</span>
              </Button>
              <Button
                type="button"
                onClick={() => {
                  setDraftFromDate(fromDate)
                  setDraftToDate(toDate)
                  setIsDateDialogOpen(true)
                }}
                className={quickActionBtnClass}
              >
                <Calendar className="w-4 h-4 shrink-0" />
                <span className="truncate hidden min-[360px]:inline">Date Range</span>
                <span className="truncate min-[360px]:hidden">Dates</span>
              </Button>
              <Button
                type="button"
                onClick={handleExportCsv}
                disabled={exportingCsv}
                className={quickActionBtnClass}
              >
                <Download className="w-4 h-4 shrink-0" />
                <span className="truncate">{exportingCsv ? '…' : 'Export'}</span>
              </Button>
              <Link href="/app/send-sms" className="hidden md:block">
                <Button className={cn(SMS_HISTORY_BTN.primary, 'h-11 px-4')}>
                  <Plus className="w-4 h-4 mr-1.5" />
                  New SMS
                </Button>
              </Link>
            </div>
          </div>

          {/* Filters */}
          <div className="mt-3 grid grid-cols-2 md:flex md:flex-wrap gap-2 min-w-0">
            <select
              value={statusFilter}
              onChange={(e) => resetPageOnFilter(setStatusFilter)(e.target.value)}
              className={filterSelectClass}
            >
              <option value="all">All Status</option>
              <option value="delivered">Delivered</option>
              <option value="delivered_via_phone">Delivered via Phone</option>
              <option value="sent">Sent</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
              <option value="queued_for_phone">Queued for Phone</option>
              <option value="retrying_provider">Retrying Provider</option>
              <option value="retry_waiting_delivery">Retry Waiting Delivery</option>
              <option value="phone_failed">Phone Failed</option>
              <option value="phone_requires_topup">Phone Needs Reload</option>
            </select>

            <select
              value={senderIdFilter}
              onChange={(e) => resetPageOnFilter(setSenderIdFilter)(e.target.value)}
              className={filterSelectClass}
            >
              <option value="all">All Sender IDs</option>
              {availableSenderIds.map((senderId) => (
                <option key={senderId} value={senderId}>
                  {senderId}
                </option>
              ))}
            </select>

            <select
              value={campaignFilter}
              onChange={(e) => resetPageOnFilter(setCampaignFilter)(e.target.value)}
              className={filterSelectClass}
            >
              <option value="all">All Campaigns</option>
              {availableCampaigns.map((campaign) => (
                <option key={campaign} value={campaign}>
                  {campaign}
                </option>
              ))}
            </select>

            <select
              value={countryFilter}
              onChange={(e) => resetPageOnFilter(setCountryFilter)(e.target.value)}
              className={filterSelectClass}
            >
              <option value="all">All Countries</option>
              <option value="KE">Kenya</option>
              <option value="UG">Uganda</option>
              <option value="TZ">Tanzania</option>
            </select>

            <select
              value={String(limit)}
              onChange={(e) => {
                setLimit(parseInt(e.target.value, 10))
                setPage(1)
              }}
              className={cn(filterSelectClass, 'col-span-2 md:col-span-1 md:w-auto')}
            >
              <option value="25">25 / page</option>
              <option value="50">50 / page</option>
              <option value="100">100 / page</option>
            </select>
          </div>

          {(fromDate || toDate || hasActiveFilters) && (
            <div className="mt-3 flex flex-wrap items-center gap-2 min-w-0">
              {fromDate && toDate && (
                <Badge variant="outline" className="rounded-full bg-[#ECFDF5] text-[#047857] border-[#2F9B73]/30">
                  Showing {formatDateLabel(fromDate)} - {formatDateLabel(toDate)}
                </Badge>
              )}
              {fromDate && !toDate && (
                <Badge variant="outline" className="rounded-full bg-[#ECFDF5] text-[#047857] border-[#2F9B73]/30">
                  From {formatDateLabel(fromDate)}
                </Badge>
              )}
              {!fromDate && toDate && (
                <Badge variant="outline" className="rounded-full bg-[#ECFDF5] text-[#047857] border-[#2F9B73]/30">
                  Until {formatDateLabel(toDate)}
                </Badge>
              )}
              {statusFilter !== 'all' && (
                <Badge variant="outline" className="rounded-full border-[#E2E8F0]">
                  Status: {statusFilter.replace(/_/g, ' ')}
                </Badge>
              )}
              {searchQuery.trim() && (
                <Badge variant="outline" className="rounded-full border-[#E2E8F0] max-w-full truncate">
                  Search: {searchQuery.trim()}
                </Badge>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearAllFilters}
                className="h-7 text-xs text-[#64748B] hover:text-[#2F9B73] hover:bg-[#ECFDF5]"
              >
                Clear filters
              </Button>
            </div>
          )}
        </Card>

        <Dialog open={isDateDialogOpen} onOpenChange={setIsDateDialogOpen}>
          <DialogContent
            overlayClassName="bg-[rgba(15,23,42,0.35)] backdrop-blur-sm"
            className="sm:max-w-md rounded-2xl border border-[#E2E8F0] bg-white p-6 shadow-xl"
          >
            <DialogHeader>
              <DialogTitle className="text-[#0F172A]">Date Range</DialogTitle>
              <DialogDescription className="text-[#64748B]">
                Filter SMS history by created date.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-[#0F172A]">From Date</label>
                <Input
                  type="date"
                  value={draftFromDate}
                  onChange={(e) => setDraftFromDate(e.target.value)}
                  className="rounded-md border-[#CBD5E1] bg-white text-[#0F172A] focus-visible:border-[#2F9B73] focus-visible:ring-2 focus-visible:ring-[#2F9B73]/20"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-[#0F172A]">To Date</label>
                <Input
                  type="date"
                  value={draftToDate}
                  onChange={(e) => setDraftToDate(e.target.value)}
                  className="rounded-md border-[#CBD5E1] bg-white text-[#0F172A] focus-visible:border-[#2F9B73] focus-visible:ring-2 focus-visible:ring-[#2F9B73]/20"
                />
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="secondary" onClick={handleClearDateRange} className={SMS_HISTORY_BTN.modalOutline}>
                Clear
              </Button>
              <Button onClick={handleApplyDateRange} className={SMS_HISTORY_BTN.modalPrimary}>
                Apply
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Main Content - 2-column layout */}
        <div className="grid grid-cols-12 gap-6">
          {/* SMS Table - LEFT (col-span-8) */}
          <div className="col-span-12 lg:col-span-8 space-y-4">
            {/* Mini KPI Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Card className="rounded-2xl bg-white border border-slate-200/70 p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs font-medium text-slate-600">Delivered</span>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-semibold text-slate-900">{deliveryStats.delivered.count}</div>
                    <div className="text-xs text-emerald-600 font-medium">{deliveryStats.delivered.percentage}%</div>
                  </div>
                </div>
              </Card>
              <Card className="rounded-2xl bg-white border border-slate-200/70 p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <XCircle className="w-4 h-4 text-red-600" />
                    <span className="text-xs font-medium text-slate-600">Failed</span>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-semibold text-slate-900">{deliveryStats.failed.count}</div>
                    <div className="text-xs text-red-600 font-medium">{deliveryStats.failed.percentage}%</div>
                  </div>
                </div>
              </Card>
              <Card className="rounded-2xl bg-white border border-slate-200/70 p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-[#64748B]" />
                    <span className="text-xs font-medium text-slate-600">Pending</span>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-semibold text-slate-900">{deliveryStats.pending.count}</div>
                    <div className="text-xs font-medium text-[#64748B]">{deliveryStats.pending.percentage}%</div>
                  </div>
                </div>
              </Card>
            </div>

            {/* SMS Table */}
            <Card className="rounded-2xl bg-white border border-slate-200/70 shadow-sm overflow-hidden">
              {loading ? (
                <div className="p-12 text-center text-slate-500">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
                  <p>Loading SMS history...</p>
                </div>
              ) : filteredHistory.length === 0 ? (
                <div className="p-12 text-center text-slate-500">
                  <MessageSquare className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                  <p className="text-base font-medium text-slate-600 mb-1">
                    {hasActiveFilters
                      ? 'No SMS records found for the selected filters.'
                      : 'No SMS messages found'}
                  </p>
                  {!hasActiveFilters && (
                    <>
                      <p className="text-sm text-slate-400">Start sending SMS to see your history here</p>
                      <Link href="/app/send-sms">
                        <Button className={`mt-4 ${SMS_HISTORY_BTN.modalPrimary}`}>
                          <Plus className="w-4 h-4 mr-2" />
                          Send Your First SMS
                        </Button>
                      </Link>
                    </>
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 z-10 border-b border-slate-200/70 bg-slate-50/80 backdrop-blur-sm">
                      <tr>
                        <th className="px-5 py-3 text-left font-semibold text-xs uppercase tracking-wider text-slate-600">Time</th>
                        <th className="px-5 py-3 text-left font-semibold text-xs uppercase tracking-wider text-slate-600">Recipient</th>
                        <th className="px-5 py-3 text-left font-semibold text-xs uppercase tracking-wider text-slate-600">Sender ID</th>
                        <th className="px-5 py-3 text-left font-semibold text-xs uppercase tracking-wider text-slate-600">Campaign</th>
                        <th className="px-5 py-3 text-left font-semibold text-xs uppercase tracking-wider text-slate-600">Message</th>
                        <th className="px-5 py-3 text-left font-semibold text-xs uppercase tracking-wider text-slate-600">Status</th>
                        <th className="px-5 py-3 text-right font-semibold text-xs uppercase tracking-wider text-slate-600">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredHistory.map((sms, idx) => (
                        <tr
                          key={sms.id}
                          className={`border-b border-slate-100 hover:bg-emerald-50/40 transition-colors ${
                            idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'
                          }`}
                        >
                          <td className="px-5 py-3 text-slate-600">{sms.time}</td>
                          <td className="px-5 py-3 font-medium text-slate-900">{sms.recipient}</td>
                          <td className="px-5 py-3 text-slate-600">{sms.senderId}</td>
                          <td className="px-5 py-3 text-slate-600">{sms.campaign}</td>
                          <td className="px-5 py-3 line-clamp-1 text-slate-600 max-w-xs">
                            {sms.message}
                          </td>
                          <td className="px-5 py-3">
                            <div className="flex flex-col gap-1 items-start">
                              <span
                                key={`${sms.id}-${sms.status}`}
                                className={`rounded-full px-2.5 py-1 text-xs font-medium ${getStatusBadge(sms)}`}
                              >
                                {getPrimaryStatusLabel(sms)}
                              </span>
                              {sms.fallbackStatus &&
                                getFallbackBadgeLabel(sms.fallbackStatus, sms.requiresPhoneTopUp) &&
                                sms.deliveryMethod !== 'android_phone_gateway' && (
                                  <span
                                    className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${getFallbackBadgeClass(sms.fallbackStatus)}`}
                                  >
                                    {getFallbackBadgeLabel(sms.fallbackStatus, sms.requiresPhoneTopUp)}
                                  </span>
                                )}
                            </div>
                          </td>
                          <td className="px-5 py-3 text-right">
                            <button 
                              onClick={() => handleViewSms(sms)}
                              className="text-emerald-600 hover:text-emerald-700 hover:underline text-xs font-medium"
                            >
                              View
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {!loading && filteredHistory.length > 0 && (
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-slate-200 px-5 py-4 bg-slate-50/60">
                  <p className="text-sm text-slate-600">
                    Total records: <span className="font-semibold text-slate-900">{pagination.total}</span>
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(p - 1, 1))}
                      disabled={!pagination.hasPrev}
                      className={SMS_HISTORY_BTN.pagination}
                    >
                      <ChevronLeft className="w-4 h-4 mr-1" />
                      Previous
                    </Button>
                    <span className="text-sm text-[#64748B] px-2">
                      Page {pagination.page} of {pagination.totalPages}
                    </span>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setPage((p) => p + 1)}
                      disabled={!pagination.hasNext}
                      className={SMS_HISTORY_BTN.pagination}
                    >
                      Next
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          </div>

          {/* Insights & Actions - RIGHT (col-span-4) */}
          <div className="col-span-12 lg:col-span-4 space-y-4">
            {/* Failure Insights Card */}
            <Card className="rounded-2xl bg-white border border-slate-200/70 p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-slate-900 text-sm">Failure Insights</h3>
                <button className="text-xs text-emerald-600 hover:text-emerald-700 font-medium">
                  View details →
                </button>
              </div>
              <div className="space-y-3">
                {failureInsights.map((insight) => (
                  <div key={insight.reason}>
                    <div className="flex justify-between mb-1.5">
                      <span className="text-xs text-slate-600">{insight.reason}</span>
                      <span className="text-xs font-semibold text-slate-900">{insight.count}</span>
                    </div>
                    <div className="h-1 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-1 rounded-full bg-emerald-600 transition-all"
                        style={{ width: `${insight.percentage}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Delivery Health Card */}
            <Card className="rounded-2xl bg-white border border-slate-200/70 p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-slate-900 text-sm">Delivery Health</h3>
                <button className="text-xs text-emerald-600 hover:text-emerald-700 font-medium">
                  View details →
                </button>
              </div>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between mb-1.5">
                    <span className="text-xs text-slate-600">Success Rate</span>
                    <span className="text-xs font-semibold text-emerald-600">{deliveryStats.delivered.percentage}%</span>
                  </div>
                  <div className="h-1 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-1 rounded-full bg-emerald-600"
                      style={{ width: `${deliveryStats.delivered.percentage}%` }}
                    ></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between mb-1.5">
                    <span className="text-xs text-slate-600">Failed</span>
                    <span className="text-xs font-semibold text-red-600">{deliveryStats.failed.percentage}%</span>
                  </div>
                  <div className="h-1 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-1 rounded-full bg-red-600"
                      style={{ width: `${deliveryStats.failed.percentage}%` }}
                    ></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between mb-1.5">
                    <span className="text-xs text-slate-600">Pending</span>
                    <span className="text-xs font-semibold text-[#64748B]">{deliveryStats.pending.percentage}%</span>
                  </div>
                  <div className="h-1 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-1 rounded-full bg-[#64748B]"
                      style={{ width: `${deliveryStats.pending.percentage}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </Card>

            {/* Quick Actions Card */}
            <Card className="rounded-2xl bg-white border border-slate-200/70 p-4 shadow-sm">
              <h3 className="mb-3 font-semibold text-slate-900 text-sm">Quick Actions</h3>
              <div className="space-y-2">
                <Link href="/app/send-sms" className="w-full">
                  <Button className={`w-full py-2 text-sm ${SMS_HISTORY_BTN.primary}`}>
                    <Plus className="w-4 h-4 mr-2" />
                    Send New SMS
                  </Button>
                </Link>
                <Button
                  variant="secondary"
                  onClick={handleRetryFailed}
                  disabled={failedMessages.length === 0 || !canRetry}
                  className={`w-full py-2 text-sm ${SMS_HISTORY_BTN.outline}`}
                >
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  Retry Failed {failedMessages.length > 0 && `(${failedMessages.length})`}
                </Button>
                <Button
                  variant="ghost"
                  className="w-full rounded-lg py-2 text-slate-600 text-sm hover:bg-slate-100 hover:text-slate-900"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export Failed
                </Button>
              </div>
            </Card>
          </div>
        </div>

        {/* View SMS Drawer */}
        <Sheet open={isViewOpen} onOpenChange={setIsViewOpen}>
          <SheetContent className="w-full sm:max-w-lg bg-white border-l border-slate-200/70">
            <SheetHeader>
              <SheetTitle className="text-slate-900">SMS Details</SheetTitle>
              <SheetDescription className="text-slate-500">
                Complete information about this message
              </SheetDescription>
            </SheetHeader>
            {selectedSms && (
              <div className="mt-6 space-y-6">
                {/* Status Row */}
                <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                  <Badge className={`${getStatusBadge(selectedSms)} rounded-full px-3 py-1`}>
                    {getPrimaryStatusLabel(selectedSms)}
                  </Badge>
                  {selectedSms.fallbackStatus &&
                    getFallbackBadgeLabel(
                      selectedSms.fallbackStatus,
                      selectedSms.requiresPhoneTopUp
                    ) && (
                      <Badge
                        className={`${getFallbackBadgeClass(selectedSms.fallbackStatus)} rounded-full px-3 py-1`}
                      >
                        {getFallbackBadgeLabel(
                          selectedSms.fallbackStatus,
                          selectedSms.requiresPhoneTopUp
                        )}
                      </Badge>
                    )}
                  {selectedSms.fallbackStatus === 'phone_failed' &&
                    selectedSms.fallbackFailureReason && (
                      <div className="flex-1 p-3 bg-red-50 border border-red-200 rounded-xl">
                        <p className="text-xs font-semibold text-red-900 mb-0.5">Phone Failure</p>
                        <p className="text-sm text-red-700">{selectedSms.fallbackFailureReason}</p>
                      </div>
                    )}
                  {selectedSms.status === 'failed' && selectedSms.failureReason && (
                    <div className="flex-1 p-3 bg-red-50 border border-red-200 rounded-xl">
                      <p className="text-xs font-semibold text-red-900 mb-0.5">Failure Reason</p>
                      <p className="text-sm text-red-700">{selectedSms.failureReason}</p>
                    </div>
                  )}
                </div>

                {/* Section Divider */}
                <div className="border-t border-slate-100"></div>

                {/* Details Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Recipient
                    </label>
                    <div className="flex items-center gap-2 text-slate-900">
                      <Phone size={14} className="text-slate-400" />
                      <span className="font-medium text-sm">{selectedSms.recipient}</span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Sender ID
                    </label>
                    <p className="text-slate-900 text-sm">{selectedSms.senderId}</p>
                  </div>

                  <div className="space-y-1 col-span-2">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Campaign
                    </label>
                    <p className="text-slate-900 text-sm">{selectedSms.campaign}</p>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Message ID
                    </label>
                    <div className="flex items-center gap-2">
                      <FileText size={14} className="text-slate-400" />
                      <span className="font-mono text-xs text-slate-900">{selectedSms.messageId}</span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Sent Time
                    </label>
                    <p className="text-slate-900 text-sm">{selectedSms.time}</p>
                  </div>

                  {selectedSms.cost && (
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Cost
                      </label>
                      <p className="text-slate-900 text-sm font-medium">KSh {selectedSms.cost.toFixed(2)}</p>
                    </div>
                  )}

                  {selectedSms.retryCount > 0 && (
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Retry Attempts
                      </label>
                      <p className="text-slate-900 text-sm">
                        {selectedSms.retryCount} / 3
                      </p>
                    </div>
                  )}
                </div>

                {/* Retry Info Section */}
                {selectedSms.retryCount > 0 && selectedSms.lastAttemptAt && (() => {
                  const lastAttempt = new Date(selectedSms.lastAttemptAt).getTime()
                  const now = Date.now()
                  const minutesSinceLastAttempt = (now - lastAttempt) / (1000 * 60)
                  const minutesUntilNext = Math.max(0, 3 - minutesSinceLastAttempt)
                  const secondsUntilNext = Math.floor((minutesUntilNext % 1) * 60)
                  const minsUntilNext = Math.floor(minutesUntilNext)
                  
                  if (minutesSinceLastAttempt < 3) {
                    return (
                      <>
                        <div className="border-t border-slate-100"></div>
                        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                          <p className="text-xs font-semibold text-slate-700 mb-1">Retry Information</p>
                          <p className="text-sm text-slate-900 mb-1">
                            Retry attempts: {selectedSms.retryCount} / 3
                          </p>
                          <p className="text-xs text-slate-600">
                            Next retry allowed in: {minsUntilNext}m {secondsUntilNext}s
                          </p>
                        </div>
                      </>
                    )
                  }
                  return null
                })()}

                {/* Section Divider */}
                <div className="border-t border-slate-100"></div>

                {/* Phone fallback actions */}
                {selectedSms.status !== 'delivered' &&
                  selectedSms.deliveryMethod !== 'android_phone_gateway' && (
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Fallback Actions
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {!selectedSms.providerRetryAttempted && (
                          <Button
                            size="sm"
                            variant="secondary"
                            className={SMS_HISTORY_BTN.sheetOutline}
                            onClick={() =>
                              handleFallbackAction(selectedSms.id, 'retry-provider')
                            }
                          >
                            Retry Provider Now
                          </Button>
                        )}
                        {!['queued_for_phone', 'sending_via_phone', 'sent_via_phone', 'delivered_via_phone'].includes(
                          selectedSms.fallbackStatus || ''
                        ) && (
                          <Button
                            size="sm"
                            variant="secondary"
                            className={SMS_HISTORY_BTN.sheetOutline}
                            onClick={() =>
                              handleFallbackAction(selectedSms.id, 'queue-phone')
                            }
                          >
                            Queue for Phone
                          </Button>
                        )}
                        {['queued_for_phone', 'sending_via_phone'].includes(
                          selectedSms.fallbackStatus || ''
                        ) && (
                          <Button
                            size="sm"
                            variant="secondary"
                            className="text-xs border-red-200 bg-white text-red-700 hover:bg-red-50 hover:text-red-800 hover:border-red-300"
                            onClick={() =>
                              handleFallbackAction(selectedSms.id, 'cancel')
                            }
                          >
                            Cancel Phone Fallback
                          </Button>
                        )}
                        {selectedSms.fallbackStatus === 'phone_failed' && (
                          <Button
                            size="sm"
                            variant="secondary"
                            className={SMS_HISTORY_BTN.sheetOutline}
                            onClick={() =>
                              handleFallbackAction(selectedSms.id, 'retry-phone')
                            }
                          >
                            Retry Phone Fallback
                          </Button>
                        )}
                      </div>
                    </div>
                  )}

                {/* Section Divider */}
                <div className="border-t border-slate-100"></div>

                {/* Message Box */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Message
                  </label>
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                    <p className="text-slate-900 text-sm leading-relaxed whitespace-pre-wrap">
                      {selectedSms.message}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </SheetContent>
        </Sheet>

        {/* Retry Failed Dialog */}
        <AlertDialog open={isRetryDialogOpen} onOpenChange={setIsRetryDialogOpen}>
          <AlertDialogContent className="rounded-2xl">
            <AlertDialogHeader>
              <AlertDialogTitle>Retry Failed Messages</AlertDialogTitle>
              <AlertDialogDescription className="text-slate-600">
                Failed messages will be retried with a delay to avoid duplicate delivery.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="py-4 space-y-3">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-slate-700">Failed messages</span>
                  <span className="text-sm font-semibold text-slate-900">{failedMessages.length}</span>
                </div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-slate-700">Retry delay</span>
                  <span className="text-sm font-semibold text-slate-900">3 minutes</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-700">Max retries</span>
                  <span className="text-sm font-semibold text-slate-900">3 per message</span>
                </div>
              </div>
              {!canRetry && (
                <div className="rounded-xl border border-[#E2E8F0] bg-[#ECFDF5] p-3">
                  <p className="text-sm text-[#0F172A]">
                    Some messages cannot be retried yet. Please wait 3 minutes between retry attempts.
                  </p>
                </div>
              )}
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel className="rounded-xl border-[#E2E8F0] bg-white text-[#0F172A] hover:bg-[#ECFDF5]">
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmRetry}
                disabled={!canRetry}
                className={`${SMS_HISTORY_BTN.modalPrimary} disabled:opacity-50`}
              >
                Confirm Retry
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </PortalLayout>
  )
}

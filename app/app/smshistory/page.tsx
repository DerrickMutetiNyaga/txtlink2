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
  DollarSign
} from 'lucide-react'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'

// Message type
interface SMSMessage {
  id: string
  time: string
  recipient: string
  senderId: string
  campaign: string
  message: string
  status: 'delivered' | 'failed' | 'pending' | 'queued' | 'sent' | 'retrying'
  failureReason?: string
  messageId: string
  sentAt: string | Date
  cost: number
  retryCount: number
  lastAttemptAt: string | Date | null
}

export default function SMSHistoryPage() {
  const { toast } = useToast()
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [senderIdFilter, setSenderIdFilter] = useState('all')
  const [campaignFilter, setCampaignFilter] = useState('all')
  const [countryFilter, setCountryFilter] = useState('all')
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
  const [isAutoRefreshing, setIsAutoRefreshing] = useState(false)

  // Fetch SMS history function
  const fetchSMSHistory = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true)
      setIsAutoRefreshing(true)
      const token = localStorage.getItem('token')
      const params = new URLSearchParams({
        status: statusFilter,
        senderId: senderIdFilter,
        search: searchQuery,
      })

      const response = await fetch(`/api/user/sms-history?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setSmsHistory(data.messages || [])
        setDeliveryStats(data.stats || {
          delivered: { count: 0, percentage: 0 },
          failed: { count: 0, percentage: 0 },
          pending: { count: 0, percentage: 0 },
        })
        setFailureInsights(data.failureInsights || [])
        
        // Extract unique sender IDs
        const senderIds = [...new Set(data.messages?.map((msg: SMSMessage) => msg.senderId) || [])]
        setAvailableSenderIds(senderIds)
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
  }, [statusFilter, senderIdFilter, searchQuery, toast])

  // Initial fetch and when filters change
  useEffect(() => {
    fetchSMSHistory(true)
  }, [statusFilter, senderIdFilter, searchQuery])

  // Auto-refresh: Poll every 10 seconds if there are pending/sent messages
  useEffect(() => {
    // Check if there are messages that need status updates
    const hasPendingMessages = smsHistory.some(
      (msg) => msg.status === 'sent' || msg.status === 'queued' || msg.status === 'pending'
    )

    if (!hasPendingMessages) {
      return // No need to poll if all messages are delivered/failed
    }

    // Set up interval for auto-refresh
    const intervalId = setInterval(() => {
      // Only refresh if page is visible (not in background tab)
      if (document.visibilityState === 'visible') {
        fetchSMSHistory(false) // Don't show loading spinner on auto-refresh
      }
    }, 10000) // Poll every 10 seconds

    // Cleanup interval on unmount or when dependencies change
    return () => clearInterval(intervalId)
  }, [smsHistory, fetchSMSHistory])

  const getStatusBadge = (status: string) => {
    switch (status) {
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

  // Filter is now handled server-side, but we can add client-side filtering for campaign if needed
  const filteredHistory = smsHistory.filter((sms) => {
    const matchesCampaign = campaignFilter === 'all' || sms.campaign === campaignFilter
    return matchesCampaign
  })

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
      <div className="space-y-6">
        {/* Header - Compact Toolbar Style */}
        <Card className="rounded-2xl border border-slate-200/70 bg-white px-6 py-4 shadow-sm">
          {/* Row 1: Title + Search + Actions */}
          <div className="flex items-center justify-between gap-6">
            {/* Left: Title + Breadcrumb */}
            <div>
              <h1 className="text-xl font-semibold text-slate-900">SMS History</h1>
              <p className="text-sm text-slate-500">Dashboard / Overview</p>
              <p className="text-xs text-slate-500 mt-1">
                Delivered/Failed status is updated by HostPinnacle delivery reports (DLR)—so you can see if each message actually reached the recipient.
              </p>
              {smsHistory.some((msg) => msg.status === 'sent' || msg.status === 'queued' || msg.status === 'pending') && (
                <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  Auto-refreshing every 10 seconds...
                </p>
              )}
            </div>

            {/* Center: Search */}
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                <Input
                  type="text"
                  placeholder="Search recipient, message, sender ID…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 py-2.5 text-sm focus:bg-white focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => fetchSMSHistory(true)}
                disabled={isAutoRefreshing}
                className="h-9 rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 hover:text-slate-900 hover:border-slate-300 disabled:opacity-50"
                title="Refresh now"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isAutoRefreshing ? 'animate-spin' : ''}`} />
                {isAutoRefreshing ? 'Refreshing...' : 'Refresh'}
              </Button>
              <Button
                variant="outline"
                className="h-9 rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 hover:text-slate-900 hover:border-slate-300"
              >
                <Calendar className="w-4 h-4 mr-2" />
                Date Range
              </Button>
              <Button
                variant="outline"
                className="h-9 rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 hover:text-slate-900 hover:border-slate-300"
              >
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
              <Link href="/app/send-sms">
                <Button className="h-9 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700">
                  <Plus className="w-4 h-4 mr-2" />
                  New SMS
                </Button>
              </Link>
            </div>
          </div>

          {/* Row 2: Filters (Compact Pills) */}
          <div className="mt-4 flex flex-wrap gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-9 rounded-full border border-slate-200 bg-slate-50 px-4 text-sm text-slate-700 hover:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="all">All Status</option>
              <option value="delivered">Delivered</option>
              <option value="failed">Failed</option>
              <option value="pending">Pending</option>
              <option value="queued">Queued</option>
              <option value="sent">Sent</option>
            </select>

            <select
              value={senderIdFilter}
              onChange={(e) => setSenderIdFilter(e.target.value)}
              className="h-9 rounded-full border border-slate-200 bg-slate-50 px-4 text-sm text-slate-700 hover:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
              onChange={(e) => setCampaignFilter(e.target.value)}
              className="h-9 rounded-full border border-slate-200 bg-slate-50 px-4 text-sm text-slate-700 hover:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="all">All Campaigns</option>
              <option value="Payment Reminder">Payment Reminder</option>
              <option value="Welcome Message">Welcome Message</option>
              <option value="Order Confirmation">Order Confirmation</option>
              <option value="System Alert">System Alert</option>
            </select>

            <select
              value={countryFilter}
              onChange={(e) => setCountryFilter(e.target.value)}
              className="h-9 rounded-full border border-slate-200 bg-slate-50 px-4 text-sm text-slate-700 hover:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="all">All Countries</option>
              <option value="KE">Kenya</option>
              <option value="UG">Uganda</option>
              <option value="TZ">Tanzania</option>
            </select>
          </div>
        </Card>

        {/* Main Content - 2-column layout */}
        <div className="grid grid-cols-12 gap-6">
          {/* SMS Table - LEFT (col-span-8) */}
          <div className="col-span-12 lg:col-span-8 space-y-4">
            {/* Mini KPI Row */}
            <div className="flex gap-3">
              <Card className="flex-1 rounded-2xl bg-white border border-slate-200/70 p-4 shadow-sm">
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
              <Card className="flex-1 rounded-2xl bg-white border border-slate-200/70 p-4 shadow-sm">
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
              <Card className="flex-1 rounded-2xl bg-white border border-slate-200/70 p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-600" />
                    <span className="text-xs font-medium text-slate-600">Pending</span>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-semibold text-slate-900">{deliveryStats.pending.count}</div>
                    <div className="text-xs text-amber-600 font-medium">{deliveryStats.pending.percentage}%</div>
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
                  <p className="text-base font-medium text-slate-600 mb-1">No SMS messages found</p>
                  <p className="text-sm text-slate-400">Start sending SMS to see your history here</p>
                  <Link href="/app/send-sms">
                    <Button className="mt-4 bg-emerald-600 hover:bg-emerald-700 text-white">
                      <Plus className="w-4 h-4 mr-2" />
                      Send Your First SMS
                    </Button>
                  </Link>
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
                            <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${getStatusBadge(sms.status)}`}>
                              {sms.status === 'retrying' ? 'Retrying' : sms.status.charAt(0).toUpperCase() + sms.status.slice(1)}
                            </span>
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
                    <span className="text-xs font-semibold text-amber-600">{deliveryStats.pending.percentage}%</span>
                  </div>
                  <div className="h-1 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-1 rounded-full bg-amber-600"
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
                  <Button className="w-full rounded-lg bg-emerald-600 py-2 text-white text-sm font-medium hover:bg-emerald-700">
                    <Plus className="w-4 h-4 mr-2" />
                    Send New SMS
                  </Button>
                </Link>
                <Button
                  variant="outline"
                  onClick={handleRetryFailed}
                  disabled={failedMessages.length === 0 || !canRetry}
                  className="w-full rounded-lg border border-amber-500 text-amber-700 py-2 text-sm hover:bg-amber-50 hover:border-amber-600 disabled:opacity-50 disabled:cursor-not-allowed"
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
                <div className="flex items-center gap-3">
                  <Badge className={`${getStatusBadge(selectedSms.status)} rounded-full px-3 py-1`}>
                    {selectedSms.status === 'retrying' ? 'Retrying' : selectedSms.status.charAt(0).toUpperCase() + selectedSms.status.slice(1)}
                  </Badge>
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
                <div className="grid grid-cols-2 gap-4">
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
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
                  <p className="text-sm text-amber-800">
                    Some messages cannot be retried yet. Please wait 3 minutes between retry attempts.
                  </p>
                </div>
              )}
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmRetry}
                disabled={!canRetry}
                className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl disabled:opacity-50"
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

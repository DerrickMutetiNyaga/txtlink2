'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  FileText,
  RefreshCw,
  Search,
  Download,
  Eye,
  Copy,
  Filter,
  CheckCircle2,
  XCircle,
  AlertTriangle,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

// Security-sensitive actions that should be highlighted
const SECURITY_ACTIONS = [
  'SUSPEND_ACCOUNT',
  'CHANGE_ROLE',
  'API_KEY_ROTATED',
  'DELETE_USER',
  'CHANGE_PASSWORD',
  'REVOKE_ACCESS',
]

export default function SuperAdminAudit() {
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [type, setType] = useState<'audit' | 'webhook'>('audit')
  const [selectedLog, setSelectedLog] = useState<any>(null)
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    action: '',
    resource: '',
    userId: '',
    search: '',
  })
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const limit = 50

  useEffect(() => {
    fetchLogs()
  }, [type, page])

  useEffect(() => {
    // Reset page when switching tabs
    setPage(1)
  }, [type])

  const fetchLogs = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('token')
      const params = new URLSearchParams()
      params.append('type', type)
      params.append('limit', limit.toString())
      params.append('skip', ((page - 1) * limit).toString())

      if (type === 'audit') {
        if (filters.startDate) params.append('startDate', filters.startDate)
        if (filters.endDate) params.append('endDate', filters.endDate)
        if (filters.action) params.append('action', filters.action)
        if (filters.resource) params.append('resource', filters.resource)
        if (filters.userId) params.append('userId', filters.userId)
        if (filters.search) params.append('search', filters.search)
      } else {
        if (filters.search) params.append('transactionId', filters.search)
      }

      const response = await fetch(`/api/super-admin/audit?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (response.ok) {
        const result = await response.json()
        setLogs(result.logs || [])
        setTotal(result.total || 0)
      }
    } catch (error) {
      console.error('Error fetching audit logs:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleFilterChange = (key: string, value: string) => {
    setFilters({ ...filters, [key]: value })
    setPage(1)
  }

  const applyFilters = () => {
    setPage(1)
    fetchLogs()
  }

  const resetFilters = () => {
    setFilters({
      startDate: '',
      endDate: '',
      action: '',
      resource: '',
      userId: '',
      search: '',
    })
    setPage(1)
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const getActionBadgeVariant = (action: string) => {
    if (SECURITY_ACTIONS.includes(action)) {
      return 'destructive'
    }
    return 'secondary'
  }

  const formatTime = (date: string) => {
    return formatDistanceToNow(new Date(date), { addSuffix: true })
  }

  const getChangesDiff = (log: any) => {
    if (!log.changes) return null
    // Try to extract before/after from changes object
    if (log.changes.before && log.changes.after) {
      return { before: log.changes.before, after: log.changes.after }
    }
    // If changes is a flat object, try to infer before/after
    return log.changes
  }

  const exportCSV = () => {
    // TODO: Implement CSV export
    console.log('Export CSV')
  }

  const auditLogCount = type === 'audit' ? total : 0
  const webhookLogCount = type === 'webhook' ? total : 0

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold text-[#020617]">Audit & Logs</h1>
            <p className="text-[#64748B] mt-1">System activity and webhook logs</p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={fetchLogs}
              variant="secondary"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </Button>
            <Button
              onClick={exportCSV}
              variant="secondary"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs
          value={type}
          onValueChange={(v) => {
            setType(v as 'audit' | 'webhook')
            setPage(1)
          }}
        >
          <TabsList className="bg-white border border-slate-200 p-0 h-auto gap-0">
            <TabsTrigger
              value="audit"
              className="px-6 py-3 text-sm font-medium text-slate-600 data-[state=active]:text-slate-900 data-[state=active]:border-b-2 data-[state=active]:border-emerald-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=inactive]:hover:text-slate-900 rounded-none border-b-2 border-transparent transition-colors"
            >
              Audit Logs
              {auditLogCount > 0 && (
                <Badge variant="secondary" className="ml-2 bg-slate-100 text-slate-600 font-semibold">
                  {auditLogCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="webhook"
              className="px-6 py-3 text-sm font-medium text-slate-600 data-[state=active]:text-slate-900 data-[state=active]:border-b-2 data-[state=active]:border-emerald-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=inactive]:hover:text-slate-900 rounded-none border-b-2 border-transparent transition-colors"
            >
              Webhook Logs
              {webhookLogCount > 0 && (
                <Badge variant="secondary" className="ml-2 bg-slate-100 text-slate-600 font-semibold">
                  {webhookLogCount}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="audit" className="mt-6">
            {/* Filters */}
            <Card className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-4 border-b border-slate-200">
                  <Filter className="w-5 h-5 text-slate-600" />
                  <h2 className="text-lg font-semibold text-slate-900">Filters</h2>
                </div>
                <div className="grid md:grid-cols-3 lg:grid-cols-6 gap-4">
                  <div>
                    <label className="text-sm font-medium text-slate-900 mb-2 block">
                      Start Date
                    </label>
                    <Input
                      type="date"
                      value={filters.startDate}
                      onChange={(e) => handleFilterChange('startDate', e.target.value)}
                      className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-900 mb-2 block">
                      End Date
                    </label>
                    <Input
                      type="date"
                      value={filters.endDate}
                      onChange={(e) => handleFilterChange('endDate', e.target.value)}
                      className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-900 mb-2 block">
                      Action Type
                    </label>
                    <Select
                      value={filters.action || 'all'}
                      onValueChange={(value) =>
                        handleFilterChange('action', value === 'all' ? '' : value)
                      }
                    >
                      <SelectTrigger className="!w-full !rounded-xl !border !border-slate-200 !bg-white !px-4 !py-2.5 !text-slate-900 !focus:outline-none !focus:ring-2 !focus:ring-emerald-500 !focus:ring-offset-0 !focus:border-emerald-500 !transition [&_svg]:!text-slate-400">
                        <SelectValue placeholder="All" />
                      </SelectTrigger>
                      <SelectContent className="bg-white border border-slate-200 rounded-xl shadow-lg">
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="UPDATE_ACCOUNT">UPDATE_ACCOUNT</SelectItem>
                        <SelectItem value="UPDATE_USER_PRICING">UPDATE_USER_PRICING</SelectItem>
                        <SelectItem value="SUSPEND_ACCOUNT">SUSPEND_ACCOUNT</SelectItem>
                        <SelectItem value="CHANGE_ROLE">CHANGE_ROLE</SelectItem>
                        <SelectItem value="API_KEY_ROTATED">API_KEY_ROTATED</SelectItem>
                        <SelectItem value="CREATE_SENDER_ID">CREATE_SENDER_ID</SelectItem>
                        <SelectItem value="DELETE_SENDER_ID">DELETE_SENDER_ID</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-900 mb-2 block">
                      Resource Type
                    </label>
                    <Select
                      value={filters.resource || 'all'}
                      onValueChange={(value) =>
                        handleFilterChange('resource', value === 'all' ? '' : value)
                      }
                    >
                      <SelectTrigger className="!w-full !rounded-xl !border !border-slate-200 !bg-white !px-4 !py-2.5 !text-slate-900 !focus:outline-none !focus:ring-2 !focus:ring-emerald-500 !focus:ring-offset-0 !focus:border-emerald-500 !transition [&_svg]:!text-slate-400">
                        <SelectValue placeholder="All" />
                      </SelectTrigger>
                      <SelectContent className="bg-white border border-slate-200 rounded-xl shadow-lg">
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="user">user</SelectItem>
                        <SelectItem value="pricingRule">pricingRule</SelectItem>
                        <SelectItem value="senderId">senderId</SelectItem>
                        <SelectItem value="account">account</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-900 mb-2 block">User</label>
                    <Input
                      value={filters.userId}
                      onChange={(e) => handleFilterChange('userId', e.target.value)}
                      placeholder="Email or ID"
                      className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-900 mb-2 block">Search</label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input
                        value={filters.search}
                        onChange={(e) => handleFilterChange('search', e.target.value)}
                        placeholder="Resource ID, email..."
                        className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 pl-10 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition"
                      />
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 pt-4 border-t border-slate-200">
                  <Button
                    onClick={applyFilters}
                    variant="primary"
                  >
                    Apply Filters
                  </Button>
                  <Button
                    onClick={resetFilters}
                    variant="secondary"
                  >
                    Reset
                  </Button>
                </div>
              </div>
            </Card>

            {/* Info Text */}
            <p className="text-sm text-[#64748B] mt-2">
              Audit logs track admin actions and system changes. Webhook logs track provider
              callbacks.
            </p>

        {/* Logs Table */}
            <Card className="bg-white border-[#E5E7EB] shadow-sm rounded-lg">
              <div className="p-6">
          {loading ? (
            <div className="text-center py-12">
                    <RefreshCw className="w-8 h-8 animate-spin text-[#64748B] mx-auto mb-4" />
                    <p className="text-[#64748B]">Loading logs...</p>
            </div>
          ) : (
                  <>
            <div className="overflow-x-auto">
              <table className="w-full">
                        <thead className="sticky top-0 bg-white">
                          <tr className="border-b border-[#E5E7EB]">
                            <th className="text-left py-3 px-4 text-sm font-semibold text-[#020617]">
                              Action
                            </th>
                            <th className="text-left py-3 px-4 text-sm font-semibold text-[#020617]">
                              Resource
                            </th>
                            <th className="text-left py-3 px-4 text-sm font-semibold text-[#020617]">
                              Actor
                            </th>
                            <th className="text-left py-3 px-4 text-sm font-semibold text-[#020617]">
                              Time
                            </th>
                            <th className="text-left py-3 px-4 text-sm font-semibold text-[#020617]">
                              IP
                            </th>
                            <th className="text-right py-3 px-4 text-sm font-semibold text-[#020617]">
                              Details
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {logs.length > 0 ? (
                            logs.map((log: any) => (
                              <tr
                                key={log._id}
                                className="border-b border-[#E5E7EB] hover:bg-slate-50 transition-colors"
                              >
                                <td className="py-3 px-4">
                                  <Badge
                                    variant={getActionBadgeVariant(log.action)}
                                    className={
                                      SECURITY_ACTIONS.includes(log.action)
                                        ? 'bg-[#DC2626]/10 text-[#DC2626] border-[#DC2626]/20'
                                        : 'bg-[#F1F5F9] text-[#020617] border-[#E5E7EB]'
                                    }
                                  >
                                    {log.action}
                                  </Badge>
                                </td>
                                <td className="py-3 px-4">
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm text-[#020617]">{log.resource}</span>
                                    {log.resourceId && (
                                      <div className="flex items-center gap-1">
                                        <span className="text-xs font-mono text-[#64748B]">
                                          {log.resourceId}
                                        </span>
                                        <button
                                          onClick={() => copyToClipboard(log.resourceId)}
                                          className="p-1 hover:bg-slate-100 rounded"
                                          title="Copy ID"
                                        >
                                          <Copy className="w-3 h-3 text-[#64748B]" />
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                </td>
                                <td className="py-3 px-4">
                                  <span className="text-sm text-[#020617]">{log.userEmail}</span>
                                </td>
                                <td className="py-3 px-4">
                                  <div
                                    className="text-sm text-[#64748B]"
                                    title={new Date(log.createdAt).toLocaleString()}
                                  >
                                    {formatTime(log.createdAt)}
                                  </div>
                                </td>
                                <td className="py-3 px-4">
                                  {log.ipAddress ? (
                                    <span className="text-xs font-mono text-[#64748B]">
                                      {log.ipAddress}
                                    </span>
                                  ) : (
                                    <span className="text-xs text-[#64748B]">-</span>
                                  )}
                                </td>
                                <td className="py-3 px-4 text-right">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setSelectedLog(log)}
                                    className="text-[#64748B] hover:text-[#020617]"
                                  >
                                    <Eye className="w-4 h-4" />
                                  </Button>
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={6} className="py-8 text-center text-[#64748B]">
                                No audit logs found
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* Pagination */}
                    {total > limit && (
                      <div className="flex items-center justify-between mt-6 pt-4 border-t border-[#E5E7EB]">
                        <div className="text-sm text-[#64748B]">
                          Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of{' '}
                          {total} logs
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPage(page - 1)}
                            disabled={page === 1}
                            className="border-[#E5E7EB]"
                          >
                            Previous
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPage(page + 1)}
                            disabled={page * limit >= total}
                            className="border-[#E5E7EB]"
                          >
                            Next
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="webhook" className="mt-6">
            {/* Webhook Filters */}
            <Card className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-4 border-b border-slate-200">
                  <Filter className="w-5 h-5 text-slate-600" />
                  <h2 className="text-lg font-semibold text-slate-900">Filters</h2>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-slate-900 mb-2 block">
                      Transaction ID
                    </label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input
                        value={filters.search}
                        onChange={(e) => handleFilterChange('search', e.target.value)}
                        placeholder="Search by transaction ID..."
                        className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 pl-10 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition"
                      />
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 pt-4 border-t border-slate-200">
                  <Button
                    onClick={applyFilters}
                    variant="primary"
                  >
                    Apply Filters
                  </Button>
                  <Button
                    onClick={resetFilters}
                    variant="secondary"
                  >
                    Reset
                  </Button>
                </div>
              </div>
            </Card>

            {/* Webhook Logs Table */}
            <Card className="bg-white border-[#E5E7EB] shadow-sm rounded-lg">
              <div className="p-6">
                {loading ? (
                  <div className="text-center py-12">
                    <RefreshCw className="w-8 h-8 animate-spin text-[#64748B] mx-auto mb-4" />
                    <p className="text-[#64748B]">Loading logs...</p>
                  </div>
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="sticky top-0 bg-white">
                          <tr className="border-b border-[#E5E7EB]">
                            <th className="text-left py-3 px-4 text-sm font-semibold text-[#020617]">
                              Transaction ID
                            </th>
                            <th className="text-left py-3 px-4 text-sm font-semibold text-[#020617]">
                              Provider
                            </th>
                            <th className="text-left py-3 px-4 text-sm font-semibold text-[#020617]">
                              Event Type
                            </th>
                            <th className="text-left py-3 px-4 text-sm font-semibold text-[#020617]">
                              Status
                            </th>
                            <th className="text-left py-3 px-4 text-sm font-semibold text-[#020617]">
                              Response Code
                            </th>
                            <th className="text-left py-3 px-4 text-sm font-semibold text-[#020617]">
                              Time
                            </th>
                            <th className="text-right py-3 px-4 text-sm font-semibold text-[#020617]">
                              Details
                            </th>
                  </tr>
                </thead>
                <tbody>
                          {logs.length > 0 ? (
                            logs.map((log: any) => (
                              <tr
                                key={log._id}
                                className="border-b border-[#E5E7EB] hover:bg-slate-50 transition-colors"
                              >
                          <td className="py-3 px-4">
                                  {log.transactionId ? (
                                    <div className="flex items-center gap-1">
                                      <span className="text-xs font-mono text-[#020617]">
                                        {log.transactionId}
                                      </span>
                                      <button
                                        onClick={() => copyToClipboard(log.transactionId)}
                                        className="p-1 hover:bg-slate-100 rounded"
                                        title="Copy ID"
                                      >
                                        <Copy className="w-3 h-3 text-[#64748B]" />
                                      </button>
                                    </div>
                                  ) : (
                                    <span className="text-xs text-[#64748B]">-</span>
                                  )}
                          </td>
                                <td className="py-3 px-4">
                                  <span className="text-sm text-[#020617]">
                                    {log.provider || 'HostPinnacle'}
                                  </span>
                          </td>
                                <td className="py-3 px-4">
                                  <span className="text-sm text-[#020617]">{log.eventType}</span>
                          </td>
                          <td className="py-3 px-4">
                            {log.processed ? (
                                    <Badge className="bg-[#16A34A]/10 text-[#16A34A] border-[#16A34A]/20">
                                      <CheckCircle2 className="w-3 h-3 mr-1" />
                                      Success
                                    </Badge>
                                  ) : (
                                    <Badge className="bg-[#DC2626]/10 text-[#DC2626] border-[#DC2626]/20">
                                      <XCircle className="w-3 h-3 mr-1" />
                                      Failed
                                    </Badge>
                                  )}
                                </td>
                                <td className="py-3 px-4">
                                  {log.error ? (
                                    <span className="text-xs text-[#DC2626]">{log.error}</span>
                                  ) : (
                                    <span className="text-xs text-[#64748B]">-</span>
                            )}
                          </td>
                                <td className="py-3 px-4">
                                  <div
                                    className="text-sm text-[#64748B]"
                                    title={new Date(log.createdAt).toLocaleString()}
                                  >
                                    {formatTime(log.createdAt)}
                                  </div>
                                </td>
                                <td className="py-3 px-4 text-right">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setSelectedLog(log)}
                                    className="text-[#64748B] hover:text-[#020617]"
                                  >
                                    <Eye className="w-4 h-4" />
                                  </Button>
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={7} className="py-8 text-center text-[#64748B]">
                                No webhook logs found
                          </td>
                            </tr>
                      )}
                </tbody>
              </table>
            </div>

                    {/* Pagination */}
                    {total > limit && (
                      <div className="flex items-center justify-between mt-6 pt-4 border-t border-[#E5E7EB]">
                        <div className="text-sm text-[#64748B]">
                          Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of{' '}
                          {total} logs
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPage(page - 1)}
                            disabled={page === 1}
                            className="border-[#E5E7EB]"
                          >
                            Previous
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPage(page + 1)}
                            disabled={page * limit >= total}
                            className="border-[#E5E7EB]"
                          >
                            Next
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
        </Card>
          </TabsContent>
        </Tabs>

        {/* Details Drawer */}
        <Sheet open={!!selectedLog} onOpenChange={(open) => !open && setSelectedLog(null)}>
          <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
            <SheetHeader>
              <SheetTitle className="text-[#020617]">
                {type === 'audit' ? 'Audit Log Details' : 'Webhook Log Details'}
              </SheetTitle>
              <SheetDescription className="text-[#64748B]">
                {type === 'audit'
                  ? 'View detailed information about this audit log entry'
                  : 'View detailed information about this webhook log entry'}
              </SheetDescription>
            </SheetHeader>

            {selectedLog && (
              <div className="mt-6 space-y-6">
                {type === 'audit' ? (
                  <>
                    {/* Action */}
                    <div>
                      <h3 className="text-sm font-semibold text-[#020617] mb-2">Action</h3>
                      <Badge
                        variant={getActionBadgeVariant(selectedLog.action)}
                        className={
                          SECURITY_ACTIONS.includes(selectedLog.action)
                            ? 'bg-[#DC2626]/10 text-[#DC2626] border-[#DC2626]/20'
                            : 'bg-[#F1F5F9] text-[#020617] border-[#E5E7EB]'
                        }
                      >
                        {selectedLog.action}
                      </Badge>
                    </div>

                    {/* Actor */}
                    <div>
                      <h3 className="text-sm font-semibold text-[#020617] mb-2">Actor</h3>
                      <div className="space-y-1">
                        <p className="text-sm text-[#020617]">
                          {selectedLog.userEmail || 'Unknown'}
                        </p>
                        {selectedLog.userId && (
                          <p className="text-xs text-[#64748B]">User ID: {selectedLog.userId}</p>
                        )}
                      </div>
                    </div>

                    {/* Timestamp */}
                    <div>
                      <h3 className="text-sm font-semibold text-[#020617] mb-2">Timestamp</h3>
                      <p className="text-sm text-[#020617]">
                        {new Date(selectedLog.createdAt).toLocaleString()}
                      </p>
                      <p className="text-xs text-[#64748B] mt-1">
                        {formatTime(selectedLog.createdAt)}
                      </p>
                    </div>

                    {/* Resource */}
                    <div>
                      <h3 className="text-sm font-semibold text-[#020617] mb-2">Resource</h3>
                      <div className="space-y-1">
                        <p className="text-sm text-[#020617]">
                          Type: <span className="font-mono">{selectedLog.resource}</span>
                        </p>
                        {selectedLog.resourceId && (
                          <div className="flex items-center gap-2">
                            <p className="text-sm text-[#020617]">
                              ID: <span className="font-mono text-xs">{selectedLog.resourceId}</span>
                            </p>
                            <button
                              onClick={() => copyToClipboard(selectedLog.resourceId)}
                              className="p-1 hover:bg-slate-100 rounded"
                              title="Copy ID"
                            >
                              <Copy className="w-3 h-3 text-[#64748B]" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* IP Address */}
                    {selectedLog.ipAddress && (
                      <div>
                        <h3 className="text-sm font-semibold text-[#020617] mb-2">IP Address</h3>
                        <p className="text-sm font-mono text-[#020617]">
                          {selectedLog.ipAddress}
                        </p>
                      </div>
                    )}

                    {/* Changes / Before vs After */}
                    <div>
                      <h3 className="text-sm font-semibold text-[#020617] mb-2">Changes</h3>
                      {(() => {
                        const diff = getChangesDiff(selectedLog)
                        if (!diff) {
                          return (
                            <p className="text-sm text-[#64748B] italic">
                              No changes captured
                            </p>
                          )
                        }

                        if (diff.before && diff.after) {
                          return (
                            <div className="space-y-4">
                              <div>
                                <h4 className="text-xs font-semibold text-[#DC2626] mb-2">Before</h4>
                                <pre className="text-xs bg-[#F1F5F9] p-3 rounded border border-[#E5E7EB] overflow-x-auto">
                                  {JSON.stringify(diff.before, null, 2)}
                                </pre>
                              </div>
                              <div>
                                <h4 className="text-xs font-semibold text-[#16A34A] mb-2">After</h4>
                                <pre className="text-xs bg-[#F1F5F9] p-3 rounded border border-[#E5E7EB] overflow-x-auto">
                                  {JSON.stringify(diff.after, null, 2)}
                                </pre>
                              </div>
                            </div>
                          )
                        }

                        return (
                          <pre className="text-xs bg-[#F1F5F9] p-3 rounded border border-[#E5E7EB] overflow-x-auto">
                            {JSON.stringify(diff, null, 2)}
                          </pre>
                        )
                      })()}
                    </div>

                    {/* Metadata */}
                    {selectedLog.metadata && (
                      <div>
                        <h3 className="text-sm font-semibold text-[#020617] mb-2">Metadata</h3>
                        <pre className="text-xs bg-[#F1F5F9] p-3 rounded border border-[#E5E7EB] overflow-x-auto">
                          {JSON.stringify(selectedLog.metadata, null, 2)}
                        </pre>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    {/* Transaction ID */}
                    {selectedLog.transactionId && (
                      <div>
                        <h3 className="text-sm font-semibold text-[#020617] mb-2">
                          Transaction ID
                        </h3>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-mono text-[#020617]">
                            {selectedLog.transactionId}
                          </p>
                          <button
                            onClick={() => copyToClipboard(selectedLog.transactionId)}
                            className="p-1 hover:bg-slate-100 rounded"
                            title="Copy ID"
                          >
                            <Copy className="w-3 h-3 text-[#64748B]" />
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Provider */}
                    <div>
                      <h3 className="text-sm font-semibold text-[#020617] mb-2">Provider</h3>
                      <p className="text-sm text-[#020617]">
                        {selectedLog.provider || 'HostPinnacle'}
                      </p>
                    </div>

                    {/* Event Type */}
                    <div>
                      <h3 className="text-sm font-semibold text-[#020617] mb-2">Event Type</h3>
                      <p className="text-sm text-[#020617]">{selectedLog.eventType}</p>
                    </div>

                    {/* Status */}
                    <div>
                      <h3 className="text-sm font-semibold text-[#020617] mb-2">Status</h3>
                      {selectedLog.processed ? (
                        <Badge className="bg-[#16A34A]/10 text-[#16A34A] border-[#16A34A]/20">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Processed
                        </Badge>
                      ) : (
                        <Badge className="bg-[#DC2626]/10 text-[#DC2626] border-[#DC2626]/20">
                          <XCircle className="w-3 h-3 mr-1" />
                          Failed
                        </Badge>
                      )}
                    </div>

                    {/* Error */}
                    {selectedLog.error && (
                      <div>
                        <h3 className="text-sm font-semibold text-[#020617] mb-2">Error</h3>
                        <p className="text-sm text-[#DC2626]">{selectedLog.error}</p>
                      </div>
                    )}

                    {/* Timestamp */}
                    <div>
                      <h3 className="text-sm font-semibold text-[#020617] mb-2">Timestamp</h3>
                      <p className="text-sm text-[#020617]">
                        {new Date(selectedLog.createdAt).toLocaleString()}
                      </p>
                      <p className="text-xs text-[#64748B] mt-1">
                        {formatTime(selectedLog.createdAt)}
                      </p>
                    </div>

                    {/* Payload Preview */}
                    {selectedLog.payload && (
                      <div>
                        <h3 className="text-sm font-semibold text-[#020617] mb-2">Payload</h3>
                        <div className="space-y-2">
                          <p className="text-xs text-[#64748B]">Preview:</p>
                          <pre className="text-xs bg-[#F1F5F9] p-3 rounded border border-[#E5E7EB] overflow-x-auto max-h-64">
                            {JSON.stringify(selectedLog.payload, null, 2)}
                          </pre>
                          <button
                            onClick={() => {
                              const blob = new Blob([JSON.stringify(selectedLog.payload, null, 2)], {
                                type: 'application/json',
                              })
                              const url = URL.createObjectURL(blob)
                              const a = document.createElement('a')
                              a.href = url
                              a.download = `webhook-payload-${selectedLog._id}.json`
                              a.click()
                            }}
                            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl shadow-sm text-slate-700 hover:bg-slate-100 hover:text-slate-900 active:scale-95 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 transition-all duration-200"
                          >
                            <Download className="w-4 h-4 text-slate-500" />
                            Download Raw Payload
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </SheetContent>
        </Sheet>
      </div>
    </div>
  )
}

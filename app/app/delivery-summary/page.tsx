'use client'

import { PortalLayout } from '@/components/portal-layout'
import { Card } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import {
  Search,
  RefreshCw,
  Archive,
  FileSpreadsheet,
} from 'lucide-react'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

interface DeliverySummaryRow {
  groupByLabel: string
  totalRequested: number
  totalDelivered: number
  pending: number
  totalFailed: number
  notSent: number
  others: number
  refund: number
}

const fieldClass =
  'w-full h-11 min-h-[44px] px-4 border border-[#CBD5E1] rounded-xl bg-white text-[#0F172A] text-sm focus:outline-none focus:ring-2 focus:ring-[#2F9B73]/15 focus:border-[#2F9B73]'

const cardClass =
  'rounded-[18px] border border-[#E2E8F0] bg-white p-4 sm:p-6 shadow-sm w-full max-w-full min-w-0'

const primaryBtnClass =
  'inline-flex items-center justify-center gap-2 min-h-[44px] h-11 px-4 rounded-xl border-0 bg-[#2F9B73] text-white font-medium shadow-sm hover:bg-[#278764] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2F9B73]/15 disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto'

const secondaryBtnClass =
  'inline-flex items-center justify-center gap-2 min-h-[44px] h-11 px-4 rounded-xl border border-[#DDE5EC] bg-white text-[#0F172A] font-medium shadow-sm hover:bg-[#F8FAFC] hover:border-[#CBD5E1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2F9B73]/15 disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto'

const softGreenBtnClass =
  'inline-flex items-center justify-center gap-2 min-h-[44px] h-11 px-4 rounded-xl border border-[#2F9B73]/25 bg-[#ECFDF5] text-[#047857] font-medium shadow-sm hover:bg-[#ECFDF5] hover:border-[#2F9B73]/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2F9B73]/15 disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto'

const groupByOptions: { id: 'summary' | 'date' | 'senderId'; label: string }[] = [
  { id: 'summary', label: 'Summary' },
  { id: 'date', label: 'Date' },
  { id: 'senderId', label: 'Sender IDs' },
]

function groupByCardTitle(groupBy: 'summary' | 'date' | 'senderId', label: string) {
  if (groupBy === 'summary') return 'Summary'
  if (groupBy === 'date') return label || 'Date'
  return label || 'Sender ID'
}

function StatRow({
  label,
  value,
  tone = 'default',
}: {
  label: string
  value: number
  tone?: 'default' | 'success' | 'warning' | 'danger' | 'muted' | 'blue'
}) {
  const valueClass = {
    default: 'text-[#0F172A] font-medium',
    success: 'text-[#047857] font-semibold',
    warning: 'text-[#475569] font-medium',
    danger: 'text-[#EF4444] font-semibold',
    muted: 'text-[#64748B] font-medium',
    blue: 'text-[#2563EB] font-medium',
  }[tone]

  return (
    <div className="flex items-center justify-between gap-3 py-2 border-b border-[#E2E8F0] last:border-0 min-w-0">
      <span className="text-sm text-[#64748B] break-words min-w-0">{label}</span>
      <span className={cn('text-sm shrink-0 tabular-nums', valueClass)}>{value}</span>
    </div>
  )
}

function SummaryMobileCard({
  row,
  groupBy,
  index,
}: {
  row: DeliverySummaryRow
  groupBy: 'summary' | 'date' | 'senderId'
  index: number
}) {
  const title = groupByCardTitle(groupBy, row.groupByLabel)

  return (
    <div className="rounded-2xl border border-[#E2E8F0] bg-white p-4 mb-3 last:mb-0 min-w-0">
      <div className="flex items-start justify-between gap-2 mb-3 min-w-0">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-[#64748B]">
            {groupBy === 'summary' ? 'Group' : groupBy === 'date' ? 'Date' : 'Sender ID'}
          </p>
          <h3 className="text-base font-semibold text-[#0F172A] break-words">{title}</h3>
        </div>
        <span className="shrink-0 text-xs font-medium text-[#64748B] bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg px-2 py-1">
          #{index + 1}
        </span>
      </div>
      <div className="rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] px-3 py-1">
        <StatRow label="Total Requested" value={row.totalRequested} />
        <StatRow label="Total Delivered" value={row.totalDelivered} tone="success" />
        <StatRow label="Pending" value={row.pending} tone="warning" />
        <StatRow label="Total Failed" value={row.totalFailed} tone="danger" />
        <StatRow label="Not Sent" value={row.notSent} tone="muted" />
        <StatRow label="Others" value={row.others} tone="muted" />
        <StatRow label="Refund" value={row.refund} tone="blue" />
      </div>
    </div>
  )
}

export default function DeliverySummaryPage() {
  const { toast } = useToast()
  const [rows, setRows] = useState<DeliverySummaryRow[]>([])
  const [availableSenderIds, setAvailableSenderIds] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [senderName, setSenderName] = useState('all')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [groupBy, setGroupBy] = useState<'summary' | 'date' | 'senderId'>('summary')

  const fetchSummary = useCallback(async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('token')
      const params = new URLSearchParams()
      params.set('groupBy', groupBy)
      if (senderName !== 'all') params.set('senderName', senderName)
      if (fromDate) params.set('fromDate', fromDate)
      if (toDate) params.set('toDate', toDate)

      const response = await fetch(`/api/user/delivery-summary?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        throw new Error(err.error || 'Failed to load delivery summary')
      }
      const data = await response.json()
      setRows(data.rows || [])
      setAvailableSenderIds(data.availableSenderIds || [])
    } catch (e: any) {
      toast({
        title: 'Error',
        description: e.message || 'Failed to load delivery summary',
        variant: 'destructive',
      })
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [groupBy, senderName, fromDate, toDate, toast])

  useEffect(() => {
    fetchSummary()
  }, [fetchSummary])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    fetchSummary()
  }

  const handleReset = () => {
    setSenderName('all')
    setFromDate('')
    setToDate('')
    setGroupBy('summary')
  }

  const handleExport = () => {
    if (rows.length === 0) {
      toast({
        title: 'No data',
        description: 'No rows to export.',
        variant: 'destructive',
      })
      return
    }
    const headers = ['Group By', 'Total Requested', 'Total Delivered', 'Pending', 'Total Failed', 'Not Sent', 'Others', 'Refund']
    const csvRows = [
      headers.join(','),
      ...rows.map((r) =>
        [
          `"${String(r.groupByLabel).replace(/"/g, '""')}"`,
          r.totalRequested,
          r.totalDelivered,
          r.pending,
          r.totalFailed,
          r.notSent,
          r.others,
          r.refund,
        ].join(',')
      ),
    ]
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `delivery-summary-${fromDate || 'all'}-${toDate || 'all'}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast({ title: 'Export', description: 'CSV downloaded.' })
  }

  return (
    <PortalLayout activeSection="Delivery Summary">
      <div className="space-y-4 md:space-y-5 w-full max-w-full min-w-0">
        {/* Page title card */}
        <Card className={cardClass}>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-4 min-w-0">
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-semibold text-[#0F172A]">SMS Delivery Summary</h1>
              <p className="text-sm text-[#64748B] mt-1">
                Search and view delivery summary by sender, date range, and group.
              </p>
            </div>
            <Link href="#archived" className={cn(secondaryBtnClass, 'md:w-auto shrink-0')}>
              <Archive className="w-4 h-4 text-[#64748B]" />
              Archived
            </Link>
          </div>
        </Card>

        {/* Search / filter card */}
        <Card className={cardClass}>
          <h2 className="text-base font-semibold text-[#0F172A] mb-4">Search Delivery Summary</h2>
          <form onSubmit={handleSearch} className="space-y-4 min-w-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="min-w-0">
                <label htmlFor="senderName" className="block text-sm font-medium text-[#0F172A] mb-1.5">
                  Sender IDs
                </label>
                <select
                  id="senderName"
                  name="senderName"
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                  className={fieldClass}
                >
                  <option value="all">All Sender IDs</option>
                  {availableSenderIds.map((id) => (
                    <option key={id} value={id}>
                      {id}
                    </option>
                  ))}
                </select>
              </div>
              <div className="min-w-0">
                <label htmlFor="fromDate" className="block text-sm font-medium text-[#0F172A] mb-1.5">
                  From Date
                </label>
                <input
                  id="fromDate"
                  name="fromDate"
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className={fieldClass}
                />
              </div>
              <div className="min-w-0">
                <label htmlFor="toDate" className="block text-sm font-medium text-[#0F172A] mb-1.5">
                  To Date
                </label>
                <input
                  id="toDate"
                  name="toDate"
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className={fieldClass}
                />
              </div>
              <div className="grid grid-cols-2 lg:flex lg:flex-col xl:flex-row gap-2 sm:items-end min-w-0">
                <button type="submit" className={primaryBtnClass}>
                  <Search className="w-4 h-4" />
                  Search
                </button>
                <button type="button" onClick={handleReset} className={secondaryBtnClass}>
                  <RefreshCw className="w-4 h-4" />
                  Reset
                </button>
              </div>
            </div>

            <div className="min-w-0">
              <p className="text-sm font-medium text-[#0F172A] mb-2">Group By</p>
              <div className="grid grid-cols-3 gap-2 w-full min-w-0">
                {groupByOptions.map((option) => {
                  const isActive = groupBy === option.id
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setGroupBy(option.id)}
                      className={cn(
                        'min-h-[44px] px-2 py-2 rounded-xl border text-sm font-medium transition-all break-words text-center',
                        isActive
                          ? 'bg-[#ECFDF5] border-[#2F9B73] text-[#047857]'
                          : 'bg-white border-[#E2E8F0] text-[#334155] hover:bg-[#F8FAFC]'
                      )}
                    >
                      {option.label}
                    </button>
                  )
                })}
              </div>
            </div>
          </form>
        </Card>

        {/* Delivery summary results */}
        <Card className={cn(cardClass, 'p-0 overflow-hidden')}>
          <div className="px-4 sm:px-6 py-4 border-b border-[#E2E8F0] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 min-w-0">
            <h2 className="text-base font-semibold text-[#0F172A]">Delivery Summary</h2>
            <button
              type="button"
              onClick={handleExport}
              disabled={rows.length === 0}
              className={cn(softGreenBtnClass, 'sm:w-auto')}
            >
              <FileSpreadsheet className="w-4 h-4" />
              Export
            </button>
          </div>

          {loading ? (
            <div className="p-10 sm:p-12 text-center text-[#64748B]">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#2F9B73]" />
              <p>Loading delivery summary...</p>
            </div>
          ) : rows.length === 0 ? (
            <div className="p-10 sm:p-12 text-center text-[#64748B]">
              <p>No records found for the selected criteria.</p>
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-[#E2E8F0] bg-[#F8FAFC]">
                    <tr>
                      <th className="px-5 py-3 text-left font-semibold text-xs uppercase tracking-wider text-[#64748B]">
                        Group By
                      </th>
                      <th className="px-5 py-3 text-right font-semibold text-xs uppercase tracking-wider text-[#64748B]">
                        Total Requested
                      </th>
                      <th className="px-5 py-3 text-right font-semibold text-xs uppercase tracking-wider text-[#64748B]">
                        Total Delivered
                      </th>
                      <th className="px-5 py-3 text-right font-semibold text-xs uppercase tracking-wider text-[#64748B]">
                        Pending
                      </th>
                      <th className="px-5 py-3 text-right font-semibold text-xs uppercase tracking-wider text-[#64748B]">
                        Total Failed
                      </th>
                      <th className="px-5 py-3 text-right font-semibold text-xs uppercase tracking-wider text-[#64748B]">
                        Not Sent
                      </th>
                      <th className="px-5 py-3 text-right font-semibold text-xs uppercase tracking-wider text-[#64748B]">
                        Others
                      </th>
                      <th className="px-5 py-3 text-right font-semibold text-xs uppercase tracking-wider text-[#64748B]">
                        Refund
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, idx) => (
                      <tr
                        key={`${row.groupByLabel}-${idx}`}
                        className={cn(
                          'border-b border-[#E2E8F0] transition-colors hover:bg-[#ECFDF5]/40',
                          idx % 2 === 0 ? 'bg-white' : 'bg-[#F8FAFC]/60'
                        )}
                      >
                        <td className="px-5 py-3 font-medium text-[#0F172A]">{row.groupByLabel}</td>
                        <td className="px-5 py-3 text-right text-[#334155]">{row.totalRequested}</td>
                        <td className="px-5 py-3 text-right text-[#047857] font-medium">
                          {row.totalDelivered}
                        </td>
                        <td className="px-5 py-3 text-right text-[#475569]">{row.pending}</td>
                        <td className="px-5 py-3 text-right text-[#EF4444] font-medium">
                          {row.totalFailed}
                        </td>
                        <td className="px-5 py-3 text-right text-[#64748B]">{row.notSent}</td>
                        <td className="px-5 py-3 text-right text-[#64748B]">{row.others}</td>
                        <td className="px-5 py-3 text-right text-[#2563EB]">{row.refund}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="md:hidden p-4 min-w-0">
                {rows.map((row, idx) => (
                  <SummaryMobileCard key={`${row.groupByLabel}-${idx}`} row={row} groupBy={groupBy} index={idx} />
                ))}
              </div>
            </>
          )}
        </Card>

        {/* Archived reports */}
        <Card id="archived" className={cn(cardClass, 'scroll-mt-6')}>
          <h2 className="text-base font-semibold text-[#0F172A] mb-1">
            Download Archived SMS Delivery Summary
          </h2>
          <p className="text-sm text-[#64748B] mb-4">
            Search and download previously archived delivery summaries by date range.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-end min-w-0">
            <div className="min-w-0">
              <label htmlFor="archivedFromDate" className="block text-sm font-medium text-[#0F172A] mb-1.5">
                From Date
              </label>
              <input id="archivedFromDate" type="date" className={fieldClass} />
            </div>
            <div className="min-w-0">
              <label htmlFor="archivedToDate" className="block text-sm font-medium text-[#0F172A] mb-1.5">
                To Date
              </label>
              <input id="archivedToDate" type="date" className={fieldClass} />
            </div>
            <button type="button" className={cn(primaryBtnClass, 'sm:col-span-2 lg:col-span-1')}>
              View Reports
            </button>
          </div>

          {/* Desktop archived table */}
          <div className="hidden md:block mt-6 rounded-xl border border-[#E2E8F0] overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-xs text-[#64748B] uppercase tracking-wide">
                    Date
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-xs text-[#64748B] uppercase tracking-wide">
                    File Name
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-xs text-[#64748B] uppercase tracking-wide">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-[#64748B]">
                    No records found. Use the date range above and click &quot;View Reports&quot; to load archived
                    summaries.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Mobile archived empty state */}
          <div className="md:hidden mt-5 rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-6 text-center min-w-0">
            <Archive className="w-8 h-8 mx-auto mb-3 text-[#64748B]" />
            <p className="text-sm font-medium text-[#0F172A] mb-1">No archived reports found.</p>
            <p className="text-sm text-[#64748B]">Choose a date range and tap View Reports.</p>
          </div>
        </Card>
      </div>
    </PortalLayout>
  )
}

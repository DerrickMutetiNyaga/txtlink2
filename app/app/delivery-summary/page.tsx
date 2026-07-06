'use client'

import { PortalLayout } from '@/components/portal-layout'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'
import {
  Search,
  Download,
  RefreshCw,
  Archive,
  FileSpreadsheet,
} from 'lucide-react'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'

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
      <div className="space-y-6">
        {/* Header */}
        <Card className="rounded-2xl border border-slate-200/70 bg-white px-6 py-4 shadow-sm">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-xl font-semibold text-slate-900">SMS Delivery Summary</h1>
              <p className="text-sm text-slate-500">Search and view delivery summary by sender, date range, and group</p>
            </div>
            <Link href="#archived">
              <Button variant="outline" className="rounded-xl border border-slate-200 gap-2">
                <Archive className="w-4 h-4" />
                Archived
              </Button>
            </Link>
          </div>
        </Card>

        {/* Search Delivery Summary */}
        <Card className="rounded-2xl border border-slate-200/70 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">Search Delivery Summary</h2>
          <form onSubmit={handleSearch} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
            <div>
              <label htmlFor="senderName" className="block text-xs font-medium text-slate-600 mb-1">
                Sender IDs
              </label>
              <select
                id="senderName"
                name="senderName"
                value={senderName}
                onChange={(e) => setSenderName(e.target.value)}
                className="w-full h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700 focus:bg-white focus:ring-2 focus:ring-emerald-500"
              >
                <option value="all">All Sender IDs</option>
                {availableSenderIds.map((id) => (
                  <option key={id} value={id}>
                    {id}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="fromDate" className="block text-xs font-medium text-slate-600 mb-1">
                From Date
              </label>
              <Input
                id="fromDate"
                name="fromDate"
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="h-10 rounded-xl border border-slate-200 bg-slate-50"
              />
            </div>
            <div>
              <label htmlFor="toDate" className="block text-xs font-medium text-slate-600 mb-1">
                To Date
              </label>
              <Input
                id="toDate"
                name="toDate"
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="h-10 rounded-xl border border-slate-200 bg-slate-50"
              />
            </div>
            <div className="flex flex-wrap gap-2 items-end">
              <Button type="submit" className="rounded-xl bg-emerald-600 hover:bg-emerald-700 gap-2">
                <Search className="w-4 h-4" />
                Search
              </Button>
              <Button type="button" variant="outline" onClick={handleReset} className="rounded-xl gap-2">
                Reset
              </Button>
            </div>
          </form>

          <div className="mt-4">
            <span className="text-xs font-medium text-slate-600 mr-3">Group By</span>
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="groupBy"
                  checked={groupBy === 'summary'}
                  onChange={() => setGroupBy('summary')}
                  className="text-emerald-600 focus:ring-emerald-500"
                />
                <span className="text-sm text-slate-700">Summary</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="groupBy"
                  checked={groupBy === 'date'}
                  onChange={() => setGroupBy('date')}
                  className="text-emerald-600 focus:ring-emerald-500"
                />
                <span className="text-sm text-slate-700">Date</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="groupBy"
                  checked={groupBy === 'senderId'}
                  onChange={() => setGroupBy('senderId')}
                  className="text-emerald-600 focus:ring-emerald-500"
                />
                <span className="text-sm text-slate-700">Sender IDs</span>
              </label>
            </div>
          </div>
        </Card>

        {/* Delivery Summary Table */}
        <Card className="rounded-2xl border border-slate-200/70 bg-white shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200/70 flex items-center justify-between flex-wrap gap-2">
            <h2 className="text-sm font-semibold text-slate-700">Delivery Summary</h2>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              disabled={rows.length === 0}
              className="rounded-xl gap-2"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Export
            </Button>
          </div>
          {loading ? (
            <div className="p-12 text-center text-slate-500">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
              <p>Loading delivery summary...</p>
            </div>
          ) : rows.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              <p>No records found for the selected criteria.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-slate-200/70 bg-slate-50/80">
                  <tr>
                    <th className="px-5 py-3 text-left font-semibold text-xs uppercase tracking-wider text-slate-600">
                      Group By
                    </th>
                    <th className="px-5 py-3 text-right font-semibold text-xs uppercase tracking-wider text-slate-600">
                      Total Requested
                    </th>
                    <th className="px-5 py-3 text-right font-semibold text-xs uppercase tracking-wider text-slate-600">
                      Total Delivered
                    </th>
                    <th className="px-5 py-3 text-right font-semibold text-xs uppercase tracking-wider text-slate-600">
                      Pending
                    </th>
                    <th className="px-5 py-3 text-right font-semibold text-xs uppercase tracking-wider text-slate-600">
                      Total Failed
                    </th>
                    <th className="px-5 py-3 text-right font-semibold text-xs uppercase tracking-wider text-slate-600">
                      Not Sent
                    </th>
                    <th className="px-5 py-3 text-right font-semibold text-xs uppercase tracking-wider text-slate-600">
                      Others
                    </th>
                    <th className="px-5 py-3 text-right font-semibold text-xs uppercase tracking-wider text-slate-600">
                      Refund
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, idx) => (
                    <tr
                      key={`${row.groupByLabel}-${idx}`}
                      className={`border-b border-slate-100 ${
                        idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'
                      } hover:bg-emerald-50/40 transition-colors`}
                    >
                      <td className="px-5 py-3 font-medium text-slate-900">{row.groupByLabel}</td>
                      <td className="px-5 py-3 text-right text-slate-700">{row.totalRequested}</td>
                      <td className="px-5 py-3 text-right text-emerald-700 font-medium">
                        {row.totalDelivered}
                      </td>
                      <td className="px-5 py-3 text-right text-amber-700">{row.pending}</td>
                      <td className="px-5 py-3 text-right text-red-700 font-medium">
                        {row.totalFailed}
                      </td>
                      <td className="px-5 py-3 text-right text-slate-600">{row.notSent}</td>
                      <td className="px-5 py-3 text-right text-slate-600">{row.others}</td>
                      <td className="px-5 py-3 text-right text-slate-600">{row.refund}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Download Archived SMS Delivery Summary */}
        <Card id="archived" className="rounded-2xl border border-slate-200/70 bg-white p-6 shadow-sm scroll-mt-6">
          <h2 className="text-sm font-semibold text-slate-700 mb-2">Download Archived SMS Delivery Summary</h2>
          <p className="text-xs text-slate-500 mb-4">
            Search and download previously archived delivery summaries by date range.
          </p>
          <div className="flex flex-col sm:flex-row flex-wrap gap-4 items-stretch sm:items-end">
            <div className="w-full sm:w-auto">
              <label htmlFor="archivedFromDate" className="block text-xs font-medium text-slate-600 mb-1">
                From Date
              </label>
              <Input
                id="archivedFromDate"
                type="date"
                className="h-10 rounded-xl border border-slate-200 bg-slate-50 w-full sm:w-40"
              />
            </div>
            <div className="w-full sm:w-auto">
              <label htmlFor="archivedToDate" className="block text-xs font-medium text-slate-600 mb-1">
                To Date
              </label>
              <Input
                id="archivedToDate"
                type="date"
                className="h-10 rounded-xl border border-slate-200 bg-slate-50 w-full sm:w-40"
              />
            </div>
            <Button variant="outline" className="w-full sm:w-auto rounded-xl gap-2">
              View Reports
            </Button>
          </div>
          <div className="mt-6 rounded-xl border border-slate-200 overflow-hidden app-table-scroll">
            <table className="w-full text-sm">
              <thead className="bg-slate-50/80 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-2 text-left font-semibold text-xs text-slate-600">Date</th>
                  <th className="px-4 py-2 text-left font-semibold text-xs text-slate-600">File Name</th>
                  <th className="px-4 py-2 text-left font-semibold text-xs text-slate-600">Action</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td colSpan={3} className="px-4 py-6 text-center text-slate-500">
                    No records found. Use the date range above and click &quot;View Reports&quot; to load archived summaries.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </PortalLayout>
  )
}

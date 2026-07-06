'use client'

import { PortalLayout } from '@/components/portal-layout'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Download, Filter, TrendingUp, CheckCircle, XCircle, DollarSign, RefreshCw } from 'lucide-react'
import { useState, useEffect } from 'react'

interface Report {
  id: string
  date: string
  senderID: string
  status: string
  count: number
  cost: number
}

export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState({
    totalSms: 0,
    deliveryRate: 0,
    failed: 0,
    totalCost: 0,
  })
  const [availableSenderIds, setAvailableSenderIds] = useState<string[]>([])
  
  // Filter state
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    senderId: 'all',
    status: 'all',
  })

  // Fetch reports
  useEffect(() => {
    const fetchReports = async () => {
      try {
        setLoading(true)
        const token = localStorage.getItem('token')
        const params = new URLSearchParams()
        
        if (filters.startDate) params.append('startDate', filters.startDate)
        if (filters.endDate) params.append('endDate', filters.endDate)
        if (filters.senderId !== 'all') params.append('senderId', filters.senderId)
        if (filters.status !== 'all') params.append('status', filters.status)

        const response = await fetch(`/api/user/reports?${params.toString()}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (response.ok) {
          const data = await response.json()
          setReports(data.reports || [])
          setSummary(data.summary || {
            totalSms: 0,
            deliveryRate: 0,
            failed: 0,
            totalCost: 0,
          })
          setAvailableSenderIds(data.availableSenderIds || [])
        }
      } catch (error) {
        console.error('Failed to fetch reports:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchReports()
  }, [filters])

  const handleApplyFilters = () => {
    // Filters are applied automatically via useEffect
    // This function can be used for additional actions if needed
  }

  const handleExportCSV = () => {
    // Convert reports to CSV
    const headers = ['Date', 'Sender ID', 'Status', 'SMS Count', 'Cost']
    const rows = reports.map((r) => [
      r.date,
      r.senderID,
      r.status,
      r.count.toString(),
      r.cost.toFixed(2),
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.join(',')),
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `sms-reports-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  return (
    <PortalLayout activeSection="Reports">
      <div className="space-y-6">
        {/* Header */}
        <div className="app-page-header">
          <div>
            <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900 mb-2">SMS Reports</h1>
            <p className="text-gray-600">Track and analyze your SMS delivery performance</p>
          </div>
          <Button 
            onClick={handleExportCSV}
            disabled={loading || reports.length === 0}
            className="w-full sm:w-auto bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download size={18} className="mr-2" /> Export CSV
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <Card className="p-6 bg-white border border-gray-100 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-blue-100 text-blue-600">
                <TrendingUp size={24} />
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Total SMS</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {loading ? '...' : summary.totalSms.toLocaleString()}
                </p>
              </div>
            </div>
          </Card>
          <Card className="p-6 bg-white border border-gray-100 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-emerald-100 text-emerald-600">
                <CheckCircle size={24} />
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Delivery Rate</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {loading ? '...' : `${summary.deliveryRate.toFixed(1)}%`}
                </p>
              </div>
            </div>
          </Card>
          <Card className="p-6 bg-white border border-gray-100 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-red-100 text-red-600">
                <XCircle size={24} />
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Failed</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {loading ? '...' : summary.failed.toLocaleString()}
                </p>
              </div>
            </div>
          </Card>
          <Card className="p-6 bg-white border border-gray-100 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-teal-100 text-teal-600">
                <DollarSign size={24} />
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Cost</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {loading ? '...' : `KSh ${summary.totalCost.toFixed(2)}`}
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Filters */}
        <Card className="p-6 bg-white border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-teal-100 text-teal-600">
              <Filter size={20} />
            </div>
            <h3 className="font-semibold text-lg text-gray-900">Filters</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Date Range - Takes 2 columns on large screens */}
            <div className="md:col-span-2 lg:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Date Range</label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <input 
                    type="date" 
                    value={filters.startDate}
                    onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500" 
                  />
                </div>
                <div>
                  <input 
                    type="date" 
                    value={filters.endDate}
                    onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500" 
                  />
                </div>
              </div>
            </div>
            {/* Sender ID */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Sender ID</label>
              <select 
                value={filters.senderId}
                onChange={(e) => setFilters({ ...filters, senderId: e.target.value })}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500"
              >
                <option value="all">All</option>
                {availableSenderIds.map((senderId) => (
                  <option key={senderId} value={senderId}>
                    {senderId}
                  </option>
                ))}
              </select>
            </div>
            {/* Status */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Status</label>
              <select 
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500"
              >
                <option value="all">All</option>
                <option value="Delivered">Delivered</option>
                <option value="Pending">Pending</option>
                <option value="Failed">Failed</option>
              </select>
            </div>
            {/* Apply Button */}
            <div className="flex items-end">
              <Button 
                onClick={handleApplyFilters}
                className="w-full bg-teal-600 text-white hover:bg-teal-700 h-[42px] rounded-xl"
              >
                <Filter size={18} className="mr-2" /> Apply
              </Button>
            </div>
          </div>
        </Card>

        {/* Reports Table */}
        <Card className="p-4 sm:p-6 bg-white border border-gray-100 shadow-sm app-table-scroll">
          {loading ? (
            <div className="p-12 text-center text-gray-500">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2" />
              <p>Loading reports...</p>
            </div>
          ) : reports.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <TrendingUp className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p className="text-base font-medium text-gray-600 mb-1">No reports found</p>
              <p className="text-sm text-gray-400">Try adjusting your filters or send some SMS messages to see reports</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b border-gray-200">
                <tr className="text-left text-gray-600 font-semibold text-xs uppercase">
                  <th className="pb-4">Date</th>
                  <th className="pb-4">Sender ID</th>
                  <th className="pb-4">Status</th>
                  <th className="pb-4 text-right">SMS Count</th>
                  <th className="pb-4 text-right">Cost</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((report) => (
                  <tr key={report.id} className="border-b border-gray-100 hover:bg-gray-50 transition">
                    <td className="py-4 text-gray-600">{new Date(report.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</td>
                    <td className="py-4 font-semibold text-gray-900">{report.senderID}</td>
                    <td className="py-4">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                        report.status === 'Delivered' 
                          ? 'bg-emerald-50 text-emerald-700'
                          : report.status === 'Failed'
                          ? 'bg-red-50 text-red-700'
                          : 'bg-amber-50 text-amber-700'
                      }`}>
                        {report.status}
                      </span>
                    </td>
                    <td className="py-4 text-right text-gray-900">{report.count.toLocaleString()}</td>
                    <td className="py-4 text-right font-bold text-teal-600">KSh {report.cost.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>
    </PortalLayout>
  )
}

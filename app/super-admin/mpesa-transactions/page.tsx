'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Search,
  Download,
  RefreshCw,
  Filter,
  Phone,
  CreditCard,
  Calendar,
  FileText,
  X,
} from 'lucide-react'
import Link from 'next/link'

interface MpesaTransaction {
  _id: string
  transactionType: 'STK' | 'C2B'
  transactionId?: string
  checkoutRequestId?: string
  merchantRequestId?: string
  amount: number
  phoneNumber: string
  accountReference: string
  status: 'pending' | 'success' | 'failed' | 'cancelled' | 'timeout'
  responseCode?: string
  resultDesc?: string
  mpesaReceiptNumber?: string
  userId?: {
    _id: string
    name: string
    email: string
  }
  createdAt: string
  updatedAt: string
}

export default function MpesaTransactionsPage() {
  const [transactions, setTransactions] = useState<MpesaTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)
  const [filters, setFilters] = useState({
    status: '',
    transactionType: '',
    phoneNumber: '',
    startDate: '',
    endDate: '',
    search: '',
  })
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    pages: 0,
  })

  // Ensure component is mounted before making API calls
  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return
    fetchTransactions()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    mounted,
    filters.status,
    filters.transactionType,
    filters.phoneNumber,
    filters.startDate,
    filters.endDate,
    filters.search,
    pagination.page,
  ])

  const fetchTransactions = async () => {
    try {
      setLoading(true)
      setError(null)
      const token = localStorage.getItem('token')
      
      if (!token) {
        window.location.href = '/auth/login'
        return
      }
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      })

      if (filters.status) params.append('status', filters.status)
      if (filters.transactionType) params.append('transactionType', filters.transactionType)
      if (filters.phoneNumber) params.append('phoneNumber', filters.phoneNumber)
      if (filters.startDate) params.append('startDate', filters.startDate)
      if (filters.endDate) params.append('endDate', filters.endDate)
      if (filters.search) params.append('search', filters.search)

      const response = await fetch(`/api/super-admin/mpesa-transactions?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        if (response.status === 403 || response.status === 401) {
          window.location.href = '/auth/login'
          return
        }
        throw new Error('Failed to fetch transactions')
      }

      const result = await response.json()
      
      if (result.success && result.data) {
        setTransactions(result.data)
        if (result.pagination) {
          setPagination(result.pagination)
        }
      } else {
        console.error('Invalid response format:', result)
        setTransactions([])
      }
    } catch (error: any) {
      console.error('Error fetching transactions:', error)
      setTransactions([])
      setError(error.message || 'Failed to load transactions')
    } finally {
      setLoading(false)
    }
  }

  const handleExportCSV = () => {
    const headers = [
      'Date',
      'Type',
      'Amount (KES)',
      'Phone Number',
      'Account Reference',
      'Status',
      'Receipt Number',
      'User',
    ]

    const rows = transactions.map((t) => [
      new Date(t.createdAt).toLocaleString(),
      t.transactionType,
      t.amount?.toFixed(2) || '0.00',
      t.phoneNumber || '-',
      t.accountReference || '-',
      t.status || 'unknown',
      t.mpesaReceiptNumber || '-',
      t.userId && typeof t.userId === 'object' 
        ? `${t.userId.name || ''} (${t.userId.email || ''})`.trim() || '-'
        : '-',
    ])

    const csv = [headers, ...rows].map((row) => row.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `mpesa-transactions-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      success: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
      pending: 'bg-amber-50 text-amber-700 border border-amber-200',
      failed: 'bg-red-50 text-red-700 border border-red-200',
      cancelled: 'bg-slate-100 text-slate-700 border border-slate-200',
      timeout: 'bg-amber-50 text-amber-700 border border-amber-200',
    }
    return (
      <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${variants[status] || 'bg-slate-100 text-slate-700 border border-slate-200'}`}>
        {status.toUpperCase()}
      </span>
    )
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const dateStr = date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })
    const timeStr = date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
    return { dateStr, timeStr }
  }

  if (!mounted) {
    return (
      <div className="p-6 lg:p-8 bg-[#F8FAFC] min-h-screen flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin text-slate-400 mx-auto mb-4" />
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 lg:p-8 bg-[#F8FAFC] min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-[#020617]">M-Pesa Transactions</h1>
            <p className="text-[#64748B] mt-1">View and manage all M-Pesa payment transactions</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl shadow-sm text-slate-700 hover:bg-slate-100 hover:text-slate-900 active:scale-95 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 transition-all duration-200"
            >
              <Download className="w-4 h-4 text-slate-500" />
              Export CSV
            </button>
            <button
              onClick={fetchTransactions}
              className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl shadow-sm text-slate-700 hover:bg-slate-100 hover:text-slate-900 active:scale-95 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 transition-all duration-200"
            >
              <RefreshCw className="w-4 h-4 text-slate-500" />
              Refresh
            </button>
          </div>
        </div>

        {/* Filters */}
        <Card className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4">
          <div className="grid md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div>
              <Label className="text-sm font-medium text-slate-900 mb-2 block">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  placeholder="Search..."
                  className="pl-10 rounded-xl border border-slate-200 bg-white px-4 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition"
                />
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium text-slate-900 mb-2 block">Status</Label>
              <Select
                value={filters.status || undefined}
                onValueChange={(value) => setFilters({ ...filters, status: value === 'all' ? '' : value })}
              >
                <SelectTrigger className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-0 focus:border-emerald-500 transition [&_svg]:text-slate-400">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent className="bg-white border border-slate-200 rounded-xl shadow-lg">
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="success">Success</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                  <SelectItem value="timeout">Timeout</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-sm font-medium text-slate-900 mb-2 block">Type</Label>
              <Select
                value={filters.transactionType || undefined}
                onValueChange={(value) => setFilters({ ...filters, transactionType: value === 'all' ? '' : value })}
              >
                <SelectTrigger className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-0 focus:border-emerald-500 transition [&_svg]:text-slate-400">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent className="bg-white border border-slate-200 rounded-xl shadow-lg">
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="STK">STK Push</SelectItem>
                  <SelectItem value="C2B">C2B</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-sm font-medium text-slate-900 mb-2 block">Phone Number</Label>
              <Input
                value={filters.phoneNumber}
                onChange={(e) => setFilters({ ...filters, phoneNumber: e.target.value })}
                placeholder="254..."
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition"
              />
            </div>

            <div>
              <Label className="text-sm font-medium text-slate-900 mb-2 block">Start Date</Label>
              <Input
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition"
              />
            </div>

            <div>
              <Label className="text-sm font-medium text-slate-900 mb-2 block">End Date</Label>
              <Input
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition"
              />
            </div>
          </div>

          <div className="mt-4 flex justify-end">
            <Button
              onClick={() => {
                setFilters({
                  status: '',
                  transactionType: '',
                  phoneNumber: '',
                  startDate: '',
                  endDate: '',
                  search: '',
                })
                setPagination({ ...pagination, page: 1 })
              }}
              variant="outline"
              className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 rounded-xl px-4 py-2"
            >
              <X className="w-4 h-4 mr-2" />
              Clear Filters
            </Button>
          </div>
        </Card>

        {/* Transactions Table */}
        <Card className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4">
          {loading ? (
            <div className="text-center py-12">
              <RefreshCw className="w-8 h-8 animate-spin text-slate-400 mx-auto mb-4" />
              <p className="text-slate-600">Loading transactions...</p>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-red-400 mx-auto mb-4" />
              <p className="text-red-600 mb-4">{error}</p>
              <button
                onClick={fetchTransactions}
                className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl shadow-sm text-slate-700 hover:bg-slate-100 hover:text-slate-900 active:scale-95 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 transition-all duration-200"
              >
                <RefreshCw className="w-4 h-4 text-slate-500" />
                Retry
              </button>
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-slate-400 mx-auto mb-4" />
              <p className="text-slate-600">No transactions found</p>
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-track]:bg-slate-100 [&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-thumb]:rounded-full">
                <Table>
                  <TableHeader className="sticky top-0 z-10 bg-slate-50">
                    <TableRow className="hover:bg-slate-50 border-b border-slate-200">
                      <TableHead className="text-xs font-semibold uppercase tracking-wide text-slate-600 px-4 py-3">Date</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wide text-slate-600 px-4 py-3">Type</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wide text-slate-600 px-4 py-3 text-right">Amount</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wide text-slate-600 px-4 py-3">Phone</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wide text-slate-600 px-4 py-3">Account Reference</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wide text-slate-600 px-4 py-3">Status</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wide text-slate-600 px-4 py-3">Receipt</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wide text-slate-600 px-4 py-3">User</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((transaction) => {
                      const { dateStr, timeStr } = formatDate(transaction.createdAt)
                      return (
                        <TableRow key={transaction._id} className="hover:bg-slate-50 border-b border-slate-100 transition-colors">
                          <TableCell className="px-4 py-3">
                            <div>
                              <div className="text-sm text-slate-700">{dateStr}</div>
                              <div className="text-xs text-slate-500">{timeStr}</div>
                            </div>
                          </TableCell>
                          <TableCell className="px-4 py-3">
                            <span className="inline-flex items-center bg-slate-100 text-slate-700 border border-slate-200 rounded-full px-2 py-0.5 text-xs font-medium">
                              {transaction.transactionType}
                            </span>
                          </TableCell>
                          <TableCell className="px-4 py-3 text-right font-medium text-slate-900">
                            KSh {transaction.amount.toFixed(2)}
                          </TableCell>
                          <TableCell className="px-4 py-3 text-sm text-slate-700">
                            {transaction.phoneNumber}
                          </TableCell>
                          <TableCell className="px-4 py-3">
                            <span 
                              className="text-sm font-mono text-xs text-slate-600 truncate max-w-[220px] block" 
                              title={transaction.accountReference}
                            >
                              {transaction.accountReference}
                            </span>
                          </TableCell>
                          <TableCell className="px-4 py-3">
                            {getStatusBadge(transaction.status)}
                          </TableCell>
                          <TableCell className="px-4 py-3">
                            {transaction.mpesaReceiptNumber ? (
                              <span className="text-sm font-mono text-xs text-slate-600">
                                {transaction.mpesaReceiptNumber}
                              </span>
                            ) : (
                              <span className="text-sm text-slate-400">-</span>
                            )}
                          </TableCell>
                          <TableCell className="px-4 py-3">
                            {transaction.userId ? (
                              <div>
                                <div className="text-sm font-medium text-slate-700">
                                  {typeof transaction.userId === 'object' 
                                    ? transaction.userId.name || transaction.userId.email || '-'
                                    : '-'}
                                </div>
                                {typeof transaction.userId === 'object' && transaction.userId.email && (
                                  <div className="text-xs text-slate-500">{transaction.userId.email}</div>
                                )}
                              </div>
                            ) : (
                              <span className="text-sm text-slate-400">-</span>
                            )}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Card View */}
              <div className="md:hidden space-y-3">
                {transactions.map((transaction) => {
                  const { dateStr, timeStr } = formatDate(transaction.createdAt)
                  return (
                    <div key={transaction._id} className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="font-semibold text-slate-900">
                          KSh {transaction.amount.toFixed(2)}
                        </div>
                        {getStatusBadge(transaction.status)}
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <span className="inline-flex items-center bg-slate-100 text-slate-700 border border-slate-200 rounded-full px-2 py-0.5 text-xs font-medium">
                          {transaction.transactionType}
                        </span>
                        <span className="text-slate-700">{transaction.phoneNumber}</span>
                      </div>
                      <div className="space-y-1 text-sm">
                        <div className="text-slate-600">
                          <span className="font-medium">Receipt:</span>{' '}
                          {transaction.mpesaReceiptNumber ? (
                            <span className="font-mono text-xs">{transaction.mpesaReceiptNumber}</span>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </div>
                        <div className="text-slate-600">
                          <span className="font-medium">Account:</span>{' '}
                          <span className="font-mono text-xs">{transaction.accountReference}</span>
                        </div>
                        <div className="text-slate-600">
                          <span className="font-medium">Date:</span> {dateStr} {timeStr}
                        </div>
                        {transaction.userId && (
                          <div className="text-slate-600">
                            <span className="font-medium">User:</span>{' '}
                            {typeof transaction.userId === 'object' 
                              ? transaction.userId.name || transaction.userId.email || '-'
                              : '-'}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Pagination */}
              {pagination.pages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 pt-6 border-t border-slate-200">
                  <p className="text-sm text-slate-600">
                    Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
                    {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                    {pagination.total} transactions
                  </p>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
                      disabled={pagination.page === 1}
                      variant="outline"
                      size="sm"
                      className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </Button>
                    <Button
                      onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
                      disabled={pagination.page >= pagination.pages}
                      variant="outline"
                      size="sm"
                      className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </Card>
      </div>
    </div>
  )
}


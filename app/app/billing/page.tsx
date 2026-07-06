'use client'

import { PortalLayout } from '@/components/portal-layout'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  CreditCard, 
  Download, 
  Plus, 
  ArrowUpRight, 
  ArrowDownRight,
  TrendingUp,
  TrendingDown,
  Phone,
  FileText,
  Edit,
  Trash2,
  Search,
  CheckCircle2
} from 'lucide-react'
import Link from 'next/link'
import { useState, useEffect } from 'react'

interface Transaction {
  id: string
  date: string
  description: string
  amount: number
  type: 'top-up' | 'charge' | 'refund'
  status: string
  reference: string
}

interface Invoice {
  id: string
  date: string
  amount: number
  status: string
  reference: string
}

interface PaymentMethod {
  id: string
  type: 'mpesa' | 'card' | 'bank'
  name: string
  details: string
  expiry?: string
  isDefault: boolean
}

export default function BillingPage() {
  const [transactionFilter, setTransactionFilter] = useState<'all' | 'top-ups' | 'charges' | 'refunds'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [balance, setBalance] = useState<number>(0)
  const [loading, setLoading] = useState(true)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [summary, setSummary] = useState({
    usedThisMonth: 0,
    smsCount: 0,
    avgDailySpend: 0,
    plan: 'Enterprise',
  })
  const isLowBalance = balance < 1000

  // Fetch billing data from API
  useEffect(() => {
    const fetchBillingData = async () => {
      try {
        setLoading(true)
        const token = localStorage.getItem('token')
        const params = new URLSearchParams()
        if (transactionFilter !== 'all') params.append('filter', transactionFilter)
        if (searchQuery) params.append('search', searchQuery)

        const response = await fetch(`/api/user/billing?${params.toString()}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (response.ok) {
          const data = await response.json()
          setBalance(data.balance || 0)
          setTransactions(data.transactions || [])
          setInvoices(data.invoices || [])
          setPaymentMethods(data.paymentMethods || [])
          setSummary(data.summary || {
            usedThisMonth: 0,
            smsCount: 0,
            avgDailySpend: 0,
            plan: 'Enterprise',
          })
        }
      } catch (error) {
        console.error('Failed to fetch billing data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchBillingData()
  }, [transactionFilter, searchQuery])

  const filteredTransactions = transactions.filter(tx => {
    if (transactionFilter === 'all') return true
    if (transactionFilter === 'top-ups') return tx.type === 'top-up'
    if (transactionFilter === 'charges') return tx.type === 'charge'
    if (transactionFilter === 'refunds') return tx.type === 'refund'
    return true
  })

  const handleExportCSV = () => {
    const headers = ['Date', 'Description', 'Amount', 'Type', 'Reference', 'Status']
    const rows = filteredTransactions.map((tx) => [
      tx.date,
      tx.description,
      tx.amount > 0 ? `+${tx.amount}` : tx.amount.toString(),
      tx.type,
      tx.reference,
      tx.status,
    ])

    const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `billing-transactions-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
  }

  return (
    <PortalLayout activeSection="Billing">
      <div className="space-y-6">
        {/* Hero Balance Card - Premium */}
<<<<<<< HEAD
        <Card className="p-4 sm:p-6 bg-gradient-to-r from-emerald-50 to-white border border-slate-200/70 shadow-sm rounded-2xl">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
=======
        <Card className="p-6 bg-gradient-to-r from-emerald-50 to-white border border-slate-200/70 shadow-sm rounded-2xl">
          <div className="flex items-start justify-between">
>>>>>>> 4a3d95970903f9fc28665c46227114641494cea8
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <p className="text-sm font-medium text-slate-600">Available SMS Credits</p>
                {isLowBalance && (
                  <Badge variant="outline" className="h-5 px-2 text-xs font-semibold border-amber-300 text-amber-700 bg-amber-50">
                    Low balance
                  </Badge>
                )}
              </div>
<<<<<<< HEAD
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 mb-2">
=======
              <h2 className="text-4xl font-bold text-slate-900 mb-2">
>>>>>>> 4a3d95970903f9fc28665c46227114641494cea8
                {loading ? 'Loading...' : `${balance.toLocaleString()} credits`}
              </h2>
              <p className="text-xs text-slate-500">Last updated {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</p>
            </div>
<<<<<<< HEAD
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto shrink-0">
              <Link href="/app/billing/top-up" className="w-full sm:w-auto">
                <Button className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 hover:shadow-md text-white transition-all">
=======
            <div className="flex items-center gap-2">
              <Link href="/app/billing/top-up">
                <Button className="bg-emerald-600 hover:bg-emerald-700 hover:shadow-md text-white transition-all">
>>>>>>> 4a3d95970903f9fc28665c46227114641494cea8
                  <Plus size={16} className="mr-2" />
                  Top up
                </Button>
              </Link>
              <Button variant="ghost" className="text-slate-500 hover:text-emerald-600 hover:underline">
                View Pricing
              </Button>
            </div>
          </div>
        </Card>

        {/* KPI Row - 3 Cards */}
<<<<<<< HEAD
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
=======
        <div className="grid md:grid-cols-3 gap-6">
>>>>>>> 4a3d95970903f9fc28665c46227114641494cea8
          <Card className="p-6 bg-white border border-slate-200/70 shadow-sm rounded-2xl">
            <p className="text-sm font-medium text-slate-600 mb-2">Used This Month</p>
            <p className="text-3xl font-bold text-slate-900 mb-1">
              {loading ? '...' : `KSh ${summary.usedThisMonth.toLocaleString()}`}
            </p>
            <p className="text-xs text-slate-500">{loading ? '...' : `${summary.smsCount.toLocaleString()} SMS sent`}</p>
          </Card>

          <Card className="p-6 bg-white border border-slate-200/70 shadow-sm rounded-2xl">
            <div className="flex items-start justify-between mb-2">
              <p className="text-sm font-medium text-slate-600">Plan</p>
              <Button variant="ghost" size="sm" className="h-7 text-xs text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50">
                Upgrade
              </Button>
            </div>
            <p className="text-3xl font-bold text-slate-900 mb-1">{summary.plan}</p>
            <p className="text-xs text-slate-500">Unlimited SMS</p>
          </Card>

          <Card className="p-6 bg-white border border-slate-200/70 shadow-sm rounded-2xl">
            <p className="text-sm font-medium text-slate-600 mb-2">Avg Daily Spend</p>
            <p className="text-3xl font-bold text-slate-900 mb-1">
              {loading ? '...' : `KSh ${summary.avgDailySpend.toLocaleString()}`}
            </p>
            <p className="text-xs text-slate-500 flex items-center gap-1">
              <TrendingDown size={12} className="text-emerald-600" />
              <span className="text-emerald-600">Based on last 30 days</span>
            </p>
          </Card>
        </div>

        {/* Recent Transactions */}
        <Card className="p-6 bg-white border border-slate-200/70 shadow-sm rounded-2xl">
<<<<<<< HEAD
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between mb-6">
            <h3 className="text-lg font-semibold text-slate-900">Recent Transactions</h3>
            <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
              <div className="relative w-full sm:w-64">
=======
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-slate-900">Recent Transactions</h3>
            <div className="flex items-center gap-3">
              <div className="relative">
>>>>>>> 4a3d95970903f9fc28665c46227114641494cea8
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search transactions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
<<<<<<< HEAD
                  className="h-9 w-full pl-10 pr-4 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
=======
                  className="h-9 w-64 pl-10 pr-4 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
>>>>>>> 4a3d95970903f9fc28665c46227114641494cea8
                />
              </div>
              <Button 
                onClick={handleExportCSV}
                disabled={filteredTransactions.length === 0}
                variant="outline" 
<<<<<<< HEAD
                className="w-full sm:w-auto bg-white border-slate-200 text-slate-700 hover:bg-emerald-50 hover:border-emerald-500 hover:text-emerald-700 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
=======
                className="bg-white border-slate-200 text-slate-700 hover:bg-emerald-50 hover:border-emerald-500 hover:text-emerald-700 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
>>>>>>> 4a3d95970903f9fc28665c46227114641494cea8
              >
                <Download size={16} className="mr-2" />
                Export
              </Button>
            </div>
          </div>

          {/* Filter Chips */}
<<<<<<< HEAD
          <div className="flex flex-wrap gap-2 mb-6">
=======
          <div className="flex gap-2 mb-6">
>>>>>>> 4a3d95970903f9fc28665c46227114641494cea8
            {(['all', 'top-ups', 'charges', 'refunds'] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setTransactionFilter(filter)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                  transactionFilter === filter
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {filter.charAt(0).toUpperCase() + filter.slice(1).replace('-', ' ')}
              </button>
            ))}
          </div>

          {/* Transactions Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200 bg-slate-50/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Description</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">Amount</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Reference</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                      Loading transactions...
                    </td>
                  </tr>
                ) : filteredTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                      No transactions found
                    </td>
                  </tr>
                ) : (
                  filteredTransactions.map((tx) => (
                    <tr key={tx.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3 text-slate-600">{formatDate(tx.date)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {tx.type === 'top-up' && <ArrowUpRight size={16} className="text-emerald-600" />}
                          {tx.type === 'charge' && <ArrowDownRight size={16} className="text-slate-400" />}
                          {tx.type === 'refund' && <TrendingUp size={16} className="text-blue-600" />}
                          <span className="font-medium text-slate-900">{tx.description}</span>
                        </div>
                      </td>
                      <td className={`px-4 py-3 text-right font-semibold ${
                        tx.amount > 0 ? 'text-emerald-600' : 'text-slate-900'
                      }`}>
                        {tx.amount > 0 ? '+' : ''}KSh {Math.abs(tx.amount).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-slate-600 font-mono text-xs">{tx.reference}</td>
                      <td className="px-4 py-3">
                        <Badge 
                          variant="outline" 
                          className={`${
                            tx.status === 'completed' 
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : tx.status === 'pending'
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-red-50 text-red-700 border-red-200'
                          }`}
                        >
                          <CheckCircle2 size={12} className="mr-1" />
                          {tx.status.charAt(0).toUpperCase() + tx.status.slice(1)}
                        </Badge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Invoices */}
        <Card className="p-6 bg-white border border-slate-200/70 shadow-sm rounded-2xl">
          <h3 className="text-lg font-semibold text-slate-900 mb-6">Invoices</h3>
          {loading ? (
            <div className="p-8 text-center text-slate-500">Loading invoices...</div>
          ) : invoices.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              <FileText className="w-12 h-12 mx-auto mb-4 text-slate-300" />
              <p className="text-sm">No invoices found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {invoices.map((invoice) => (
                <div
                  key={invoice.id}
<<<<<<< HEAD
                  className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between p-4 rounded-xl border border-slate-200/70 hover:bg-slate-50/50 transition-colors"
                >
                  <div className="flex items-center gap-4 min-w-0">
=======
                  className="flex items-center justify-between p-4 rounded-xl border border-slate-200/70 hover:bg-slate-50/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
>>>>>>> 4a3d95970903f9fc28665c46227114641494cea8
                    <div className="p-2 rounded-lg bg-slate-100">
                      <FileText size={18} className="text-slate-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">{invoice.reference}</p>
                      <p className="text-sm text-slate-500">{invoice.date}</p>
                    </div>
                  </div>
<<<<<<< HEAD
                  <div className="flex flex-wrap items-center gap-3 sm:gap-4">
=======
                  <div className="flex items-center gap-4">
>>>>>>> 4a3d95970903f9fc28665c46227114641494cea8
                    <p className="text-lg font-semibold text-slate-900">
                      KSh {invoice.amount.toLocaleString()}
                    </p>
                    <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                      Paid
                    </Badge>
                    <Button variant="outline" size="sm" className="bg-white border-slate-200 text-slate-700 hover:bg-emerald-50 hover:border-emerald-500 hover:text-emerald-700 rounded-xl transition-all">
                      <Download size={16} className="mr-2" />
                      Download
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Payment Methods */}
        <Card className="p-6 bg-white border border-slate-200/70 shadow-sm rounded-2xl">
<<<<<<< HEAD
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
            <h3 className="text-lg font-semibold text-slate-900">Payment Methods</h3>
            <Button variant="outline" className="w-full sm:w-auto bg-white border-emerald-600 text-emerald-600 hover:bg-emerald-600 hover:text-white hover:border-emerald-700 rounded-xl transition-all">
=======
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-slate-900">Payment Methods</h3>
            <Button variant="outline" className="bg-white border-emerald-600 text-emerald-600 hover:bg-emerald-600 hover:text-white hover:border-emerald-700 rounded-xl transition-all">
>>>>>>> 4a3d95970903f9fc28665c46227114641494cea8
              <Plus size={16} className="mr-2" />
              Add Payment Method
            </Button>
          </div>
          {loading ? (
            <div className="p-8 text-center text-slate-500">Loading payment methods...</div>
          ) : paymentMethods.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              <CreditCard className="w-12 h-12 mx-auto mb-4 text-slate-300" />
              <p className="text-sm mb-2">No payment methods added</p>
              <p className="text-xs text-slate-400">Add a payment method to get started</p>
            </div>
          ) : (
            <div className="space-y-3">
              {paymentMethods.map((method) => (
                <div
                  key={method.id}
<<<<<<< HEAD
                  className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between p-4 rounded-xl border border-slate-200/70 hover:bg-slate-50/50 transition-colors"
                >
                  <div className="flex items-center gap-4 min-w-0">
=======
                  className="flex items-center justify-between p-4 rounded-xl border border-slate-200/70 hover:bg-slate-50/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
>>>>>>> 4a3d95970903f9fc28665c46227114641494cea8
                    <div className={`p-3 rounded-xl ${
                      method.type === 'mpesa' 
                        ? 'bg-emerald-100 text-emerald-600'
                        : 'bg-slate-100 text-slate-600'
                    }`}>
                      {method.type === 'mpesa' ? (
                        <Phone size={20} />
                      ) : (
                        <CreditCard size={20} />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-slate-900">{method.name}</p>
                        {method.isDefault && (
                          <Badge variant="outline" className="h-5 px-2 text-xs bg-emerald-50 text-emerald-700 border-emerald-200">
                            Default
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-slate-500">
                        {method.details}
                        {method.expiry && ` • Expires ${method.expiry}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" className="bg-transparent text-slate-600 hover:bg-emerald-50 hover:text-emerald-700 hover:underline rounded-xl transition-all">
                      <Edit size={16} className="mr-2" />
                      Edit
                    </Button>
                    <Button variant="outline" size="sm" className="bg-white border-red-500 text-red-600 hover:bg-red-600 hover:text-white hover:border-red-700 rounded-xl transition-all">
                      <Trash2 size={16} className="mr-2" />
                      Remove
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </PortalLayout>
  )
}

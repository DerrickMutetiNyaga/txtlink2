'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Users,
  Search,
  RefreshCw,
  MoreVertical,
  Radio,
  DollarSign,
  Ban,
  CheckCircle2,
  X,
  Plus,
  Minus,
  ArrowRight,
  XCircle,
  Circle,
  Download,
  Phone,
  Calendar,
  TrendingUp,
  Wallet,
  Shield,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'

interface Account {
  id: string
  name: string
  email: string
  phone?: string
  credits: number
  isActive: boolean
  hpUserLoginName?: string
  senderIds: Array<{
    id: string
    senderName: string
    status: string
    isDefault: boolean
  }>
  pricing: {
    mode: string
    pricePerSms?: number
    pricePerPart?: number
  } | null
  globalPricing: {
    mode: string
    pricePerSms?: number
    pricePerPart?: number
  } | null
  createdAt?: string
  lastActivity?: string
}

// Stat Card Component
function StatCard({ label, value, icon: Icon }: { label: string; value: string | number; icon: any }) {
  return (
    <Card className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-slate-500 mb-1">{label}</p>
          <p className="text-2xl font-bold text-slate-900">{value}</p>
        </div>
        <div className="w-10 h-10 rounded-lg bg-slate-50 flex items-center justify-center">
          <Icon className="w-5 h-5 text-slate-600" />
        </div>
      </div>
    </Card>
  )
}

// Status Pill Component
function StatusPill({ isActive }: { isActive: boolean }) {
  return isActive ? (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
      <Circle className="w-2 h-2 fill-emerald-600" />
      Active
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200">
      <Circle className="w-2 h-2 fill-red-600" />
      Suspended
    </span>
  )
}

// Actions Menu Component
function ActionsMenu({
  account,
  onManageSenderIds,
  onPricingOverride,
  onSuspend,
}: {
  account: Account
  onManageSenderIds: () => void
  onPricingOverride: () => void
  onSuspend: () => void
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center justify-center p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors">
          <MoreVertical className="w-4 h-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-56 bg-white border border-slate-200 rounded-xl shadow-lg p-2 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 duration-150"
      >
        <DropdownMenuLabel className="px-3 py-2 text-sm font-semibold text-slate-900">
          Actions
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-slate-200 my-1" />
        <DropdownMenuItem
          onClick={onManageSenderIds}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer text-slate-700 hover:bg-slate-100 hover:text-slate-900 focus:bg-slate-100 focus:text-slate-900 transition-colors group"
        >
          <Radio className="w-4 h-4 text-slate-500 group-hover:text-slate-900 transition-colors" />
          <span>Manage Sender IDs</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={onPricingOverride}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer text-slate-700 hover:bg-slate-100 hover:text-slate-900 focus:bg-slate-100 focus:text-slate-900 transition-colors group"
        >
          <DollarSign className="w-4 h-4 text-slate-500 group-hover:text-slate-900 transition-colors" />
          <span>Pricing Override</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator className="bg-slate-200 my-1" />
        <DropdownMenuItem
          onClick={onSuspend}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer text-slate-700 hover:bg-red-50 hover:text-red-700 focus:bg-red-50 focus:text-red-700 transition-colors group"
        >
          <Ban className="w-4 h-4 text-slate-500 group-hover:text-red-600 transition-colors" />
          <span>{account.isActive ? 'Suspend' : 'Unsuspend'}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export default function SuperAdminAccounts() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'suspended'>('all')
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'most-active'>('newest')
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null)
  const [senderIdDrawerOpen, setSenderIdDrawerOpen] = useState(false)
  const [pricingDrawerOpen, setPricingDrawerOpen] = useState(false)
  const [transferDialogOpen, setTransferDialogOpen] = useState(false)
  const [allSenderIds, setAllSenderIds] = useState<any[]>([])

  useEffect(() => {
    fetchAccounts()
    fetchAllSenderIds()
  }, [])

  const fetchAccounts = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('token')
      const response = await fetch('/api/super-admin/accounts', {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (response.ok) {
        const data = await response.json()
        setAccounts(data.accounts || [])
      } else {
        console.error('Failed to fetch accounts')
      }
    } catch (error) {
      console.error('Error fetching accounts:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchAllSenderIds = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/super-admin/senderids', {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (response.ok) {
        const data = await response.json()
        setAllSenderIds(data.senderIds || [])
      }
    } catch (error) {
      console.error('Error fetching sender IDs:', error)
    }
  }

  const handleAssignSenderId = async (senderId: string) => {
    if (!selectedAccount) return

    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/super-admin/senderids/assign', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          senderId,
          userId: selectedAccount.id,
        }),
      })

      if (response.ok) {
        await fetchAccounts()
        setSenderIdDrawerOpen(false)
        alert('Sender ID assigned successfully')
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to assign sender ID')
      }
    } catch (error) {
      alert('Failed to assign sender ID')
    }
  }

  const handleUnassignSenderId = async (senderId: string) => {
    if (!selectedAccount) return

    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/super-admin/senderids/unassign', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          senderId,
          userId: selectedAccount.id,
        }),
      })

      if (response.ok) {
        await fetchAccounts()
        alert('Sender ID unassigned successfully')
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to unassign sender ID')
      }
    } catch (error) {
      alert('Failed to unassign sender ID')
    }
  }

  const handleSetDefault = async (senderId: string) => {
    if (!selectedAccount) return

    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/super-admin/senderids/set-default', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          senderId,
          userId: selectedAccount.id,
        }),
      })

      if (response.ok) {
        await fetchAccounts()
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to set default')
      }
    } catch (error) {
      alert('Failed to set default')
    }
  }

  const handleTransfer = async (senderId: string, toUserId: string) => {
    if (!selectedAccount) return

    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/super-admin/senderids/transfer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          senderId,
          fromUserId: selectedAccount.id,
          toUserId,
          makeDefault: false,
        }),
      })

      if (response.ok) {
        await fetchAccounts()
        setTransferDialogOpen(false)
        alert('Sender ID transferred successfully')
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to transfer sender ID')
      }
    } catch (error) {
      alert('Failed to transfer sender ID')
    }
  }

  const handleSuspend = async (accountId: string, currentIsActive: boolean) => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/super-admin/accounts/${accountId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ isActive: !currentIsActive }),
      })

      if (response.ok) {
        await fetchAccounts()
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to update status')
      }
    } catch (error) {
      alert('Failed to update status')
    }
  }

  const handleExportCSV = () => {
    const headers = ['Company', 'Email', 'Phone', 'Credits', 'Status', 'Sender IDs', 'Pricing']
    const rows = filteredAccounts.map((acc) => [
      acc.name,
      acc.email,
      acc.phone || '-',
      acc.credits.toString(),
      acc.isActive ? 'Active' : 'Suspended',
      acc.senderIds.length.toString(),
      acc.pricing
        ? `KSh ${acc.pricing.pricePerSms || acc.pricing.pricePerPart}/${acc.pricing.mode === 'per_sms' ? 'SMS' : 'Part'}`
        : 'Global',
    ])

    const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `accounts-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const filteredAccounts = accounts
    .filter((acc) => {
      const matchesSearch =
        acc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        acc.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        acc.phone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        acc.senderIds.some((sid) => sid.senderName.toLowerCase().includes(searchTerm.toLowerCase()))
      const matchesStatus =
        statusFilter === 'all' || (statusFilter === 'active' ? acc.isActive : !acc.isActive)
      return matchesSearch && matchesStatus
    })
    .sort((a, b) => {
      if (sortBy === 'newest') {
        return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
      } else if (sortBy === 'oldest') {
        return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime()
      } else {
        return b.credits - a.credits
      }
    })

  // Calculate metrics
  const totalAccounts = accounts.length
  const activeAccounts = accounts.filter((a) => a.isActive).length
  const suspendedAccounts = accounts.filter((a) => !a.isActive).length
  const totalCredits = accounts.reduce((sum, a) => sum + a.credits, 0)

  return (
    <div className="p-6 lg:p-8 bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-slate-900">Accounts</h1>
            <p className="text-slate-600 mt-1 text-sm">
              Manage customer accounts, sender IDs, pricing overrides, and status.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl shadow-sm text-slate-700 hover:bg-slate-100 hover:text-slate-900 active:scale-95 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 transition-all duration-200"
            >
              <Download className="w-4 h-4 text-slate-500" />
              Export
            </button>
            <button
              onClick={fetchAccounts}
              className="flex items-center justify-center p-2.5 bg-white border border-slate-200 rounded-xl shadow-sm text-slate-700 hover:bg-slate-100 hover:text-slate-900 active:scale-95 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 transition-all duration-200"
            >
              <RefreshCw className="w-4 h-4 text-slate-500" />
            </button>
          </div>
        </div>

        {/* Metrics Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total Accounts" value={totalAccounts} icon={Users} />
          <StatCard label="Active" value={activeAccounts} icon={CheckCircle2} />
          <StatCard label="Suspended" value={suspendedAccounts} icon={Shield} />
          <StatCard label="Total Credits" value={totalCredits.toLocaleString()} icon={Wallet} />
        </div>

        {/* Filters */}
        <Card className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
              <Input
                type="text"
                placeholder="Search company, email, phone, sender ID…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-11 border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 rounded-xl"
              />
            </div>
            <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
              <SelectTrigger className="h-11 w-full lg:w-[160px] border-slate-200 bg-white text-slate-900 focus:ring-2 focus:ring-emerald-500 rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-white border-slate-200">
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
              <SelectTrigger className="h-11 w-full lg:w-[160px] border-slate-200 bg-white text-slate-900 focus:ring-2 focus:ring-emerald-500 rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-white border-slate-200">
                <SelectItem value="newest">Newest</SelectItem>
                <SelectItem value="oldest">Oldest</SelectItem>
                <SelectItem value="most-active">Most Active</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </Card>

        {/* Accounts Table - Desktop */}
        <Card className="hidden lg:block border border-slate-200 rounded-2xl shadow-sm bg-white overflow-hidden">
          {loading ? (
            <div className="p-12">
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full bg-slate-100" />
                ))}
              </div>
            </div>
          ) : filteredAccounts.length === 0 ? (
            <div className="p-12 text-center">
              <Users className="w-12 h-12 mx-auto mb-4 text-slate-400" />
              <p className="text-slate-900 font-medium mb-2">No accounts found</p>
              <p className="text-sm text-slate-500 mb-4">Try adjusting your search or filters</p>
              <button
                onClick={() => {
                  setSearchTerm('')
                  setStatusFilter('all')
                }}
                className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-slate-700 hover:bg-slate-100 transition-colors"
              >
                Clear filters
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
                  <tr>
                    <th className="text-left py-3 px-6 text-xs font-semibold text-slate-700 uppercase tracking-wider">
                      Account
                    </th>
                    <th className="text-left py-3 px-6 text-xs font-semibold text-slate-700 uppercase tracking-wider">
                      Phone
                    </th>
                    <th className="text-left py-3 px-6 text-xs font-semibold text-slate-700 uppercase tracking-wider">
                      Sender IDs
                    </th>
                    <th className="text-left py-3 px-6 text-xs font-semibold text-slate-700 uppercase tracking-wider">
                      Pricing
                    </th>
                    <th className="text-right py-3 px-6 text-xs font-semibold text-slate-700 uppercase tracking-wider">
                      Credits
                    </th>
                    <th className="text-center py-3 px-6 text-xs font-semibold text-slate-700 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="text-left py-3 px-6 text-xs font-semibold text-slate-700 uppercase tracking-wider">
                      Last Activity
                    </th>
                    <th className="text-right py-3 px-6 text-xs font-semibold text-slate-700 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredAccounts.map((account) => (
                    <tr
                      key={account.id}
                      className="hover:bg-slate-50 transition-colors"
                    >
                      <td className="py-3 px-6">
                        <div>
                          <div className="font-medium text-slate-900">{account.name}</div>
                          <div className="text-sm text-slate-500">{account.email}</div>
                        </div>
                      </td>
                      <td className="py-3 px-6 text-sm text-slate-600">
                        {account.phone || '-'}
                      </td>
                      <td className="py-3 px-6">
                        {account.senderIds.length > 0 ? (
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center px-2 py-1 rounded-lg text-xs font-medium bg-slate-100 text-slate-700">
                              {account.senderIds.length}
                            </span>
                            <button
                              onClick={() => {
                                setSelectedAccount(account)
                                setSenderIdDrawerOpen(true)
                              }}
                              className="text-xs text-emerald-600 hover:text-emerald-700 font-medium"
                            >
                              View
                            </button>
                          </div>
                        ) : (
                          <span className="text-sm text-slate-400">None</span>
                        )}
                      </td>
                      <td className="py-3 px-6">
                        {account.pricing ? (
                          <div className="text-sm">
                            <span className="font-medium text-slate-900">
                              KSh {account.pricing.pricePerSms || account.pricing.pricePerPart}
                            </span>
                            <span className="text-slate-500 ml-1">
                              / {account.pricing.mode === 'per_sms' ? 'SMS' : 'Part'}
                            </span>
                          </div>
                        ) : (
                          <span className="text-sm text-slate-500">Global</span>
                        )}
                      </td>
                      <td className="text-right py-3 px-6 font-medium text-slate-900">
                        {account.credits.toLocaleString()}
                      </td>
                      <td className="text-center py-3 px-6">
                        <StatusPill isActive={account.isActive} />
                      </td>
                      <td className="py-3 px-6 text-sm text-slate-500">
                        {account.lastActivity
                          ? new Date(account.lastActivity).toLocaleDateString()
                          : account.createdAt
                          ? new Date(account.createdAt).toLocaleDateString()
                          : '-'}
                      </td>
                      <td className="text-right py-3 px-6">
                        <ActionsMenu
                          account={account}
                          onManageSenderIds={() => {
                            setSelectedAccount(account)
                            setSenderIdDrawerOpen(true)
                          }}
                          onPricingOverride={() => {
                            setSelectedAccount(account)
                            setPricingDrawerOpen(true)
                          }}
                          onSuspend={() => handleSuspend(account.id, account.isActive)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Mobile Cards */}
        <div className="lg:hidden space-y-4">
          {loading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Card key={i} className="p-4">
                  <Skeleton className="h-20 w-full bg-slate-100" />
                </Card>
              ))}
            </div>
          ) : filteredAccounts.length === 0 ? (
            <Card className="p-8 text-center">
              <Users className="w-12 h-12 mx-auto mb-4 text-slate-400" />
              <p className="text-slate-900 font-medium mb-2">No accounts found</p>
              <p className="text-sm text-slate-500 mb-4">Try adjusting your search or filters</p>
              <button
                onClick={() => {
                  setSearchTerm('')
                  setStatusFilter('all')
                }}
                className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-slate-700 hover:bg-slate-100 transition-colors"
              >
                Clear filters
              </button>
            </Card>
          ) : (
            filteredAccounts.map((account) => (
              <Card key={account.id} className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-slate-900">{account.name}</h3>
                      <StatusPill isActive={account.isActive} />
                    </div>
                    <p className="text-sm text-slate-500">{account.email}</p>
                    {account.phone && (
                      <p className="text-sm text-slate-500 mt-1">{account.phone}</p>
                    )}
                  </div>
                  <ActionsMenu
                    account={account}
                    onManageSenderIds={() => {
                      setSelectedAccount(account)
                      setSenderIdDrawerOpen(true)
                    }}
                    onPricingOverride={() => {
                      setSelectedAccount(account)
                      setPricingDrawerOpen(true)
                    }}
                    onSuspend={() => handleSuspend(account.id, account.isActive)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-200">
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Sender IDs</p>
                    <p className="text-sm font-medium text-slate-900">
                      {account.senderIds.length} {account.senderIds.length === 1 ? 'ID' : 'IDs'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Pricing</p>
                    <p className="text-sm font-medium text-slate-900">
                      {account.pricing
                        ? `KSh ${account.pricing.pricePerSms || account.pricing.pricePerPart}`
                        : 'Global'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Credits</p>
                    <p className="text-sm font-medium text-slate-900">
                      {account.credits.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Last Activity</p>
                    <p className="text-sm font-medium text-slate-900">
                      {account.lastActivity
                        ? new Date(account.lastActivity).toLocaleDateString()
                        : account.createdAt
                        ? new Date(account.createdAt).toLocaleDateString()
                        : '-'}
                    </p>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>

        {/* Sender ID Management Modal */}
        {selectedAccount && (
          <Dialog open={senderIdDrawerOpen} onOpenChange={setSenderIdDrawerOpen}>
            <DialogContent className="max-w-2xl bg-white border border-slate-200 rounded-2xl shadow-xl">
              <DialogHeader>
                <DialogTitle className="text-xl font-semibold text-slate-900">
                  Manage Sender IDs - {selectedAccount.name}
                </DialogTitle>
                <DialogDescription className="text-slate-600">
                  Assign, unassign, or set default sender IDs for this account.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-slate-700">Available Sender IDs</Label>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {allSenderIds
                      .filter((sid) => !selectedAccount.senderIds.some((asid) => asid.id === sid.id))
                      .map((sid) => (
                        <div
                          key={sid.id}
                          className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-lg"
                        >
                          <span className="text-sm text-slate-900">{sid.senderName}</span>
                          <button
                            onClick={() => handleAssignSenderId(sid.id)}
                            className="px-3 py-1.5 text-xs font-medium text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
                          >
                            Assign
                          </button>
                        </div>
                      ))}
                  </div>
                </div>
                <Separator />
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-slate-700">Assigned Sender IDs</Label>
                  <div className="space-y-2">
                    {selectedAccount.senderIds.map((sid) => (
                      <div
                        key={sid.id}
                        className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-lg"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-slate-900">{sid.senderName}</span>
                          {sid.isDefault && (
                            <span className="px-2 py-0.5 text-xs font-medium bg-emerald-100 text-emerald-700 rounded">
                              Default
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {!sid.isDefault && (
                            <button
                              onClick={() => handleSetDefault(sid.id)}
                              className="px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                            >
                              Set Default
                            </button>
                          )}
                          <button
                            onClick={() => handleUnassignSenderId(sid.id)}
                            className="px-3 py-1.5 text-xs font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            Unassign
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* Pricing Override Modal */}
        {selectedAccount && (
          <Dialog open={pricingDrawerOpen} onOpenChange={setPricingDrawerOpen}>
            <DialogContent className="max-w-md bg-white border border-slate-200 rounded-2xl shadow-xl">
              <DialogHeader>
                <DialogTitle className="text-xl font-semibold text-slate-900">
                  Pricing Override - {selectedAccount.name}
                </DialogTitle>
                <DialogDescription className="text-slate-600">
                  Set custom pricing for this account. Leave empty to use global pricing.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <Label className="text-sm font-medium text-slate-700 mb-2 block">
                    Price per SMS (KSh)
                  </Label>
                  <Input
                    type="number"
                    placeholder="Enter price"
                    className="border-slate-200 focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                  <button
                    onClick={() => setPricingDrawerOpen(false)}
                    className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    className="px-4 py-2 text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-700 rounded-xl transition-colors"
                  >
                    Save
                  </button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  )
}

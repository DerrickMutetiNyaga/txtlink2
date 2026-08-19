'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
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
  MessageSquare,
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
import {
  convertKesToCredits,
  pricePerCreditFromPricingRule,
  DEFAULT_PRICE_PER_CREDIT_KES,
} from '@/lib/utils/credits'
import {
  PricingRuleEditorDialog,
  getDefaultPricingRule,
  type EditablePricingRule,
} from '@/components/super-admin/pricing-rule-form'

const MODAL_INPUT_CLASS =
  'border-slate-200 bg-white focus:ring-2 focus:ring-emerald-500 [&:-webkit-autofill]:[-webkit-text-fill-color:#0f172a] [&:-webkit-autofill]:[box-shadow:0_0_0_1000px_#ffffff_inset]'

interface HostPinnacleSenderId {
  id: string
  senderName: string
  status: string
  hpSenderId?: string
  assignedUsers?: Array<{
    userId: string
    userName?: string
    userEmail?: string
  }>
  assignedCount?: number
}

interface Account {
  id: string
  name: string
  email: string
  phone?: string
  credits: number
  isActive: boolean
  /** When true, all SMS for this user skip HostPinnacle and use the phone gateway */
  routeAllSmsViaPhoneGateway?: boolean
  hpUserLoginName?: string
  senderIds: Array<{
    id: string
    senderName: string
    status: string
    isDefault: boolean
  }>
  pricing: EditablePricingRule | null
  globalPricing: EditablePricingRule | null
  createdAt?: string
  lastActivity?: string
  delivery?: {
    total: number
    delivered: number
    sent: number
    pending: number
    failed: number
    lastSmsAt: string | null
  }
  deliveryHealth?: 'none' | 'good' | 'watch' | 'problem'
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
function DeliveryCounts({ account }: { account: Account }) {
  const delivery = account.delivery || { delivered: 0, sent: 0, pending: 0, failed: 0, total: 0 }
  if (!delivery.total) {
    return <span className="text-sm text-slate-500">No SMS yet</span>
  }
  return (
    <Link
      href={`/super-admin/accounts/${account.id}`}
      className="inline-flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-medium hover:underline"
    >
      <span className="text-emerald-700">{delivery.delivered} delivered</span>
      <span className="text-sky-700">{delivery.sent} sent</span>
      <span className="text-amber-800">{delivery.pending} pending</span>
      <span className="text-red-700">{delivery.failed} failed</span>
    </Link>
  )
}

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
  onViewDeliveries,
  onManageSenderIds,
  onPricingOverride,
  onAdjustCredits,
  onTogglePhoneGateway,
  onSuspend,
}: {
  account: Account
  onViewDeliveries: () => void
  onManageSenderIds: () => void
  onPricingOverride: () => void
  onAdjustCredits: () => void
  onTogglePhoneGateway: () => void
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
        className="w-64 bg-white border border-slate-200 rounded-xl shadow-lg p-2 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 duration-150"
      >
        <DropdownMenuLabel className="px-3 py-2 text-sm font-semibold text-slate-900">
          Actions
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-slate-200 my-1" />
        <DropdownMenuItem
          onClick={onViewDeliveries}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer text-slate-700 hover:bg-slate-100 hover:text-slate-900 focus:bg-slate-100 focus:text-slate-900 transition-colors group"
        >
          <MessageSquare className="w-4 h-4 text-slate-500 group-hover:text-slate-900 transition-colors" />
          <span>View deliveries</span>
        </DropdownMenuItem>
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
        <DropdownMenuItem
          onClick={onAdjustCredits}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer text-slate-700 hover:bg-slate-100 hover:text-slate-900 focus:bg-slate-100 focus:text-slate-900 transition-colors group"
        >
          <Wallet className="w-4 h-4 text-slate-500 group-hover:text-slate-900 transition-colors" />
          <span>Adjust Credits</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={onTogglePhoneGateway}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer text-slate-700 hover:bg-slate-100 hover:text-slate-900 focus:bg-slate-100 focus:text-slate-900 transition-colors group"
        >
          <Phone className="w-4 h-4 text-slate-500 group-hover:text-slate-900 transition-colors" />
          <span>
            {account.routeAllSmsViaPhoneGateway
              ? 'Use HostPinnacle (provider)'
              : 'Route all SMS via Phone'}
          </span>
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
  const router = useRouter()
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'suspended'>('all')
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'most-active'>('newest')
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null)
  const [senderIdDrawerOpen, setSenderIdDrawerOpen] = useState(false)
  const [pricingDrawerOpen, setPricingDrawerOpen] = useState(false)
  const [editingPricingRule, setEditingPricingRule] = useState<EditablePricingRule | null>(null)
  const [pricingSubmitting, setPricingSubmitting] = useState(false)
  const [transferDialogOpen, setTransferDialogOpen] = useState(false)
  const [allSenderIds, setAllSenderIds] = useState<HostPinnacleSenderId[]>([])
  const [fetchingSenderIds, setFetchingSenderIds] = useState(false)
  const [senderIdFetchError, setSenderIdFetchError] = useState<string | null>(null)
  const [assigningSenderId, setAssigningSenderId] = useState<string | null>(null)
  const [replacingSenderId, setReplacingSenderId] = useState<string | null>(null)
  const [replaceTargetId, setReplaceTargetId] = useState<string>('')
  const [actionLoading, setActionLoading] = useState(false)
  const [creditsDrawerOpen, setCreditsDrawerOpen] = useState(false)
  const [creditAction, setCreditAction] = useState<'set_credits' | 'add_credits' | 'remove_credits'>('set_credits')
  const [creditAmount, setCreditAmount] = useState('')
  const [creditReason, setCreditReason] = useState('')
  const [creditSubmitting, setCreditSubmitting] = useState(false)

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
      setFetchingSenderIds(true)
      setSenderIdFetchError(null)
      const token = localStorage.getItem('token')
      const response = await fetch('/api/super-admin/senderids', {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (response.ok) {
        const data = await response.json()
        setAllSenderIds(data.senderIds || [])
        return data.senderIds || []
      }

      const error = await response.json().catch(() => ({}))
      const message =
        error.details ||
        error.error ||
        'Could not load sender IDs from HostPinnacle. Accounts still load from TXTLINK.'
      setSenderIdFetchError(message)
      console.warn('HostPinnacle sender ID fetch failed:', message)
      return []
    } catch (error) {
      console.error('Error fetching sender IDs:', error)
      setSenderIdFetchError(
        'Could not reach HostPinnacle for sender IDs. Accounts still load from TXTLINK.'
      )
      return []
    } finally {
      setFetchingSenderIds(false)
    }
  }

  const refreshSelectedAccount = async () => {
    if (!selectedAccount) return
    const token = localStorage.getItem('token')
    const accountsResponse = await fetch('/api/super-admin/accounts', {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (accountsResponse.ok) {
      const data = await accountsResponse.json()
      const updated = (data.accounts || []).find((a: Account) => a.id === selectedAccount.id)
      if (updated) setSelectedAccount(updated)
    }
  }

  const refreshAfterSenderIdChange = async () => {
    await fetchAccounts()
    await fetchAllSenderIds()
    await refreshSelectedAccount()
  }

  const handleAssignSenderId = async (senderIdOrName: string, senderName?: string) => {
    if (!selectedAccount) return

    try {
      setAssigningSenderId(senderIdOrName)
      const token = localStorage.getItem('token')
      const response = await fetch(
        `/api/super-admin/accounts/${selectedAccount.id}/senderids/assign`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            senderId: senderIdOrName,
            senderName,
            makeDefault: selectedAccount.senderIds.length === 0,
          }),
        }
      )

      if (response.ok) {
        await refreshAfterSenderIdChange()
        alert('Sender ID assigned successfully')
      } else {
        const error = await response.json()
        alert(error.error || error.details || 'Failed to assign sender ID')
      }
    } catch (error) {
      alert('Failed to assign sender ID')
    } finally {
      setAssigningSenderId(null)
    }
  }

  const handleUnassignSenderId = async (
    senderId: string,
    senderName?: string,
    accountOverride?: Account
  ) => {
    const account = accountOverride || selectedAccount
    if (!account) return

    const label = senderName || account.senderIds.find((s) => s.id === senderId)?.senderName || 'this sender ID'
    if (!window.confirm(`Remove "${label}" from ${account.name}? They will no longer be able to send with it.`)) {
      return
    }

    try {
      setActionLoading(true)
      const token = localStorage.getItem('token')
      const response = await fetch(
        `/api/super-admin/accounts/${account.id}/senderids/unassign`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ senderId }),
        }
      )

      if (response.ok) {
        setReplacingSenderId(null)
        setReplaceTargetId('')
        await refreshAfterSenderIdChange()
        alert('Sender ID removed successfully')
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to unassign sender ID')
      }
    } catch (error) {
      alert('Failed to remove sender ID')
    } finally {
      setActionLoading(false)
    }
  }

  const handleReplaceSenderId = async (oldSenderId: string) => {
    if (!selectedAccount || !replaceTargetId) return

    const oldSid = selectedAccount.senderIds.find((s) => s.id === oldSenderId)
    const newSid = allSenderIds.find((s) => s.id === replaceTargetId)
    if (!oldSid || !newSid) return

    if (
      !window.confirm(
        `Replace "${oldSid.senderName}" with "${newSid.senderName}" for ${selectedAccount.name}?`
      )
    ) {
      return
    }

    try {
      setActionLoading(true)
      const token = localStorage.getItem('token')
      const response = await fetch(
        `/api/super-admin/accounts/${selectedAccount.id}/senderids/replace`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            oldSenderId,
            newSenderId: newSid.id,
            newSenderName: newSid.senderName,
            makeDefault: oldSid.isDefault,
          }),
        }
      )

      if (response.ok) {
        setReplacingSenderId(null)
        setReplaceTargetId('')
        await refreshAfterSenderIdChange()
        alert(`Sender ID replaced with "${newSid.senderName}"`)
      } else {
        const error = await response.json()
        alert(error.error || error.details || 'Failed to replace sender ID')
      }
    } catch (error) {
      alert('Failed to replace sender ID')
    } finally {
      setActionLoading(false)
    }
  }

  const formatSharedLabel = (sid: HostPinnacleSenderId, currentAccountId?: string) => {
    const others = (sid.assignedUsers || []).filter((u) => u.userId !== currentAccountId)
    if (others.length === 0) return null
    if (others.length === 1) {
      return `Also used by ${others[0].userName || others[0].userEmail}`
    }
    return `Shared with ${others.length} other accounts`
  }

  const getAvailableReplacementIds = (currentSenderId: string) =>
    allSenderIds.filter(
      (sid) =>
        sid.id !== currentSenderId &&
        !selectedAccount?.senderIds.some(
          (asid) => asid.id === sid.id || asid.senderName === sid.senderName
        )
    )

  const handleSetDefault = async (senderId: string) => {
    if (!selectedAccount) return

    try {
      const token = localStorage.getItem('token')
      const response = await fetch(
        `/api/super-admin/accounts/${selectedAccount.id}/senderids/default`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ senderId }),
        }
      )

      if (response.ok) {
        await fetchAccounts()
        const accountsResponse = await fetch('/api/super-admin/accounts', {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (accountsResponse.ok) {
          const data = await accountsResponse.json()
          const updated = (data.accounts || []).find((a: Account) => a.id === selectedAccount.id)
          if (updated) setSelectedAccount(updated)
        }
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

  const handleAdjustCredits = async () => {
    if (!selectedAccount) return

    const parsed = Number(creditAmount)
    if (creditAction === 'set_credits') {
      if (!Number.isFinite(parsed) || parsed < 0) {
        alert('Enter a valid credit balance (0 or more)')
        return
      }
    } else if (!parsed || parsed <= 0 || !Number.isFinite(parsed)) {
      alert(creditAction === 'add_credits' ? 'Enter a valid amount in KSh' : 'Enter a valid credit amount')
      return
    }

    try {
      setCreditSubmitting(true)
      const token = localStorage.getItem('token')
      const body =
        creditAction === 'add_credits'
          ? {
              action: creditAction,
              amountKes: parsed,
              reason: creditReason.trim() || undefined,
            }
          : {
              action: creditAction,
              amount: Math.trunc(parsed),
              reason: creditReason.trim() || undefined,
            }

      const response = await fetch(`/api/super-admin/accounts/${selectedAccount.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      })

      const data = await response.json()
      if (response.ok) {
        const token2 = localStorage.getItem('token')
        const accountsResponse = await fetch('/api/super-admin/accounts', {
          headers: { Authorization: `Bearer ${token2}` },
        })
        if (accountsResponse.ok) {
          const accountsData = await accountsResponse.json()
          setAccounts(accountsData.accounts || [])
          const updated = (accountsData.accounts || []).find(
            (a: Account) => a.id === selectedAccount.id
          )
          if (updated) setSelectedAccount(updated)
        }
        setCreditsDrawerOpen(false)
        setCreditAmount('')
        setCreditReason('')
        alert(
          creditAction === 'set_credits'
            ? `Balance set to ${data.newBalance} SMS credits.`
            : creditAction === 'add_credits'
            ? `Added ${data.creditsDelta} credits from KSh ${parsed.toLocaleString()}. New balance: ${data.newBalance}`
            : `Removed ${Math.abs(data.creditsDelta)} credits. New balance: ${data.newBalance}`
        )
      } else {
        alert(data.error || 'Failed to adjust credits')
      }
    } catch {
      alert('Failed to adjust credits')
    } finally {
      setCreditSubmitting(false)
    }
  }

  const openPricingOverride = (account: Account) => {
    setSelectedAccount(account)
    const existing = account.pricing
    const global = account.globalPricing
    if (existing) {
      setEditingPricingRule({
        ...existing,
        scope: 'user',
        userId: account.id,
      })
    } else if (global) {
      setEditingPricingRule({
        ...global,
        _id: undefined,
        scope: 'user',
        userId: account.id,
      })
    } else {
      setEditingPricingRule(getDefaultPricingRule('user', account.id))
    }
    setPricingDrawerOpen(true)
  }

  const handleSavePricingOverride = async () => {
    if (!selectedAccount || !editingPricingRule) return

    try {
      setPricingSubmitting(true)
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/super-admin/accounts/${selectedAccount.id}/pricing`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          mode: editingPricingRule.mode,
          pricePerSms: editingPricingRule.pricePerSms,
          pricePerPart: editingPricingRule.pricePerPart,
          pricePerBlock: editingPricingRule.pricePerBlock,
          pricePerCharacter: editingPricingRule.pricePerCharacter,
          charsPerBlock: editingPricingRule.charsPerBlock,
          chargeFailed: editingPricingRule.chargeFailed,
          refundOnFail: editingPricingRule.refundOnFail,
          samePriceForEncodings: editingPricingRule.samePriceForEncodings,
          roundPartialBlocks: editingPricingRule.roundPartialBlocks,
          minimumChargePerMessage: editingPricingRule.minimumChargePerMessage,
          gsm7Part1: editingPricingRule.gsm7Part1,
          gsm7PartN: editingPricingRule.gsm7PartN,
          ucs2Part1: editingPricingRule.ucs2Part1,
          ucs2PartN: editingPricingRule.ucs2PartN,
          ucs2CharsPerBlock: editingPricingRule.ucs2CharsPerBlock,
          ucs2PricePerBlock: editingPricingRule.ucs2PricePerBlock,
          ucs2PricePerCharacter: editingPricingRule.ucs2PricePerCharacter,
        }),
      })

      const data = await response.json()
      if (response.ok) {
        await fetchAccounts()
        setPricingDrawerOpen(false)
        setEditingPricingRule(null)
        alert('Pricing override saved')
      } else {
        alert(data.error || 'Failed to save pricing override')
      }
    } catch {
      alert('Failed to save pricing override')
    } finally {
      setPricingSubmitting(false)
    }
  }

  const handleRemovePricingOverride = async () => {
    if (!selectedAccount) return
    if (!confirm('Remove custom pricing for this account? It will use global pricing.')) return

    try {
      setPricingSubmitting(true)
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/super-admin/accounts/${selectedAccount.id}/pricing`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await response.json()
      if (response.ok) {
        await fetchAccounts()
        setPricingDrawerOpen(false)
        setEditingPricingRule(null)
        alert('Pricing override removed')
      } else {
        alert(data.error || 'Failed to remove pricing override')
      }
    } catch {
      alert('Failed to remove pricing override')
    } finally {
      setPricingSubmitting(false)
    }
  }

  const pricePerCreditKes =
    pricePerCreditFromPricingRule(selectedAccount?.pricing) ??
    pricePerCreditFromPricingRule(selectedAccount?.globalPricing) ??
    DEFAULT_PRICE_PER_CREDIT_KES
  const addCreditsPreview =
    creditAction === 'add_credits' && creditAmount
      ? convertKesToCredits({
          paidKes: Number(creditAmount),
          pricePerCreditKes,
        }).creditsToAdd
      : 0

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

  const handleTogglePhoneGateway = async (
    accountId: string,
    currentlyEnabled: boolean
  ) => {
    const enabling = !currentlyEnabled
    const confirmed = window.confirm(
      enabling
        ? 'Route ALL SMS for this user through their Android phone gateway?\n\nHostPinnacle will be skipped. The phone gateway app must be online.'
        : 'Switch this user back to HostPinnacle (provider) for SMS sending?'
    )
    if (!confirmed) return

    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/super-admin/accounts/${accountId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ routeAllSmsViaPhoneGateway: enabling }),
      })

      if (response.ok) {
        await fetchAccounts()
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to update phone gateway routing')
      }
    } catch {
      alert('Failed to update phone gateway routing')
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
              Open a customer account to see whether SMS deliveries are working, plus pending, failed, and sent counts.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchAllSenderIds}
              disabled={fetchingSenderIds}
              className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 border border-emerald-600 rounded-xl shadow-sm text-white hover:bg-emerald-700 disabled:opacity-60 active:scale-95 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 transition-all duration-200"
            >
              <RefreshCw className={`w-4 h-4 ${fetchingSenderIds ? 'animate-spin' : ''}`} />
              {fetchingSenderIds ? 'Fetching...' : 'Fetch HostPinnacle IDs'}
            </button>
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl shadow-sm text-slate-700 hover:bg-slate-100 hover:text-slate-900 active:scale-95 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 transition-all duration-200"
            >
              <Download className="w-4 h-4 text-slate-500" />
              Export
            </button>
            <button
              onClick={async () => {
                await fetchAccounts()
                await fetchAllSenderIds()
              }}
              className="flex items-center justify-center p-2.5 bg-white border border-slate-200 rounded-xl shadow-sm text-slate-700 hover:bg-slate-100 hover:text-slate-900 active:scale-95 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 transition-all duration-200"
            >
              <RefreshCw className="w-4 h-4 text-slate-500" />
            </button>
          </div>
        </div>

        {senderIdFetchError && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <p className="font-medium">HostPinnacle sender IDs could not be loaded</p>
            <p className="mt-1 text-amber-800">{senderIdFetchError}</p>
            <p className="mt-1 text-amber-700">
              This page still works. Use Fetch HostPinnacle IDs after credentials in Settings are working.
            </p>
          </div>
        )}

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
                    <th className="text-left py-3 px-6 text-xs font-semibold text-slate-700 uppercase tracking-wider">
                      Deliveries
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
                        <Link href={`/super-admin/accounts/${account.id}`} className="hover:underline">
                          <div className="font-medium text-slate-900">{account.name}</div>
                          <div className="text-sm text-slate-500">{account.email}</div>
                        </Link>
                      </td>
                      <td className="py-3 px-6 text-sm text-slate-600">
                        {account.phone || '-'}
                      </td>
                      <td className="py-3 px-6">
                        {account.senderIds.length > 0 ? (
                          <div className="flex flex-wrap items-center gap-1.5">
                            {account.senderIds.slice(0, 2).map((sid) => (
                              <span
                                key={sid.id}
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium bg-emerald-50 text-emerald-800 border border-emerald-200 group"
                                title={sid.isDefault ? 'Default sender ID' : sid.status}
                              >
                                {sid.senderName}
                                {sid.isDefault && ' ★'}
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleUnassignSenderId(sid.id, sid.senderName, account)
                                  }}
                                  className="ml-0.5 p-0.5 rounded hover:bg-emerald-200/60 text-emerald-700 opacity-60 hover:opacity-100"
                                  title={`Remove ${sid.senderName}`}
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </span>
                            ))}
                            {account.senderIds.length > 2 && (
                              <button
                                onClick={() => {
                                  setSelectedAccount(account)
                                  setSenderIdDrawerOpen(true)
                                }}
                                className="text-xs text-emerald-600 hover:text-emerald-700 font-medium"
                              >
                                +{account.senderIds.length - 2} more
                              </button>
                            )}
                            {account.senderIds.length <= 2 && (
                              <button
                                onClick={() => {
                                  setSelectedAccount(account)
                                  setSenderIdDrawerOpen(true)
                                }}
                                className="text-xs text-slate-500 hover:text-slate-700"
                              >
                                Manage
                              </button>
                            )}
                          </div>
                        ) : (
                          <button
                            onClick={async () => {
                              setSelectedAccount(account)
                              if (allSenderIds.length === 0) await fetchAllSenderIds()
                              setSenderIdDrawerOpen(true)
                            }}
                            className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
                          >
                            Assign Sender ID
                          </button>
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
                      <td className="py-3 px-6">
                        <DeliveryCounts account={account} />
                      </td>
                      <td className="text-right py-3 px-6 font-medium text-slate-900">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedAccount(account)
                            setCreditAction('set_credits')
                            setCreditAmount(String(account.credits ?? 0))
                            setCreditReason('')
                            setCreditsDrawerOpen(true)
                          }}
                          className="hover:text-emerald-700 hover:underline"
                          title="Edit credits"
                        >
                          {account.credits.toLocaleString()}
                        </button>
                      </td>
                      <td className="text-center py-3 px-6">
                        <div className="flex flex-col items-center gap-1">
                          <StatusPill isActive={account.isActive} />
                          {account.routeAllSmsViaPhoneGateway && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-sky-50 text-sky-700 border border-sky-200">
                              <Phone className="w-2.5 h-2.5" />
                              Phone gateway
                            </span>
                          )}
                        </div>
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
                          onViewDeliveries={() => router.push(`/super-admin/accounts/${account.id}`)}
                          onManageSenderIds={() => {
                            setSelectedAccount(account)
                            setSenderIdDrawerOpen(true)
                          }}
                          onPricingOverride={() => openPricingOverride(account)}
                          onAdjustCredits={() => {
                            setSelectedAccount(account)
                            setCreditAction('set_credits')
                            setCreditAmount(String(account.credits ?? 0))
                            setCreditReason('')
                            setCreditsDrawerOpen(true)
                          }}
                          onTogglePhoneGateway={() =>
                            handleTogglePhoneGateway(
                              account.id,
                              !!account.routeAllSmsViaPhoneGateway
                            )
                          }
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
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <Link href={`/super-admin/accounts/${account.id}`} className="font-semibold text-slate-900 hover:underline">
                        {account.name}
                      </Link>
                      <StatusPill isActive={account.isActive} />
                      {account.routeAllSmsViaPhoneGateway && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-sky-50 text-sky-700 border border-sky-200">
                          <Phone className="w-2.5 h-2.5" />
                          Phone gateway
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-500">{account.email}</p>
                    {account.phone && (
                      <p className="text-sm text-slate-500 mt-1">{account.phone}</p>
                    )}
                  </div>
                  <ActionsMenu
                    account={account}
                    onViewDeliveries={() => router.push(`/super-admin/accounts/${account.id}`)}
                    onManageSenderIds={() => {
                      setSelectedAccount(account)
                      setSenderIdDrawerOpen(true)
                    }}
                    onPricingOverride={() => openPricingOverride(account)}
                    onAdjustCredits={() => {
                      setSelectedAccount(account)
                      setCreditAction('set_credits')
                      setCreditAmount(String(account.credits ?? 0))
                      setCreditReason('')
                      setCreditsDrawerOpen(true)
                    }}
                    onTogglePhoneGateway={() =>
                      handleTogglePhoneGateway(
                        account.id,
                        !!account.routeAllSmsViaPhoneGateway
                      )
                    }
                    onSuspend={() => handleSuspend(account.id, account.isActive)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-200">
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Sender IDs</p>
                    <p className="text-sm font-medium text-slate-900">
                      {account.senderIds.length > 0
                        ? account.senderIds.map((s) => s.senderName).join(', ')
                        : 'None assigned'}
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
                    <p className="text-xs text-slate-500 mb-1">Deliveries</p>
                    <DeliveryCounts account={account} />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Credits</p>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedAccount(account)
                        setCreditAction('set_credits')
                        setCreditAmount(String(account.credits ?? 0))
                        setCreditReason('')
                        setCreditsDrawerOpen(true)
                      }}
                      className="text-sm font-medium text-slate-900 hover:text-emerald-700 hover:underline"
                    >
                      {account.credits.toLocaleString()}
                    </button>
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
          <Dialog
            open={senderIdDrawerOpen}
            onOpenChange={(open) => {
              setSenderIdDrawerOpen(open)
              if (!open) {
                setReplacingSenderId(null)
                setReplaceTargetId('')
              } else if (allSenderIds.length === 0) {
                fetchAllSenderIds()
              }
            }}
          >
            <DialogContent className="max-w-2xl bg-white border border-slate-200 rounded-2xl shadow-xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-xl font-semibold text-slate-900">
                  Manage Sender IDs — {selectedAccount.name}
                </DialogTitle>
                <DialogDescription className="text-slate-600">
                  Assign shared sender IDs to this account. Each user keeps their own SMS history and credits — sender IDs are labels only, not wallets.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-slate-700">
                    Assigned to {selectedAccount.name} ({selectedAccount.senderIds.length})
                  </Label>
                  {selectedAccount.senderIds.length === 0 ? (
                    <p className="text-sm text-slate-500 py-4 text-center border border-dashed border-slate-200 rounded-lg">
                      No sender IDs assigned yet. Add one from HostPinnacle below.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {selectedAccount.senderIds.map((sid) => (
                        <div
                          key={sid.id}
                          className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-3"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-medium text-slate-900">{sid.senderName}</span>
                              {sid.isDefault && (
                                <span className="px-2 py-0.5 text-xs font-medium bg-emerald-100 text-emerald-700 rounded">
                                  Default
                                </span>
                              )}
                              <span className="text-xs text-slate-500 capitalize">{sid.status}</span>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              {!sid.isDefault && (
                                <button
                                  onClick={() => handleSetDefault(sid.id)}
                                  disabled={actionLoading}
                                  className="px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
                                >
                                  Set Default
                                </button>
                              )}
                              <button
                                onClick={() => {
                                  setReplacingSenderId(replacingSenderId === sid.id ? null : sid.id)
                                  setReplaceTargetId('')
                                }}
                                disabled={actionLoading}
                                className="px-3 py-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition-colors disabled:opacity-50"
                              >
                                {replacingSenderId === sid.id ? 'Cancel' : 'Replace'}
                              </button>
                              <button
                                onClick={() => handleUnassignSenderId(sid.id, sid.senderName)}
                                disabled={actionLoading}
                                className="px-3 py-1.5 text-xs font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                              >
                                Remove
                              </button>
                            </div>
                          </div>

                          {replacingSenderId === sid.id && (
                            <div className="pt-3 border-t border-slate-200 space-y-3">
                              <p className="text-xs text-slate-600">
                                Choose a new HostPinnacle sender ID to replace <strong>{sid.senderName}</strong>
                              </p>
                              <Select value={replaceTargetId} onValueChange={setReplaceTargetId}>
                                <SelectTrigger className="w-full border-slate-200 bg-white">
                                  <SelectValue placeholder="Select replacement sender ID" />
                                </SelectTrigger>
                                <SelectContent>
                                  {getAvailableReplacementIds(sid.id).length === 0 ? (
                                    <SelectItem value="__none" disabled>
                                      No other sender IDs available — fetch from HostPinnacle first
                                    </SelectItem>
                                  ) : (
                                    getAvailableReplacementIds(sid.id).map((hpSid) => (
                                      <SelectItem key={hpSid.id} value={hpSid.id}>
                                        {hpSid.senderName}
                                        {formatSharedLabel(hpSid, selectedAccount.id)
                                          ? ` (${formatSharedLabel(hpSid, selectedAccount.id)})`
                                          : ''}
                                      </SelectItem>
                                    ))
                                  )}
                                </SelectContent>
                              </Select>
                              <button
                                onClick={() => handleReplaceSenderId(sid.id)}
                                disabled={!replaceTargetId || actionLoading}
                                className="w-full px-3 py-2 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                              >
                                {actionLoading ? 'Replacing...' : 'Replace with selected ID'}
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <Separator />

                <div className="flex items-center justify-between gap-3">
                  <Label className="text-sm font-medium text-slate-700">
                    Add from HostPinnacle ({allSenderIds.length})
                  </Label>
                  <button
                    onClick={fetchAllSenderIds}
                    disabled={fetchingSenderIds}
                    className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-60"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${fetchingSenderIds ? 'animate-spin' : ''}`} />
                    Refresh
                  </button>
                </div>

                <p className="text-xs text-slate-500 mb-3">
                  Same sender ID can be added to multiple accounts. Each user keeps their own credits and SMS history.
                </p>

                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {fetchingSenderIds && allSenderIds.length === 0 ? (
                    <p className="text-sm text-slate-500 py-6 text-center">Fetching sender IDs from HostPinnacle...</p>
                  ) : allSenderIds.length === 0 ? (
                    <p className="text-sm text-slate-500 py-6 text-center">
                      No sender IDs found. Click Refresh to load from HostPinnacle.
                    </p>
                  ) : (
                    allSenderIds
                      .filter(
                        (sid) =>
                          !selectedAccount.senderIds.some(
                            (asid) => asid.id === sid.id || asid.senderName === sid.senderName
                          )
                      )
                      .map((sid) => (
                        <div
                          key={sid.id || sid.senderName}
                          className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-lg"
                        >
                          <div>
                            <span className="text-sm font-medium text-slate-900">{sid.senderName}</span>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <span className="text-xs text-slate-500 capitalize">{sid.status}</span>
                              {formatSharedLabel(sid, selectedAccount.id) ? (
                                <span className="text-xs text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">
                                  {formatSharedLabel(sid, selectedAccount.id)}
                                </span>
                              ) : sid.assignedCount && sid.assignedCount > 0 ? (
                                <span className="text-xs text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">
                                  Shared with {sid.assignedCount} account{sid.assignedCount === 1 ? '' : 's'}
                                </span>
                              ) : null}
                            </div>
                          </div>
                          <button
                            onClick={() => handleAssignSenderId(sid.id, sid.senderName)}
                            disabled={assigningSenderId === sid.id || actionLoading}
                            className="px-3 py-1.5 text-xs font-medium text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors disabled:opacity-50"
                          >
                            {assigningSenderId === sid.id ? 'Adding...' : 'Add'}
                          </button>
                        </div>
                      ))
                  )}
                  {!fetchingSenderIds &&
                    allSenderIds.length > 0 &&
                    allSenderIds.filter(
                      (sid) =>
                        !selectedAccount.senderIds.some(
                          (asid) => asid.id === sid.id || asid.senderName === sid.senderName
                        )
                    ).length === 0 && (
                      <p className="text-sm text-slate-500 py-4 text-center">
                        All available HostPinnacle sender IDs are already on this account.
                      </p>
                    )}
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* Adjust Credits Modal */}
        {selectedAccount && (
          <Dialog open={creditsDrawerOpen} onOpenChange={setCreditsDrawerOpen}>
            <DialogContent className="max-w-md bg-white border border-slate-200 rounded-2xl shadow-xl">
              <DialogHeader>
                <DialogTitle className="text-xl font-semibold text-slate-900">
                  Edit Credits — {selectedAccount.name}
                </DialogTitle>
                <DialogDescription className="text-slate-600">
                  {creditAction === 'set_credits'
                    ? 'Set this account’s SMS credit balance to an exact number, including 0.'
                    : creditAction === 'add_credits'
                    ? 'Enter the KSh amount the customer paid (e.g. missed M-Pesa). Credits are calculated automatically.'
                    : 'Remove SMS credits directly from this account.'}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                  <p className="text-xs text-slate-500 mb-1">Current balance</p>
                  <p className="text-2xl font-bold text-slate-900">
                    {selectedAccount.credits.toLocaleString()} <span className="text-sm font-normal text-slate-500">SMS credits</span>
                  </p>
                </div>

                <div>
                  <Label className="text-sm font-medium text-slate-700 mb-2 block">Action</Label>
                  <Select
                    value={creditAction}
                    onValueChange={(v) => {
                      setCreditAction(v as 'set_credits' | 'add_credits' | 'remove_credits')
                      setCreditAmount(
                        v === 'set_credits' ? String(selectedAccount.credits ?? 0) : ''
                      )
                    }}
                  >
                    <SelectTrigger className="border-slate-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="set_credits">Set exact balance</SelectItem>
                      <SelectItem value="add_credits">Add credits (from KSh paid)</SelectItem>
                      <SelectItem value="remove_credits">Remove credits</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-sm font-medium text-slate-700 mb-2 block">
                    {creditAction === 'set_credits'
                      ? 'SMS credit balance'
                      : creditAction === 'add_credits'
                      ? 'Amount paid (KSh)'
                      : 'Credits to remove'}
                  </Label>
                  <Input
                    type="number"
                    min={creditAction === 'set_credits' ? 0 : 1}
                    step={creditAction === 'add_credits' ? 'any' : 1}
                    value={creditAmount}
                    onChange={(e) => setCreditAmount(e.target.value)}
                    placeholder={
                      creditAction === 'set_credits'
                        ? 'e.g. 0'
                        : creditAction === 'add_credits'
                        ? 'e.g. 300'
                        : 'e.g. 100'
                    }
                    autoComplete="off"
                    className={MODAL_INPUT_CLASS}
                  />
                  {creditAction === 'add_credits' ? (
                    <p className="text-xs text-slate-500 mt-1">
                      KSh {pricePerCreditKes.toFixed(2)} per credit
                      {addCreditsPreview > 0 && (
                        <span className="text-emerald-700 font-medium">
                          {' '}
                          → {addCreditsPreview.toLocaleString()} SMS credits
                        </span>
                      )}
                    </p>
                  ) : (
                    <p className="text-xs text-slate-500 mt-1">1 credit ≈ 1 SMS segment (up to 153 characters)</p>
                  )}
                </div>

                <div>
                  <Label className="text-sm font-medium text-slate-700 mb-2 block">Reason (optional)</Label>
                  <Input
                    value={creditReason}
                    onChange={(e) => setCreditReason(e.target.value)}
                    placeholder="e.g. M-Pesa not picked up, receipt ABC123"
                    autoComplete="off"
                    className={MODAL_INPUT_CLASS}
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                  <button
                    onClick={() => setCreditsDrawerOpen(false)}
                    className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAdjustCredits}
                    disabled={
                      creditSubmitting ||
                      creditAmount === '' ||
                      (creditAction === 'add_credits' && addCreditsPreview <= 0)
                    }
                    className="px-4 py-2 text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-700 rounded-xl transition-colors disabled:opacity-50"
                  >
                    {creditSubmitting
                      ? 'Saving...'
                      : creditAction === 'set_credits'
                        ? 'Save balance'
                        : creditAction === 'add_credits'
                        ? addCreditsPreview > 0
                          ? `Add ${addCreditsPreview.toLocaleString()} Credits`
                          : 'Add Credits'
                        : 'Remove Credits'}
                  </button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {editingPricingRule && selectedAccount && (
          <PricingRuleEditorDialog
            open={pricingDrawerOpen}
            onOpenChange={(open) => {
              setPricingDrawerOpen(open)
              if (!open) setEditingPricingRule(null)
            }}
            rule={editingPricingRule}
            title={`Pricing Override - ${selectedAccount.name}`}
            description={`${selectedAccount.email} · Custom pricing for this account. Use Remove to fall back to global.`}
            onChange={setEditingPricingRule}
            onSave={() => {
              if (pricingSubmitting) return
              void handleSavePricingOverride()
            }}
            onRemove={
              selectedAccount.pricing
                ? () => {
                    if (pricingSubmitting) return
                    void handleRemovePricingOverride()
                  }
                : undefined
            }
          />
        )}
      </div>
    </div>
  )
}

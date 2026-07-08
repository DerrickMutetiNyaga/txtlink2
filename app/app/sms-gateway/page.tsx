'use client'

import { PortalLayout } from '@/components/portal-layout'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useState, useEffect, useCallback } from 'react'
import {
  Copy,
  Check,
  RefreshCw,
  Smartphone,
  Key,
  Wifi,
  Shield,
  AlertTriangle,
  ListOrdered,
  Inbox,
  FlaskConical,
  XCircle,
  Trash2,
  ChevronDown,
  Link2,
  Activity,
  Send,
  RotateCw,
  CheckCircle2,
  ChevronRight,
} from 'lucide-react'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { useToast } from '@/hooks/use-toast'
import { getPhoneJobStatusLabel } from '@/lib/services/sms-fallback/phone-status'

interface GatewayStatus {
  hasToken: boolean
  isActive: boolean
  isOnline: boolean
  connectionStatus: 'online' | 'offline' | 'stopped' | 'waiting' | 'not_connected'
  latestActivityAt?: string | null
  tokenStatus: 'active' | 'revoked' | 'none'
  label?: string
  boundDeviceName?: string | null
  boundSimLabel?: string | null
  lastHeartbeatAt?: string | null
  lastSyncAt?: string | null
  lastIp?: string | null
  lastUserAgent?: string | null
  appVersion?: string | null
  batteryLevel?: number | null
  isSmsPermissionGranted?: boolean | null
  isGatewayRunning?: boolean | null
  requiresTopUp?: boolean
  showTopUpAlert?: boolean
  lastFailureAt?: string | null
  lastFailureReason?: string | null
  lastFailureCode?: string | null
  pendingPhoneJobs?: number
  blockedTopUpJobs?: number
}

interface FallbackJobRow {
  id: string
  originalSmsId: string
  recipientPhone: string
  message: string
  source?: string
  originalStatus?: string
  retryStatus?: string
  status: string
  phoneStatus?: string
  attempts: number
  maxAttempts?: number
  createdAt: string
  sendingAt?: string | null
  sentAt?: string | null
  deliveredAt?: string | null
  failedAt?: string | null
  deviceName?: string | null
  simLabel?: string | null
  failureReason?: string | null
  failureCode?: string | null
  resetReason?: string | null
  isTest?: boolean
}

const BTN = {
  primary:
    'rounded-xl bg-[#2F9B73] px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-[#267D5E] disabled:opacity-50',
  secondary:
    'rounded-xl border border-[#E2E8F0] bg-white px-4 py-2 text-sm font-medium text-[#2F9B73] shadow-sm hover:bg-[#ECFDF5] hover:text-[#267D5E]',
  danger:
    'rounded-xl border border-red-200 bg-white px-4 py-2 text-sm font-medium text-[#EF4444] hover:bg-red-50 disabled:opacity-50',
  warning:
    'rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-800 hover:bg-amber-100',
  ghost:
    'rounded-xl border border-[#E2E8F0] bg-white px-3 py-1.5 text-xs font-semibold shadow-sm',
} as const

const CARD = 'bg-white border border-[#E2E8F0] shadow-sm rounded-xl'

function StatusBadge({
  label,
  variant,
  compact = false,
}: {
  label: string
  variant: 'green' | 'red' | 'amber' | 'gray' | 'blue'
  compact?: boolean
}) {
  const styles = {
    green: 'bg-[#ECFDF5] text-[#267D5E] border-[#2F9B73]/20',
    red: 'bg-red-50 text-[#EF4444] border-red-200',
    amber: 'bg-amber-50 text-amber-800 border-amber-200',
    gray: 'bg-slate-100 text-[#64748B] border-[#E2E8F0]',
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
  }

  return (
    <span
      className={`inline-flex items-center rounded-full font-semibold border ${styles[variant]} ${
        compact ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-0.5 text-xs'
      }`}
    >
      {label}
    </span>
  )
}

function getJobBadgeVariant(
  displayStatus: string
): 'green' | 'red' | 'amber' | 'gray' | 'blue' {
  if (['delivered', 'sent', 'delivered_via_phone', 'sent_via_phone'].includes(displayStatus)) {
    return 'green'
  }
  if (displayStatus === 'failed' || displayStatus === 'phone_failed') return 'red'
  if (displayStatus === 'sending' || displayStatus === 'sending_via_phone') return 'blue'
  if (displayStatus === 'cancelled') return 'gray'
  if (['blocked', 'requires_topup', 'phone_requires_topup'].includes(displayStatus)) {
    return 'amber'
  }
  return 'amber'
}

function StepCircle({ n, label, sub }: { n: number; label: string; sub?: string }) {
  return (
    <div className="flex flex-col items-center text-center flex-1 min-w-0">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#ECFDF5] text-sm font-bold text-[#2F9B73]">
        {n}
      </div>
      <p className="mt-2 text-sm font-medium text-[#0F172A]">{label}</p>
      {sub ? <p className="mt-0.5 text-xs text-[#64748B]">{sub}</p> : null}
    </div>
  )
}

export default function SmsGatewayPage() {
  const { toast } = useToast()
  const [apiBaseUrl, setApiBaseUrl] = useState('')
  const [gateway, setGateway] = useState<GatewayStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [revoking, setRevoking] = useState(false)
  const [newToken, setNewToken] = useState('')
  const [showTokenModal, setShowTokenModal] = useState(false)
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [fallbackJobs, setFallbackJobs] = useState<FallbackJobRow[]>([])
  const [queueFilter, setQueueFilter] = useState<'active' | 'completed' | 'all'>('active')
  const [showTestModal, setShowTestModal] = useState(false)
  const [testPhone, setTestPhone] = useState('')
  const [testMessage, setTestMessage] = useState('TXTLINK test — phone gateway connection OK.')
  const [creatingTest, setCreatingTest] = useState(false)
  const [clearingTestJobs, setClearingTestJobs] = useState(false)
  const [jobActionId, setJobActionId] = useState<string | null>(null)
  const [clearingAlert, setClearingAlert] = useState(false)
  const [resumingGateway, setResumingGateway] = useState(false)
  const [retryingBlocked, setRetryingBlocked] = useState(false)
  const [connectionCode, setConnectionCode] = useState('')
  const [generatingConnectionCode, setGeneratingConnectionCode] = useState(false)
  const [replaceOldToken, setReplaceOldToken] = useState(true)
  const [showAdvancedSetup, setShowAdvancedSetup] = useState(false)
  const [resettingAndGenerating, setResettingAndGenerating] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setApiBaseUrl(`${window.location.origin}/api/sms-gateway`)
    }
  }, [])

  const fetchStatus = useCallback(async () => {
    try {
      const token = localStorage.getItem('token')
      const [gatewayRes, jobsRes] = await Promise.all([
        fetch('/api/user/sms-gateway', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`/api/user/sms-fallback?filter=${queueFilter}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ])
      if (gatewayRes.ok) {
        const data = await gatewayRes.json()
        setGateway(data.gateway)
      }
      if (jobsRes.ok) {
        const data = await jobsRes.json()
        setFallbackJobs(data.jobs || [])
      }
    } catch (error) {
      console.error('Failed to fetch gateway status:', error)
    } finally {
      setLoading(false)
    }
  }, [queueFilter])

  useEffect(() => {
    fetchStatus()
    const interval = setInterval(fetchStatus, 30000)
    return () => clearInterval(interval)
  }, [fetchStatus])

  const handleCopy = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedField(field)
      setTimeout(() => setCopiedField(null), 2000)
      toast({ title: 'Copied', description: 'Copied to clipboard.' })
    } catch {
      toast({
        title: 'Copy failed',
        description: 'Could not copy to clipboard.',
        variant: 'destructive',
      })
    }
  }

  const handleGenerateConnectionCode = async (options?: {
    resetBinding?: boolean
    skipReplaceConfirm?: boolean
  }) => {
    const resetBinding = options?.resetBinding ?? false

    if (
      !options?.skipReplaceConfirm &&
      replaceOldToken &&
      gateway?.hasToken &&
      gateway?.isActive
    ) {
      const message = resetBinding
        ? 'Reset device binding and generate a new connection code? This replaces the current token. The Android app must be updated with the new code.'
        : 'Generate a new connection code? This replaces the current active token and clears device binding. The Android app must be updated with the new code.'
      if (!confirm(message)) {
        return
      }
    }

    if (resetBinding) {
      setResettingAndGenerating(true)
    } else {
      setGeneratingConnectionCode(true)
    }

    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/user/sms-gateway/connection-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ replaceOldToken: resetBinding ? true : replaceOldToken }),
      })
      const data = await response.json()
      if (response.ok) {
        setConnectionCode(data.connectionCode)
        toast({
          title: 'Connection code generated',
          description: data.message,
        })
        await fetchStatus()
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to generate connection code.',
          variant: 'destructive',
        })
      }
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to generate connection code.',
        variant: 'destructive',
      })
    } finally {
      setGeneratingConnectionCode(false)
      setResettingAndGenerating(false)
    }
  }

  const handleGenerateToken = async () => {
    if (gateway?.hasToken && gateway?.isActive) {
      if (
        !confirm(
          'Generate a new token? This replaces the current active token and clears device binding. The Android app must be updated with the new token.'
        )
      ) {
        return
      }
    }
    setGenerating(true)
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/user/sms-gateway/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ replaceOldToken: true }),
      })
      const data = await response.json()
      if (response.ok) {
        setNewToken(data.token)
        setShowTokenModal(true)
        await fetchStatus()
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to generate token.',
          variant: 'destructive',
        })
      }
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to generate token.',
        variant: 'destructive',
      })
    } finally {
      setGenerating(false)
    }
  }

  const handleResetBinding = async () => {
    if (
      !confirm(
        'Reset device binding and clear gateway pause? The current token will stay active but can reconnect from the same or a different phone.'
      )
    ) {
      return
    }
    setResetting(true)
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/user/sms-gateway/reset-binding', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await response.json()
      if (response.ok) {
        toast({
          title: 'Binding & pause cleared',
          description: data.message,
        })
        await fetchStatus()
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to reset binding.',
          variant: 'destructive',
        })
      }
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to reset binding.',
        variant: 'destructive',
      })
    } finally {
      setResetting(false)
    }
  }

  const handleRevokeToken = async () => {
    if (
      !confirm(
        'Revoke this device token? The Android app will stop working until you generate a new token.'
      )
    ) {
      return
    }
    setRevoking(true)
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/user/sms-gateway/revoke', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await response.json()
      if (response.ok) {
        toast({ title: 'Token revoked', description: data.message })
        await fetchStatus()
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to revoke token.',
          variant: 'destructive',
        })
      }
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to revoke token.',
        variant: 'destructive',
      })
    } finally {
      setRevoking(false)
    }
  }

  const handleResumeGateway = async () => {
    setResumingGateway(true)
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/user/sms-gateway/resume', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await response.json()
      if (response.ok) {
        toast({ title: 'Gateway resumed', description: data.message })
        await fetchStatus()
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to resume gateway',
          variant: 'destructive',
        })
      }
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to resume gateway',
        variant: 'destructive',
      })
    } finally {
      setResumingGateway(false)
    }
  }

  const handleRetryBlockedJobs = async () => {
    setRetryingBlocked(true)
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/user/sms-gateway/retry-blocked-jobs', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await response.json()
      if (response.ok) {
        toast({ title: 'Jobs re-queued', description: data.message })
        await fetchStatus()
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to retry blocked jobs',
          variant: 'destructive',
        })
      }
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to retry blocked jobs',
        variant: 'destructive',
      })
    } finally {
      setRetryingBlocked(false)
    }
  }

  const handleClearAlert = async () => {
    setClearingAlert(true)
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/user/sms-gateway/clear-alert', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await response.json()
      if (response.ok) {
        toast({ title: 'Alert cleared', description: data.message })
        await fetchStatus()
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to clear alert',
          variant: 'destructive',
        })
      }
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to clear alert',
        variant: 'destructive',
      })
    } finally {
      setClearingAlert(false)
    }
  }

  const handleCancelJob = async (job: FallbackJobRow) => {
    if (
      !confirm(
        `Cancel this ${job.isTest ? 'test ' : ''}phone fallback job? It will no longer be sent by the gateway.`
      )
    ) {
      return
    }
    setJobActionId(job.id)
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/user/sms-fallback/jobs/${job.id}/cancel`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await response.json()
      if (response.ok) {
        toast({ title: 'Job cancelled', description: data.message })
        await fetchStatus()
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to cancel job.',
          variant: 'destructive',
        })
      }
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to cancel job.',
        variant: 'destructive',
      })
    } finally {
      setJobActionId(null)
    }
  }

  const handleDeleteJob = async (job: FallbackJobRow) => {
    if (
      !confirm(
        `Delete this ${job.isTest ? 'test ' : ''}job from the queue? This cannot be undone.`
      )
    ) {
      return
    }
    setJobActionId(job.id)
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/user/sms-fallback/jobs/${job.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await response.json()
      if (response.ok) {
        toast({ title: 'Job deleted', description: data.message })
        await fetchStatus()
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to delete job.',
          variant: 'destructive',
        })
      }
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to delete job.',
        variant: 'destructive',
      })
    } finally {
      setJobActionId(null)
    }
  }

  const handleClearCompletedTestJobs = async () => {
    if (
      !confirm(
        'Remove completed test jobs (sent, failed, or cancelled) from the queue?'
      )
    ) {
      return
    }
    setClearingTestJobs(true)
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/user/sms-gateway/clear-test-jobs', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await response.json()
      if (response.ok) {
        toast({ title: 'Test jobs cleared', description: data.message })
        await fetchStatus()
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to clear test jobs.',
          variant: 'destructive',
        })
      }
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to clear test jobs.',
        variant: 'destructive',
      })
    } finally {
      setClearingTestJobs(false)
    }
  }

  const handleCreateTestJob = async () => {
    if (!testPhone.trim() || !testMessage.trim()) {
      toast({
        title: 'Missing fields',
        description: 'Enter a phone number and message.',
        variant: 'destructive',
      })
      return
    }
    setCreatingTest(true)
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/user/sms-gateway/test-job', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ phone: testPhone.trim(), message: testMessage.trim() }),
      })
      const data = await response.json()
      if (response.ok) {
        toast({
          title: 'Test job created',
          description: 'Your Android app can fetch it from /jobs/pending.',
        })
        setShowTestModal(false)
        setTestPhone('')
        await fetchStatus()
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to create test job.',
          variant: 'destructive',
        })
      }
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to create test job.',
        variant: 'destructive',
      })
    } finally {
      setCreatingTest(false)
    }
  }

  const formatDate = (date: string | null | undefined) => {
    if (!date) return '—'
    return new Date(date).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const connectionBadge = (compact = false) => {
    switch (gateway?.connectionStatus) {
      case 'online':
        return <StatusBadge label="Online" variant="green" compact={compact} />
      case 'offline':
        return <StatusBadge label="Offline" variant="red" compact={compact} />
      case 'stopped':
        return <StatusBadge label="Stopped" variant="gray" compact={compact} />
      case 'waiting':
        return <StatusBadge label="Waiting" variant="amber" compact={compact} />
      default:
        return <StatusBadge label="Not connected" variant="gray" compact={compact} />
    }
  }

  const connectionStatusText = () => {
    switch (gateway?.connectionStatus) {
      case 'online':
        return 'Online'
      case 'offline':
        return 'Offline'
      case 'stopped':
        return 'Stopped'
      case 'waiting':
        return 'Waiting'
      default:
        return 'Not connected'
    }
  }

  const smsPermissionBadge = () => {
    if (gateway?.isSmsPermissionGranted == null) {
      return <StatusBadge label="Unknown" variant="gray" />
    }
    return gateway.isSmsPermissionGranted ? (
      <StatusBadge label="Granted" variant="green" />
    ) : (
      <StatusBadge label="Missing" variant="red" />
    )
  }

  const gatewayRunningBadge = () => {
    if (gateway?.requiresTopUp) {
      return <StatusBadge label="Paused" variant="amber" />
    }
    if (gateway?.isGatewayRunning == null) {
      return <StatusBadge label="Unknown" variant="gray" />
    }
    return gateway.isGatewayRunning ? (
      <StatusBadge label="Running" variant="green" />
    ) : (
      <StatusBadge label="Stopped" variant="gray" />
    )
  }

  const gatewayRunningText = () => {
    if (gateway?.requiresTopUp) return 'Paused'
    if (gateway?.isGatewayRunning == null) return 'Unknown'
    return gateway.isGatewayRunning ? 'Running' : 'Stopped'
  }

  const tokenBadge = () => {
    if (!gateway?.hasToken) {
      return <StatusBadge label="No token" variant="gray" />
    }
    if (gateway.tokenStatus === 'active') {
      return <StatusBadge label="Token active" variant="green" />
    }
    return <StatusBadge label="Token revoked" variant="red" />
  }

  const fallbackSteps = [
    { icon: Send, text: 'Provider sends SMS' },
    { icon: RotateCw, text: 'If not delivered after 7 min, provider retries once' },
    { icon: Smartphone, text: 'If retry fails, phone gateway queues the SMS' },
    { icon: Activity, text: 'Android app sends when online' },
    { icon: CheckCircle2, text: 'Delivered via Phone updates history' },
  ]

  return (
    <PortalLayout activeSection="SMS Gateway">
      <div className="space-y-6 min-w-0 max-w-full">
        {/* Page Header */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-semibold text-[#0F172A] mb-1">
              SMS Gateway
            </h1>
            <p className="text-[#64748B]">
              Connect your Android phone gateway and manage automatic SMS fallback.
            </p>
            <div className="flex flex-wrap gap-2 mt-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#E2E8F0] bg-white px-3 py-1 text-xs">
                <span className="text-[#64748B]">Gateway</span>
                {connectionBadge(true)}
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[#E2E8F0] bg-white px-3 py-1 text-xs">
                <span className="text-[#64748B]">Fallback</span>
                <StatusBadge label="Enabled" variant="green" compact />
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[#E2E8F0] bg-white px-3 py-1 text-xs">
                <span className="text-[#64748B]">Provider Retry</span>
                <StatusBadge label="Enabled" variant="green" compact />
              </div>
            </div>
          </div>
          <Button
            variant="outline"
            className={`w-full sm:w-auto shrink-0 ${BTN.secondary}`}
            onClick={() => {
              setLoading(true)
              fetchStatus()
            }}
            disabled={loading}
          >
            <RefreshCw
              size={16}
              className={`mr-2 ${loading ? 'animate-spin' : ''}`}
            />
            Refresh
          </Button>
        </div>

        {gateway?.showTopUpAlert && (
          <Card className={`p-5 ${CARD} border-amber-200 bg-amber-50/60`}>
            <div className="flex flex-col gap-4">
              <div className="flex gap-3">
                <div className="p-2 rounded-xl bg-amber-100 text-amber-700 shrink-0">
                  <AlertTriangle size={20} />
                </div>
                <div className="min-w-0">
                  <h2 className="text-base font-semibold text-[#0F172A] mb-1">
                    Phone Gateway Needs Reload
                  </h2>
                  <p className="text-sm text-[#64748B] mb-3">
                    The gateway phone could not send SMS. Reload the line, then resume the
                    gateway.
                  </p>
                  <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2 text-sm">
                    <div>
                      <dt className="text-[#64748B] text-xs">Device</dt>
                      <dd className="font-medium text-[#0F172A] truncate">
                        {gateway.boundDeviceName || '—'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[#64748B] text-xs">Blocked jobs</dt>
                      <dd className="font-medium text-[#0F172A]">
                        {gateway.blockedTopUpJobs ?? 0}
                      </dd>
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                      <dt className="text-[#64748B] text-xs">Last failure</dt>
                      <dd className="font-medium text-[#0F172A] truncate">
                        {gateway.lastFailureReason || '—'}
                      </dd>
                    </div>
                  </dl>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button className={BTN.primary} onClick={handleResumeGateway} disabled={resumingGateway}>
                  {resumingGateway ? 'Resuming…' : 'Mark Reloaded / Resume'}
                </Button>
                <Button
                  variant="outline"
                  className={BTN.secondary}
                  onClick={handleRetryBlockedJobs}
                  disabled={retryingBlocked || (gateway.blockedTopUpJobs ?? 0) === 0}
                >
                  {retryingBlocked ? 'Re-queuing…' : 'Retry Phone Fallback'}
                </Button>
                <Button
                  variant="outline"
                  className={BTN.secondary}
                  onClick={handleClearAlert}
                  disabled={clearingAlert}
                >
                  {clearingAlert ? 'Clearing…' : 'Clear Alert'}
                </Button>
              </div>
            </div>
          </Card>
        )}

        {!gateway?.isOnline &&
          gateway?.hasToken &&
          (gateway.pendingPhoneJobs ?? 0) > 0 &&
          !gateway?.requiresTopUp && (
            <Card className={`p-4 ${CARD}`}>
              <div className="flex gap-3">
                <div className="p-2 rounded-lg bg-[#ECFDF5] text-[#2F9B73] shrink-0">
                  <Smartphone size={18} />
                </div>
                <div>
                  <h2 className="font-semibold text-[#0F172A] mb-0.5 text-sm">Gateway Offline</h2>
                  <p className="text-sm text-[#64748B]">
                    <strong className="text-[#0F172A]">{gateway.pendingPhoneJobs}</strong>{' '}
                    job(s) waiting safely until the app comes back online.
                  </p>
                </div>
              </div>
            </Card>
          )}

        {loading && !gateway ? (
          <Card className={`p-12 ${CARD} text-center`}>
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-[#64748B]" />
            <p className="text-[#64748B]">Loading gateway status...</p>
          </Card>
        ) : (
          <div className="space-y-6 min-w-0">
            {/* Connection Setup */}
            <Card className={`p-6 ${CARD}`}>
              <div className="mb-5">
                <h2 className="text-lg font-semibold text-[#0F172A]">Connect Android Gateway</h2>
                <p className="text-sm text-[#64748B] mt-1">
                  Generate one secure connection code, paste it into the Android app, choose your
                  SIM, and start the gateway.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-start gap-4 sm:gap-2 mb-6">
                <StepCircle n={1} label="Generate code" />
                <ChevronRight className="hidden sm:block text-[#E2E8F0] shrink-0 mt-2" size={20} />
                <StepCircle n={2} label="Paste in app" />
                <ChevronRight className="hidden sm:block text-[#E2E8F0] shrink-0 mt-2" size={20} />
                <StepCircle n={3} label="Choose SIM & start" />
              </div>

              <label className="inline-flex items-center gap-2 mb-5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={replaceOldToken}
                  onChange={(e) => setReplaceOldToken(e.target.checked)}
                  className="h-3.5 w-3.5 rounded border-[#E2E8F0] text-[#2F9B73] focus:ring-[#2F9B73]/30"
                />
                <span className="text-sm text-[#64748B]">Replace old active token</span>
              </label>

              {!connectionCode ? (
                <Button
                  className={`w-full sm:w-auto ${BTN.primary}`}
                  onClick={() => handleGenerateConnectionCode()}
                  disabled={generatingConnectionCode}
                >
                  {generatingConnectionCode ? (
                    <>
                      <RefreshCw size={16} className="mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Link2 size={16} className="mr-2" />
                      Generate Connection Code
                    </>
                  )}
                </Button>
              ) : (
                <div className="space-y-4 max-w-2xl">
                  <div>
                    <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wide mb-2">
                      App Connection Code
                    </p>
                    <div className="max-h-32 overflow-auto rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-4">
                      <code className="text-xs font-mono text-[#0F172A] break-all whitespace-pre-wrap">
                        {connectionCode}
                      </code>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button
                      className={BTN.primary}
                      onClick={() => handleCopy(connectionCode, 'connectionCode')}
                    >
                      {copiedField === 'connectionCode' ? (
                        <Check size={16} className="mr-2" />
                      ) : (
                        <Copy size={16} className="mr-2" />
                      )}
                      Copy Connection Code
                    </Button>
                    <Button
                      variant="outline"
                      className={BTN.secondary}
                      onClick={() => handleGenerateConnectionCode()}
                      disabled={generatingConnectionCode}
                    >
                      {generatingConnectionCode ? 'Generating...' : 'Generate New Code'}
                    </Button>
                    <Button
                      variant="outline"
                      className={BTN.danger}
                      onClick={handleRevokeToken}
                      disabled={revoking || !gateway?.hasToken || !gateway?.isActive}
                    >
                      {revoking ? 'Revoking...' : 'Revoke Token'}
                    </Button>
                  </div>

                  <div className="flex gap-2 rounded-xl border border-amber-200 bg-amber-50/80 p-3">
                    <AlertTriangle size={16} className="text-[#F59E0B] shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-900">
                      Copy this code now. It contains the device token and will not be shown
                      again.
                    </p>
                  </div>
                </div>
              )}
            </Card>

            {/* Gateway Health Summary */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <Card className={`p-4 ${CARD}`}>
                <p className="text-xs font-medium text-[#64748B] mb-2">Gateway Status</p>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-lg font-semibold text-[#0F172A] truncate">
                    {connectionStatusText()}
                  </p>
                  {connectionBadge(true)}
                </div>
              </Card>
              <Card className={`p-4 ${CARD}`}>
                <p className="text-xs font-medium text-[#64748B] mb-2">Last Activity</p>
                <p className="text-sm font-semibold text-[#0F172A] leading-snug">
                  {formatDate(gateway?.latestActivityAt)}
                </p>
              </Card>
              <Card className={`p-4 ${CARD}`}>
                <p className="text-xs font-medium text-[#64748B] mb-2">SMS Permission</p>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-lg font-semibold text-[#0F172A]">
                    {gateway?.isSmsPermissionGranted == null
                      ? '—'
                      : gateway.isSmsPermissionGranted
                        ? 'Granted'
                        : 'Missing'}
                  </p>
                  {smsPermissionBadge()}
                </div>
              </Card>
              <Card className={`p-4 ${CARD}`}>
                <p className="text-xs font-medium text-[#64748B] mb-2">Gateway Running</p>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-lg font-semibold text-[#0F172A] truncate">
                    {gatewayRunningText()}
                  </p>
                  {gatewayRunningBadge()}
                </div>
              </Card>
            </div>

            {/* Status Details + Fallback Flow */}
            <div className="grid gap-6 lg:grid-cols-2 min-w-0">
              <Card className={`p-5 ${CARD}`}>
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-2 rounded-lg bg-[#ECFDF5] text-[#2F9B73]">
                    <Smartphone size={18} />
                  </div>
                  <div>
                    <h2 className="text-base font-semibold text-[#0F172A]">Gateway Status</h2>
                    <p className="text-xs text-[#64748B]">Live device telemetry</p>
                  </div>
                </div>
                <dl className="divide-y divide-[#E2E8F0] text-sm">
                  {[
                    ['Device name', gateway?.boundDeviceName || '—', null],
                    ['SIM label', gateway?.boundSimLabel || '—', null],
                    ['Latest activity', formatDate(gateway?.latestActivityAt), null],
                    ['Last heartbeat', formatDate(gateway?.lastHeartbeatAt), null],
                    ['Last sync', formatDate(gateway?.lastSyncAt), null],
                    [
                      'Battery level',
                      gateway?.batteryLevel != null ? `${gateway.batteryLevel}%` : '—',
                      null,
                    ],
                    ['SMS permission', null, smsPermissionBadge()],
                    ['Gateway running', null, gatewayRunningBadge()],
                  ].map(([label, value, badge]) => (
                    <div key={String(label)} className="flex items-center justify-between py-2.5 gap-3">
                      <dt className="text-[#64748B] shrink-0">{label}</dt>
                      <dd className="font-medium text-[#0F172A] text-right truncate min-w-0">
                        {badge || value}
                      </dd>
                    </div>
                  ))}
                </dl>
              </Card>

              <Card className={`p-5 ${CARD}`}>
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-2 rounded-lg bg-[#ECFDF5] text-[#2F9B73]">
                    <ListOrdered size={18} />
                  </div>
                  <div>
                    <h2 className="text-base font-semibold text-[#0F172A]">Fallback Flow</h2>
                    <p className="text-xs text-[#64748B]">How automatic phone fallback works</p>
                  </div>
                </div>
                <ol className="space-y-3">
                  {fallbackSteps.map((step, i) => {
                    const Icon = step.icon
                    return (
                      <li key={i} className="flex gap-3 items-start">
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#ECFDF5] text-[#2F9B73]">
                          <Icon size={12} />
                        </div>
                        <p className="text-sm text-[#64748B] pt-0.5">
                          <span className="font-semibold text-[#0F172A] mr-1">{i + 1}.</span>
                          {step.text}
                        </p>
                      </li>
                    )
                  })}
                </ol>
                <p className="mt-4 text-xs text-[#64748B] border-t border-[#E2E8F0] pt-3">
                  If the app is offline, jobs wait safely until the phone comes back online.
                </p>
              </Card>
            </div>

            {/* Phone Fallback Queue */}
            <Card className={`p-5 ${CARD} min-w-0 overflow-hidden`}>
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between mb-5">
                <div>
                  <h2 className="text-base font-semibold text-[#0F172A]">Phone Fallback Queue</h2>
                  <p className="text-sm text-[#64748B] mt-0.5">
                    Messages waiting for or processed by the Android gateway.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <div className="flex rounded-xl border border-[#E2E8F0] overflow-hidden">
                    {(['active', 'completed', 'all'] as const).map((f) => (
                      <button
                        key={f}
                        type="button"
                        onClick={() => setQueueFilter(f)}
                        className={`px-3 py-1.5 text-xs font-semibold capitalize transition-colors ${
                          queueFilter === f
                            ? 'bg-[#2F9B73] text-white'
                            : 'bg-white text-[#64748B] hover:bg-[#ECFDF5] hover:text-[#2F9B73]'
                        }`}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                  <Button
                    variant="outline"
                    className={BTN.secondary}
                    onClick={handleClearCompletedTestJobs}
                    disabled={clearingTestJobs}
                  >
                    {clearingTestJobs ? 'Clearing…' : 'Clear Completed Test Jobs'}
                  </Button>
                  <Button className={BTN.primary} onClick={() => setShowTestModal(true)}>
                    <FlaskConical size={16} className="mr-2" />
                    Create Test Phone Gateway Job
                  </Button>
                </div>
              </div>

              {fallbackJobs.length === 0 ? (
                <div className="rounded-xl border border-dashed border-[#E2E8F0] bg-[#F8FAFC] py-10 px-6 text-center">
                  <Inbox className="mx-auto mb-3 h-8 w-8 text-[#64748B]" />
                  <p className="text-sm font-medium text-[#0F172A]">No fallback jobs in queue.</p>
                  <p className="text-sm text-[#64748B] mt-1">
                    Phone fallback jobs will appear here when provider delivery fails.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto -mx-1 px-1">
                  <table className="w-full text-sm min-w-[900px]">
                    <thead>
                      <tr className="border-b border-[#E2E8F0] text-left text-[#64748B] text-xs font-semibold uppercase">
                        <th className="pb-3 pr-3 font-semibold">Created</th>
                        <th className="pb-3 pr-3 font-semibold">Job ID</th>
                        <th className="pb-3 pr-3 font-semibold">Phone</th>
                        <th className="pb-3 pr-3 font-semibold">Message</th>
                        <th className="pb-3 pr-3 font-semibold">Source</th>
                        <th className="pb-3 pr-3 font-semibold">Phone Status</th>
                        <th className="pb-3 pr-3 font-semibold">Attempts</th>
                        <th className="pb-3 pr-3 font-semibold">Last Device</th>
                        <th className="pb-3 pr-3 font-semibold">Last Error</th>
                        <th className="pb-3 font-semibold">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {fallbackJobs.map((job) => {
                        const isBusy = jobActionId === job.id
                        const displayStatus = job.phoneStatus || job.status
                        const statusLabel = getPhoneJobStatusLabel(displayStatus, job.phoneStatus)
                        const canCancel =
                          job.status !== 'cancelled' &&
                          !['delivered', 'sent'].includes(job.status)

                        return (
                          <tr key={job.id} className="border-b border-[#E2E8F0]/80 hover:bg-[#F8FAFC]/80">
                            <td className="py-3 pr-3 text-[#64748B] whitespace-nowrap text-xs">
                              {new Date(job.createdAt).toLocaleString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </td>
                            <td
                              className="py-3 pr-3 font-mono text-xs text-[#0F172A]"
                              title={job.id}
                            >
                              …{job.id.slice(-8)}
                            </td>
                            <td className="py-3 pr-3 font-mono text-xs text-[#0F172A]">
                              {job.recipientPhone}
                            </td>
                            <td className="py-3 pr-3 max-w-[160px]">
                              <span
                                className="block truncate text-[#64748B] text-xs"
                                title={job.message}
                              >
                                {job.message}
                              </span>
                            </td>
                            <td className="py-3 pr-3 text-xs text-[#64748B] capitalize">
                              {job.source?.replace('_', ' ') || (job.isTest ? 'test' : '—')}
                            </td>
                            <td className="py-3 pr-3">
                              <StatusBadge
                                label={statusLabel}
                                variant={getJobBadgeVariant(displayStatus)}
                                compact
                              />
                            </td>
                            <td className="py-3 pr-3 whitespace-nowrap text-xs text-[#0F172A]">
                              {job.attempts}
                              {job.maxAttempts ? ` / ${job.maxAttempts}` : ''}
                            </td>
                            <td
                              className="py-3 pr-3 text-xs text-[#64748B] max-w-[100px] truncate"
                              title={job.deviceName || undefined}
                            >
                              {job.deviceName || '—'}
                            </td>
                            <td
                              className="py-3 pr-3 text-xs text-[#EF4444] max-w-[120px] truncate"
                              title={job.failureReason || job.failureCode || undefined}
                            >
                              {job.failureReason || job.failureCode || '—'}
                            </td>
                            <td className="py-3">
                              <div className="flex items-center gap-1">
                                {canCancel ? (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 px-2 text-[#64748B] hover:text-[#2F9B73] hover:bg-[#ECFDF5]"
                                    disabled={isBusy}
                                    onClick={() => handleCancelJob(job)}
                                    title="Cancel job"
                                  >
                                    <XCircle size={14} />
                                  </Button>
                                ) : null}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 px-2 text-[#EF4444] hover:text-red-700 hover:bg-red-50"
                                  disabled={isBusy}
                                  onClick={() => handleDeleteJob(job)}
                                  title="Delete job"
                                >
                                  <Trash2 size={14} />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>

            {/* Advanced setup */}
            <Collapsible open={showAdvancedSetup} onOpenChange={setShowAdvancedSetup}>
              <Card className={`${CARD} overflow-hidden`}>
                <CollapsibleTrigger className="flex w-full items-center justify-between p-5 text-left hover:bg-[#F8FAFC] transition-colors">
                  <div>
                    <h2 className="text-base font-semibold text-[#0F172A]">Advanced setup</h2>
                    <p className="text-sm text-[#64748B]">
                      Manual API URL, device token, and binding controls
                    </p>
                  </div>
                  <ChevronDown
                    size={20}
                    className={`text-[#64748B] shrink-0 transition-transform ${
                      showAdvancedSetup ? 'rotate-180' : ''
                    }`}
                  />
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="px-5 pb-5 pt-0 border-t border-[#E2E8F0]">
                    <div className="grid gap-5 lg:grid-cols-2 pt-5">
                      <Card className={`p-5 ${CARD}`}>
                        <div className="flex items-center gap-2 mb-4">
                          <div className="p-2 rounded-lg bg-[#ECFDF5] text-[#2F9B73]">
                            <Wifi size={18} />
                          </div>
                          <div>
                            <h3 className="text-sm font-semibold text-[#0F172A]">API Connection</h3>
                            <p className="text-xs text-[#64748B]">Website API Base URL</p>
                          </div>
                        </div>
                        <div className="space-y-3">
                          <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3">
                            <code className="text-xs font-mono text-[#0F172A] break-all">
                              {apiBaseUrl || 'Loading...'}
                            </code>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            className={BTN.secondary}
                            onClick={() => handleCopy(apiBaseUrl, 'url')}
                            disabled={!apiBaseUrl}
                          >
                            {copiedField === 'url' ? (
                              <Check size={14} className="mr-2" />
                            ) : (
                              <Copy size={14} className="mr-2" />
                            )}
                            Copy URL
                          </Button>
                        </div>
                      </Card>

                      <Card className={`p-5 ${CARD}`}>
                        <div className="flex items-center gap-2 mb-4">
                          <div className="p-2 rounded-lg bg-[#ECFDF5] text-[#2F9B73]">
                            <Key size={18} />
                          </div>
                          <div>
                            <h3 className="text-sm font-semibold text-[#0F172A]">Device Token</h3>
                            <p className="text-xs text-[#64748B]">Device Token / API Key</p>
                          </div>
                        </div>
                        <div className="space-y-3">
                          {gateway?.hasToken && gateway.isActive ? (
                            <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3">
                              <div className="flex items-center justify-between gap-2 mb-2">
                                <p className="text-xs font-medium text-[#64748B]">Token status</p>
                                <StatusBadge label="Active" variant="green" compact />
                              </div>
                              <code className="text-xs font-mono text-[#64748B]">
                                gw_live_••••••••••••••••••••••••••••••••
                              </code>
                            </div>
                          ) : (
                            <p className="text-sm text-[#64748B] text-center py-4 rounded-xl border border-dashed border-[#E2E8F0]">
                              No active device token.
                            </p>
                          )}
                          <Button
                            className={`w-full ${BTN.primary}`}
                            onClick={handleGenerateToken}
                            disabled={generating}
                          >
                            {generating ? (
                              <>
                                <RefreshCw size={16} className="mr-2 animate-spin" />
                                Generating...
                              </>
                            ) : (
                              <>
                                <Key size={16} className="mr-2" />
                                Generate Device Token
                              </>
                            )}
                          </Button>
                          <div className="flex gap-2 rounded-xl border border-amber-200 bg-amber-50/80 p-2.5">
                            <AlertTriangle size={14} className="text-[#F59E0B] shrink-0 mt-0.5" />
                            <p className="text-xs text-amber-900">
                              Copy the token immediately after generation. It will not be shown
                              again.
                            </p>
                          </div>
                        </div>
                      </Card>

                      <Card className={`p-5 ${CARD} lg:col-span-2`}>
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2">
                            <div className="p-2 rounded-lg bg-[#ECFDF5] text-[#2F9B73]">
                              <Shield size={18} />
                            </div>
                            <div>
                              <h3 className="text-sm font-semibold text-[#0F172A]">Device Lock</h3>
                              <p className="text-xs text-[#64748B]">Binding and token controls</p>
                            </div>
                          </div>
                          {tokenBadge()}
                        </div>
                        <div className="flex flex-col sm:flex-row flex-wrap gap-2">
                          <Button
                            variant="outline"
                            className={`flex-1 min-w-[140px] ${BTN.secondary}`}
                            onClick={handleResetBinding}
                            disabled={resetting || !gateway?.hasToken || !gateway?.isActive}
                          >
                            {resetting ? 'Resetting...' : 'Reset Device Binding'}
                          </Button>
                          <Button
                            variant="outline"
                            className={`flex-1 min-w-[140px] ${BTN.secondary}`}
                            onClick={() => handleGenerateConnectionCode({ resetBinding: true })}
                            disabled={
                              resettingAndGenerating || !gateway?.hasToken || !gateway?.isActive
                            }
                          >
                            {resettingAndGenerating
                              ? 'Generating...'
                              : 'Reset Binding & New Code'}
                          </Button>
                          <Button
                            variant="outline"
                            className={`flex-1 min-w-[140px] ${BTN.danger}`}
                            onClick={handleRevokeToken}
                            disabled={revoking || !gateway?.hasToken || !gateway?.isActive}
                          >
                            {revoking ? 'Revoking...' : 'Revoke Token'}
                          </Button>
                        </div>
                      </Card>
                    </div>
                  </div>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          </div>
        )}

        {/* Test job modal */}
        {showTestModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <Card className={`w-full max-w-md p-6 ${CARD} shadow-xl`}>
              <div className="flex items-center gap-3 mb-5">
                <div className="p-2.5 rounded-xl bg-[#ECFDF5] text-[#2F9B73]">
                  <FlaskConical size={22} />
                </div>
                <h3 className="text-xl font-semibold text-[#0F172A]">Create Test Job</h3>
              </div>

              <p className="text-sm text-[#64748B] mb-4">
                Creates a pending fallback job for immediate testing. Does not affect SMS History
                or the provider retry flow.
              </p>

              <div className="space-y-4 mb-5">
                <div>
                  <label className="block text-sm font-medium text-[#0F172A] mb-1.5">
                    Phone number
                  </label>
                  <input
                    type="text"
                    value={testPhone}
                    onChange={(e) => setTestPhone(e.target.value)}
                    placeholder="0712345678 or 254712345678"
                    className="w-full px-4 py-2.5 border border-[#E2E8F0] rounded-xl bg-white text-[#0F172A] placeholder:text-[#64748B] focus:outline-none focus:ring-2 focus:ring-[#2F9B73]/20 focus:border-[#2F9B73]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#0F172A] mb-1.5">
                    Message
                  </label>
                  <textarea
                    value={testMessage}
                    onChange={(e) => setTestMessage(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-2.5 border border-[#E2E8F0] rounded-xl bg-white text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#2F9B73]/20 focus:border-[#2F9B73] resize-none"
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" className={`flex-1 ${BTN.secondary}`} onClick={() => setShowTestModal(false)}>
                  Cancel
                </Button>
                <Button className={`flex-1 ${BTN.primary}`} onClick={handleCreateTestJob} disabled={creatingTest}>
                  {creatingTest ? 'Creating...' : 'Create Test Job'}
                </Button>
              </div>
            </Card>
          </div>
        )}

        {showTokenModal && newToken && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <Card className={`w-full max-w-md p-6 ${CARD} shadow-xl`}>
              <div className="flex items-center gap-3 mb-5">
                <div className="p-2.5 rounded-xl bg-[#ECFDF5] text-[#2F9B73]">
                  <Key size={22} />
                </div>
                <h3 className="text-xl font-semibold text-[#0F172A]">Device Token Generated</h3>
              </div>

              <div className="flex gap-2 rounded-xl border border-red-200 bg-red-50 p-3 mb-4">
                <AlertTriangle size={16} className="text-[#EF4444] shrink-0 mt-0.5" />
                <p className="text-sm text-red-800">Copy this token now. It will not be shown again.</p>
              </div>

              <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3 mb-4 max-h-32 overflow-auto">
                <code className="text-xs font-mono text-[#0F172A] break-all">{newToken}</code>
              </div>

              <div className="flex flex-col gap-2">
                <Button variant="outline" className={BTN.secondary} onClick={() => handleCopy(newToken, 'token')}>
                  {copiedField === 'token' ? (
                    <Check size={16} className="mr-2" />
                  ) : (
                    <Copy size={16} className="mr-2" />
                  )}
                  Copy Token
                </Button>
                <Button
                  className={BTN.primary}
                  onClick={() => {
                    setShowTokenModal(false)
                    setNewToken('')
                  }}
                >
                  I have copied the token
                </Button>
              </div>
            </Card>
          </div>
        )}
      </div>
    </PortalLayout>
  )
}

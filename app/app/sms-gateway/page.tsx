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
} from 'lucide-react'
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

function StatusBadge({
  label,
  variant,
}: {
  label: string
  variant: 'green' | 'red' | 'amber' | 'gray' | 'blue' | 'purple'
}) {
  const styles = {
    green: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    red: 'bg-red-50 text-red-700 border-red-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    gray: 'bg-gray-100 text-gray-600 border-gray-200',
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    purple: 'bg-purple-50 text-purple-700 border-purple-200',
  }

  return (
    <span
      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${styles[variant]}`}
    >
      {label}
    </span>
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

  const connectionBadge = () => {
    switch (gateway?.connectionStatus) {
      case 'online':
        return <StatusBadge label="Online" variant="green" />
      case 'offline':
        return <StatusBadge label="Offline" variant="red" />
      case 'stopped':
        return <StatusBadge label="Stopped" variant="gray" />
      case 'waiting':
        return <StatusBadge label="Waiting for device" variant="amber" />
      default:
        return <StatusBadge label="Not connected yet" variant="gray" />
    }
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

  return (
    <PortalLayout activeSection="SMS Gateway">
      <div className="space-y-6">
        <div className="app-page-header">
          <div>
            <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900 mb-2">
              SMS Gateway
            </h1>
            <p className="text-gray-600">
              Connect your Android phone gateway and manage automatic phone fallback.
            </p>
          </div>
          <Button
            variant="outline"
            className="w-full sm:w-auto border-gray-300 text-gray-700 hover:bg-gray-100"
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
          <Card className="p-6 bg-amber-50 border border-amber-300 shadow-sm">
            <div className="flex flex-col gap-4">
              <div className="flex gap-3">
                <div className="p-2.5 rounded-xl bg-amber-100 text-amber-700 shrink-0">
                  <AlertTriangle size={22} />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-amber-950 mb-1">
                    Phone Gateway Needs Reload
                  </h2>
                  <p className="text-sm text-amber-900 mb-4">
                    The Safaricom gateway phone could not send SMS. The SIM may be out of SMS
                    bundles or airtime. Reload the line, then resume the gateway.
                  </p>
                  <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
                    <div>
                      <dt className="text-amber-800">Device</dt>
                      <dd className="font-medium text-amber-950">
                        {gateway.boundDeviceName || '—'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-amber-800">SIM</dt>
                      <dd className="font-medium text-amber-950">
                        {gateway.boundSimLabel || '—'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-amber-800">Blocked jobs</dt>
                      <dd className="font-medium text-amber-950">
                        {gateway.blockedTopUpJobs ?? 0}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-amber-800">Last failure</dt>
                      <dd className="font-medium text-amber-950">
                        {gateway.lastFailureReason || '—'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-amber-800">Failed at</dt>
                      <dd className="font-medium text-amber-950">
                        {formatDate(gateway.lastFailureAt)}
                      </dd>
                    </div>
                  </dl>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  className="bg-amber-700 text-white hover:bg-amber-800"
                  onClick={handleResumeGateway}
                  disabled={resumingGateway}
                >
                  {resumingGateway ? 'Resuming…' : 'Mark Reloaded / Resume'}
                </Button>
                <Button
                  variant="outline"
                  className="border-amber-400 text-amber-900 hover:bg-amber-100"
                  onClick={handleRetryBlockedJobs}
                  disabled={retryingBlocked || (gateway.blockedTopUpJobs ?? 0) === 0}
                >
                  {retryingBlocked ? 'Re-queuing…' : 'Retry Phone Fallback'}
                </Button>
                <Button
                  variant="outline"
                  className="border-amber-300 text-amber-800 hover:bg-amber-100"
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
            <Card className="p-5 bg-slate-50 border border-slate-200 shadow-sm">
              <div className="flex gap-3">
                <div className="p-2 rounded-lg bg-slate-200 text-slate-600 shrink-0">
                  <Smartphone size={20} />
                </div>
                <div>
                  <h2 className="font-semibold text-slate-900 mb-1">Gateway Offline</h2>
                  <p className="text-sm text-slate-700">
                    The Android app has not synced recently.{' '}
                    <strong>{gateway.pendingPhoneJobs}</strong> phone fallback job(s) are waiting
                    safely in MongoDB. They will be fetched when the app comes back online.
                  </p>
                </div>
              </div>
            </Card>
          )}

        {loading && !gateway ? (
          <Card className="p-12 bg-white border border-gray-100 shadow-sm text-center">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-gray-400" />
            <p className="text-gray-500">Loading gateway status...</p>
          </Card>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Card 1: API Connection */}
            <Card className="p-6 bg-white border border-gray-100 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 rounded-xl bg-teal-50 text-teal-600">
                  <Wifi size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    API Connection
                  </h2>
                  <p className="text-sm text-gray-500">Website API Base URL</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                  <code className="text-sm font-mono text-gray-900 break-all">
                    {apiBaseUrl || 'Loading...'}
                  </code>
                </div>

                <div className="flex items-center justify-between">
                  <StatusBadge label="Ready" variant="green" />
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-gray-300 text-gray-700 hover:bg-gray-100"
                    onClick={() => handleCopy(apiBaseUrl, 'url')}
                    disabled={!apiBaseUrl}
                  >
                    {copiedField === 'url' ? (
                      <Check size={16} className="mr-2 text-emerald-600" />
                    ) : (
                      <Copy size={16} className="mr-2" />
                    )}
                    Copy URL
                  </Button>
                </div>

                <p className="text-xs text-gray-500">
                  Copy this URL and paste it into the Android SMS Gateway app.
                </p>
              </div>
            </Card>

            {/* Card 2: Device Token */}
            <Card className="p-6 bg-white border border-gray-100 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 rounded-xl bg-teal-50 text-teal-600">
                  <Key size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    Device Token
                  </h2>
                  <p className="text-sm text-gray-500">Device Token / API Key</p>
                </div>
              </div>

              <div className="space-y-4">
                {gateway?.hasToken && gateway.isActive ? (
                  <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <p className="text-xs font-semibold text-gray-600">Token status</p>
                      <StatusBadge label="Active" variant="green" />
                    </div>
                    <code className="text-sm font-mono text-gray-500">
                      gw_live_••••••••••••••••••••••••••••••••••••••••••
                    </code>
                    <p className="text-xs text-amber-700 mt-2">
                      Token is hidden for security. Generate a new token to replace it — the
                      old token stops working immediately.
                    </p>
                  </div>
                ) : (
                  <div className="p-4 bg-gray-50 rounded-xl border border-dashed border-gray-200 text-center">
                    <p className="text-sm text-gray-500">
                      No active device token. Generate one to connect your phone.
                    </p>
                  </div>
                )}

                <Button
                  className="w-full bg-teal-600 text-white hover:bg-teal-700"
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

                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex gap-2">
                  <AlertTriangle
                    size={16}
                    className="text-amber-600 shrink-0 mt-0.5"
                  />
                  <p className="text-xs text-amber-800">
                    Copy the token immediately after generation. It will not be
                    shown again. If lost, you must generate a new token.
                  </p>
                </div>
              </div>
            </Card>

            {/* Card 3: Gateway Status */}
            <Card className="p-6 bg-white border border-gray-100 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-teal-50 text-teal-600">
                    <Smartphone size={20} />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">
                      Gateway Status
                    </h2>
                    <p className="text-sm text-gray-500">Live device telemetry</p>
                  </div>
                </div>
                {connectionBadge()}
              </div>

              <dl className="space-y-3 text-sm">
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <dt className="text-gray-500">Status</dt>
                  <dd>{connectionBadge()}</dd>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <dt className="text-gray-500">Latest activity</dt>
                  <dd className="font-medium text-gray-900">
                    {formatDate(gateway?.latestActivityAt)}
                  </dd>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <dt className="text-gray-500">Device name</dt>
                  <dd className="font-medium text-gray-900 text-right max-w-[60%] truncate">
                    {gateway?.boundDeviceName || '—'}
                  </dd>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <dt className="text-gray-500">SIM label</dt>
                  <dd className="font-medium text-gray-900">
                    {gateway?.boundSimLabel || '—'}
                  </dd>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <dt className="text-gray-500">Last heartbeat</dt>
                  <dd className="font-medium text-gray-900">
                    {formatDate(gateway?.lastHeartbeatAt)}
                  </dd>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <dt className="text-gray-500">Last sync</dt>
                  <dd className="font-medium text-gray-900">
                    {formatDate(gateway?.lastSyncAt)}
                  </dd>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <dt className="text-gray-500">Battery level</dt>
                  <dd className="font-medium text-gray-900">
                    {gateway?.batteryLevel != null
                      ? `${gateway.batteryLevel}%`
                      : '—'}
                  </dd>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <dt className="text-gray-500">SMS permission</dt>
                  <dd>
                    {gateway?.isSmsPermissionGranted == null ? (
                      <span className="text-gray-400">—</span>
                    ) : gateway.isSmsPermissionGranted ? (
                      <StatusBadge label="Granted" variant="green" />
                    ) : (
                      <StatusBadge label="Missing" variant="red" />
                    )}
                  </dd>
                </div>
                <div className="flex justify-between py-2">
                  <dt className="text-gray-500">Gateway running</dt>
                  <dd>
                    {gateway?.isGatewayRunning == null ? (
                      <span className="text-gray-400">—</span>
                    ) : gateway.isGatewayRunning ? (
                      <StatusBadge label="Running" variant="green" />
                    ) : (
                      <StatusBadge label="Stopped" variant="gray" />
                    )}
                  </dd>
                </div>
              </dl>
            </Card>

            {/* Card 4: Device Lock */}
            <Card className="p-6 bg-white border border-gray-100 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-teal-50 text-teal-600">
                    <Shield size={20} />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">
                      Device Lock
                    </h2>
                    <p className="text-sm text-gray-500">
                      One token per device binding
                    </p>
                  </div>
                </div>
                {tokenBadge()}
              </div>

              <dl className="space-y-3 text-sm mb-6">
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <dt className="text-gray-500">Bound device</dt>
                  <dd className="font-medium text-gray-900 text-right max-w-[60%] truncate">
                    {gateway?.boundDeviceName || 'Not bound yet'}
                  </dd>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <dt className="text-gray-500">Bound SIM</dt>
                  <dd className="font-medium text-gray-900">
                    {gateway?.boundSimLabel || '—'}
                  </dd>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <dt className="text-gray-500">Last IP</dt>
                  <dd className="font-mono text-xs text-gray-900">
                    {gateway?.lastIp || '—'}
                  </dd>
                </div>
                <div className="flex justify-between py-2">
                  <dt className="text-gray-500">Last user agent</dt>
                  <dd
                    className="font-mono text-xs text-gray-700 text-right max-w-[55%] truncate"
                    title={gateway?.lastUserAgent || undefined}
                  >
                    {gateway?.lastUserAgent || '—'}
                  </dd>
                </div>
              </dl>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg mb-4">
                <p className="text-xs text-amber-800">
                  Reset binding clears the linked phone fingerprint and any gateway pause or
                  top-up alert. Use this if the app shows &quot;bound to another device&quot;.
                </p>
              </div>

              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg mb-4">
                <p className="text-xs text-blue-800">
                  Each token binds to one phone using a stable device ID from the app. GET
                  requests like job polling work even before the first bind.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  variant="outline"
                  className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-100"
                  onClick={handleResetBinding}
                  disabled={
                    resetting || !gateway?.hasToken || !gateway?.isActive
                  }
                >
                  {resetting ? 'Resetting...' : 'Reset Binding & Clear Gateway Pause'}
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 border-red-200 text-red-700 hover:bg-red-50"
                  onClick={handleRevokeToken}
                  disabled={revoking || !gateway?.hasToken || !gateway?.isActive}
                >
                  {revoking ? 'Revoking...' : 'Revoke Token'}
                </Button>
              </div>
            </Card>

            {/* Card 5: Fallback Rules */}
            <Card className="p-6 bg-white border border-gray-100 shadow-sm lg:col-span-2">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 rounded-xl bg-teal-50 text-teal-600">
                  <ListOrdered size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Fallback Rules</h2>
                  <p className="text-sm text-gray-500">Automatic retry and phone fallback flow</p>
                </div>
              </div>
              <ol className="space-y-2 text-sm text-gray-700 list-decimal list-inside">
                <li>Provider sends the original SMS.</li>
                <li>
                  If not delivered after 7 minutes, the website retries once using the
                  provider.
                </li>
                <li>
                  If the retry also fails or is not delivered after 7 minutes, the message
                  is queued in MongoDB for phone fallback.
                </li>
                <li>
                  The Android app fetches pending jobs from the website API when online.
                </li>
                <li>
                  If the app is offline, jobs remain pending in MongoDB until the app comes
                  back online.
                </li>
              </ol>
            </Card>

            {/* Card 6: Phone Fallback Queue */}
            <Card className="p-6 bg-white border border-gray-100 shadow-sm lg:col-span-2 app-table-scroll">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-teal-50 text-teal-600">
                    <Inbox size={20} />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">
                      Phone Fallback Queue
                    </h2>
                    <p className="text-sm text-gray-500">
                      {queueFilter === 'active'
                        ? 'Pending and sending jobs only'
                        : queueFilter === 'completed'
                          ? 'Delivered, failed, and cancelled jobs'
                          : 'All phone fallback jobs'}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 shrink-0">
                  <div className="flex rounded-lg border border-gray-200 overflow-hidden">
                    {(['active', 'completed', 'all'] as const).map((f) => (
                      <button
                        key={f}
                        type="button"
                        onClick={() => setQueueFilter(f)}
                        className={`px-3 py-1.5 text-xs font-semibold capitalize ${
                          queueFilter === f
                            ? 'bg-teal-600 text-white'
                            : 'bg-white text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                  <Button
                    variant="outline"
                    className="border-gray-200 text-gray-700 hover:bg-gray-50"
                    onClick={handleClearCompletedTestJobs}
                    disabled={clearingTestJobs}
                  >
                    {clearingTestJobs ? 'Clearing…' : 'Clear Completed Test Jobs'}
                  </Button>
                  <Button
                    variant="outline"
                    className="border-teal-200 text-teal-700 hover:bg-teal-50"
                    onClick={() => setShowTestModal(true)}
                  >
                    <FlaskConical size={16} className="mr-2" />
                    Create Test Phone Gateway Job
                  </Button>
                </div>
              </div>

              {fallbackJobs.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-6">
                  No fallback jobs in queue.
                </p>
              ) : (
                <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[1200px]">
                  <thead className="border-b border-gray-200">
                    <tr className="text-left text-gray-600 font-semibold text-xs uppercase">
                      <th className="pb-3 pr-2">Created</th>
                      <th className="pb-3 pr-2">Job ID</th>
                      <th className="pb-3 pr-2">Phone</th>
                      <th className="pb-3 pr-2">Message</th>
                      <th className="pb-3 pr-2">Source</th>
                      <th className="pb-3 pr-2">Phone Status</th>
                      <th className="pb-3 pr-2">Attempts</th>
                      <th className="pb-3 pr-2">Sending At</th>
                      <th className="pb-3 pr-2">Delivered At</th>
                      <th className="pb-3 pr-2">Failed At</th>
                      <th className="pb-3 pr-2">Last Device</th>
                      <th className="pb-3 pr-2">Last Error</th>
                      <th className="pb-3 pr-2">Type</th>
                      <th className="pb-3">Actions</th>
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
                      <tr key={job.id} className="border-b border-gray-100">
                        <td className="py-3 pr-2 text-gray-600 whitespace-nowrap">
                          {new Date(job.createdAt).toLocaleString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="py-3 pr-2 font-mono text-xs max-w-[120px] truncate" title={job.id}>
                          {job.id.slice(-8)}
                        </td>
                        <td className="py-3 pr-2 font-mono text-xs">{job.recipientPhone}</td>
                        <td className="py-3 pr-2 max-w-[180px] truncate text-gray-600" title={job.message}>
                          {job.message}
                        </td>
                        <td className="py-3 pr-2 text-xs text-gray-600 capitalize">
                          {job.source?.replace('_', ' ') || (job.isTest ? 'test' : '—')}
                        </td>
                        <td className="py-3 pr-2">
                          <StatusBadge
                            label={statusLabel}
                            variant={
                              displayStatus === 'delivered' ||
                              displayStatus === 'sent' ||
                              displayStatus === 'blocked' ||
                              displayStatus === 'requires_topup'
                                ? 'green'
                                : displayStatus === 'failed'
                                  ? 'red'
                                  : displayStatus === 'sending'
                                    ? 'purple'
                                    : displayStatus === 'cancelled'
                                      ? 'gray'
                                      : 'amber'
                            }
                          />
                          {job.resetReason ? (
                            <span className="block text-[10px] text-gray-400 mt-1">{job.resetReason}</span>
                          ) : null}
                        </td>
                        <td className="py-3 pr-2 whitespace-nowrap">
                          {job.attempts}
                          {job.maxAttempts ? ` / ${job.maxAttempts}` : ''}
                        </td>
                        <td className="py-3 pr-2 text-xs text-gray-500 whitespace-nowrap">
                          {job.sendingAt
                            ? new Date(job.sendingAt).toLocaleString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : '—'}
                        </td>
                        <td className="py-3 pr-2 text-xs text-gray-500 whitespace-nowrap">
                          {job.deliveredAt
                            ? new Date(job.deliveredAt).toLocaleString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : job.sentAt
                              ? new Date(job.sentAt).toLocaleString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })
                              : '—'}
                        </td>
                        <td className="py-3 pr-2 text-xs text-gray-500 whitespace-nowrap">
                          {job.failedAt
                            ? new Date(job.failedAt).toLocaleString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : '—'}
                        </td>
                        <td className="py-3 pr-2 text-xs text-gray-600 max-w-[120px] truncate" title={job.deviceName || undefined}>
                          {job.deviceName || '—'}
                          {job.simLabel ? (
                            <span className="block text-[10px] text-gray-400">{job.simLabel}</span>
                          ) : null}
                        </td>
                        <td className="py-3 pr-2 text-xs text-red-600 max-w-[160px] truncate" title={job.failureReason || undefined}>
                          {job.failureReason || job.failureCode || '—'}
                        </td>
                        <td className="py-3 pr-2">
                          {job.isTest ? (
                            <StatusBadge label="Test" variant="blue" />
                          ) : (
                            <span className="text-gray-400 text-xs">Live</span>
                          )}
                        </td>
                        <td className="py-3">
                          <div className="flex items-center gap-1">
                            {canCancel ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 px-2 text-amber-700 hover:text-amber-800 hover:bg-amber-50"
                                disabled={isBusy}
                                onClick={() => handleCancelJob(job)}
                                title="Cancel job"
                              >
                                <XCircle size={14} className="mr-1" />
                                Cancel
                              </Button>
                            ) : null}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 px-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                              disabled={isBusy}
                              onClick={() => handleDeleteJob(job)}
                              title="Delete job"
                            >
                              <Trash2 size={14} className="mr-1" />
                              Delete
                            </Button>
                          </div>
                        </td>
                      </tr>
                    )})}
                  </tbody>
                </table>
                </div>
              )}
            </Card>
          </div>
        )}

        {/* Test job modal */}
        {showTestModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-md p-8 bg-white border border-gray-200 shadow-xl">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 rounded-xl bg-teal-100 text-teal-600">
                  <FlaskConical size={24} />
                </div>
                <h3 className="text-2xl font-semibold text-gray-900">
                  Create Test Job
                </h3>
              </div>

              <p className="text-sm text-gray-600 mb-4">
                Creates a pending fallback job in MongoDB for immediate testing. Does not
                affect SMS History or the provider retry flow.
              </p>

              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Phone number
                  </label>
                  <input
                    type="text"
                    value={testPhone}
                    onChange={(e) => setTestPhone(e.target.value)}
                    placeholder="0712345678 or 254712345678"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Message
                  </label>
                  <textarea
                    value={testMessage}
                    onChange={(e) => setTestMessage(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 resize-none"
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1 border-gray-300"
                  onClick={() => setShowTestModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1 bg-teal-600 text-white hover:bg-teal-700"
                  onClick={handleCreateTestJob}
                  disabled={creatingTest}
                >
                  {creatingTest ? 'Creating...' : 'Create Test Job'}
                </Button>
              </div>
            </Card>
          </div>
        )}

        {/* One-time token modal */}
        {showTokenModal && newToken && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-md p-8 bg-white border border-gray-200 shadow-xl">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 rounded-xl bg-amber-100 text-amber-600">
                  <Key size={24} />
                </div>
                <h3 className="text-2xl font-semibold text-gray-900">
                  Device Token Generated
                </h3>
              </div>

              <div className="p-4 bg-red-50 border border-red-200 rounded-xl mb-4 flex gap-2">
                <AlertTriangle
                  size={18}
                  className="text-red-600 shrink-0 mt-0.5"
                />
                <p className="text-sm font-medium text-red-800">
                  Copy this token now. It will not be shown again.
                </p>
              </div>

              <div className="space-y-4 mb-6">
                <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                  <p className="text-xs font-semibold text-gray-600 mb-2">
                    Your device token:
                  </p>
                  <code className="text-xs font-mono text-gray-900 break-all">
                    {newToken}
                  </code>
                </div>

                <Button
                  variant="outline"
                  className="w-full border-gray-300 text-gray-700 hover:bg-gray-100"
                  onClick={() => handleCopy(newToken, 'token')}
                >
                  {copiedField === 'token' ? (
                    <Check size={16} className="mr-2 text-emerald-600" />
                  ) : (
                    <Copy size={16} className="mr-2" />
                  )}
                  Copy Token
                </Button>
              </div>

              <Button
                className="w-full bg-teal-600 text-white hover:bg-teal-700"
                onClick={() => {
                  setShowTokenModal(false)
                  setNewToken('')
                }}
              >
                I have copied the token
              </Button>
            </Card>
          </div>
        )}
      </div>
    </PortalLayout>
  )
}

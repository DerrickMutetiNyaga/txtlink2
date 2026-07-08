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
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface GatewayStatus {
  hasToken: boolean
  isActive: boolean
  isOnline: boolean
  connectionStatus: 'online' | 'offline' | 'waiting' | 'not_connected'
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
}

function StatusBadge({
  label,
  variant,
}: {
  label: string
  variant: 'green' | 'red' | 'amber' | 'gray'
}) {
  const styles = {
    green: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    red: 'bg-red-50 text-red-700 border-red-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    gray: 'bg-gray-100 text-gray-600 border-gray-200',
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

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setApiBaseUrl(`${window.location.origin}/api/sms-gateway`)
    }
  }, [])

  const fetchStatus = useCallback(async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/user/sms-gateway', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (response.ok) {
        const data = await response.json()
        setGateway(data.gateway)
      }
    } catch (error) {
      console.error('Failed to fetch gateway status:', error)
    } finally {
      setLoading(false)
    }
  }, [])

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
    setGenerating(true)
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/user/sms-gateway/token', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
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
        'Reset device binding? The token can then be used on a different phone.'
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
        toast({ title: 'Binding reset', description: data.message })
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
              Connect your Android phone gateway to send messages through your SIM.
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
                    <p className="text-xs font-semibold text-gray-600 mb-1">
                      Token status
                    </p>
                    <code className="text-sm font-mono text-gray-500">
                      gw_live_••••••••••••••••••••••••••••••••••••••••••
                    </code>
                    <p className="text-xs text-amber-700 mt-2">
                      Token is hidden for security. Generate a new token if you lost
                      it.
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
                      <StatusBadge label="Stopped" variant="red" />
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

              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg mb-4">
                <p className="text-xs text-blue-800">
                  Each token works on one phone at a time. If another device tries
                  to use the same token, it will be blocked with a 403 error.
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
                  {resetting ? 'Resetting...' : 'Reset Device Binding'}
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

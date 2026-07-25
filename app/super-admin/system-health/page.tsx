'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  MinusCircle,
  Activity,
  Server,
  MessageSquare,
  CreditCard,
  Webhook,
} from 'lucide-react'

type HealthStatus = 'operational' | 'degraded' | 'down' | 'not_configured'

interface HealthCheck {
  id: string
  name: string
  category: 'core' | 'sms' | 'payments' | 'webhooks'
  status: HealthStatus
  message: string
  details?: Record<string, unknown>
}

interface SystemHealthReport {
  overall: HealthStatus
  score: number
  summary: string
  checks: HealthCheck[]
  checkedAt: string
}

const statusConfig: Record<
  HealthStatus,
  { label: string; icon: typeof CheckCircle2; badge: string; row: string }
> = {
  operational: {
    label: 'Operational',
    icon: CheckCircle2,
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    row: 'border-emerald-100 bg-emerald-50/30',
  },
  degraded: {
    label: 'Degraded',
    icon: AlertTriangle,
    badge: 'bg-amber-50 text-amber-700 border-amber-200',
    row: 'border-amber-100 bg-amber-50/30',
  },
  down: {
    label: 'Down',
    icon: XCircle,
    badge: 'bg-red-50 text-red-700 border-red-200',
    row: 'border-red-100 bg-red-50/30',
  },
  not_configured: {
    label: 'Not configured',
    icon: MinusCircle,
    badge: 'bg-slate-50 text-slate-600 border-slate-200',
    row: 'border-slate-100 bg-slate-50/50',
  },
}

const categoryMeta = {
  core: { label: 'Core', icon: Server },
  sms: { label: 'SMS', icon: MessageSquare },
  payments: { label: 'Payments', icon: CreditCard },
  webhooks: { label: 'Webhooks', icon: Webhook },
}

function ScoreRing({ score, overall }: { score: number; overall: HealthStatus }) {
  const color =
    overall === 'operational'
      ? 'text-emerald-600'
      : overall === 'degraded'
        ? 'text-amber-600'
        : 'text-red-600'

  return (
    <div className="relative w-32 h-32 md:w-40 md:h-40">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="42" fill="none" stroke="#E2E8F0" strokeWidth="8" />
        <circle
          cx="50"
          cy="50"
          r="42"
          fill="none"
          stroke="currentColor"
          strokeWidth="8"
          strokeLinecap="round"
          className={color}
          strokeDasharray={`${score * 2.64} 264`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-3xl md:text-4xl font-bold ${color}`}>{score}%</span>
        <span className="text-xs text-slate-500 mt-1">Health</span>
      </div>
    </div>
  )
}

export default function SystemHealthPage() {
  const [report, setReport] = useState<SystemHealthReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchHealth = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true)
      else setRefreshing(true)
      setError(null)

      const token = localStorage.getItem('token')
      const res = await fetch('/api/super-admin/system-health', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        cache: 'no-store',
      })

      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to load system health')
      }

      setReport(data)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load system health')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchHealth()
  }, [fetchHealth])

  useEffect(() => {
    if (!autoRefresh) return
    const interval = setInterval(() => fetchHealth(true), 60000)
    return () => clearInterval(interval)
  }, [autoRefresh, fetchHealth])

  const grouped = report
    ? (['core', 'sms', 'webhooks', 'payments'] as const).map((cat) => ({
        category: cat,
        checks: report.checks.filter((c) => c.category === cat),
      }))
    : []

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold text-slate-900">System Health</h1>
          <p className="text-slate-600 mt-1 text-sm md:text-base">
            Live status of database, SMS gateway, webhooks, queue, and payments.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoRefresh((v) => !v)}
            className={autoRefresh ? 'border-emerald-300 bg-emerald-50' : ''}
          >
            Auto-refresh {autoRefresh ? 'ON' : 'OFF'}
          </Button>
          <Button
            size="sm"
            onClick={() => fetchHealth(true)}
            disabled={refreshing}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {error && (
        <Card className="p-4 border-red-200 bg-red-50 text-red-800 text-sm">{error}</Card>
      )}

      {loading && !report ? (
        <Card className="p-12 text-center text-slate-500">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-emerald-600" />
          Running health checks…
        </Card>
      ) : report ? (
        <>
          <Card className="p-6 md:p-8 border border-slate-200 rounded-2xl shadow-sm bg-white">
            <div className="flex flex-col md:flex-row md:items-center gap-8">
              <ScoreRing score={report.score} overall={report.overall} />
              <div className="flex-1 space-y-3">
                <div className="flex flex-wrap items-center gap-3">
                  <Badge className={statusConfig[report.overall].badge}>
                    {statusConfig[report.overall].label}
                  </Badge>
                  <span className="text-sm text-slate-500">
                    Last checked: {new Date(report.checkedAt).toLocaleString()}
                  </span>
                </div>
                <p className="text-lg font-medium text-slate-900">{report.summary}</p>
                <p className="text-sm text-slate-600">
                  {report.score >= 90
                    ? 'All critical systems are working. Optional services may show as not configured.'
                    : report.score >= 60
                      ? 'Some components need attention. SMS may still work via polling backup.'
                      : 'Critical issues detected — review failed checks below.'}
                </p>
                <div className="flex flex-wrap gap-3 pt-2">
                  {(['operational', 'degraded', 'down'] as const).map((s) => {
                    const count = report.checks.filter((c) => c.status === s).length
                    if (count === 0) return null
                    const Icon = statusConfig[s].icon
                    return (
                      <div key={s} className="flex items-center gap-1.5 text-sm text-slate-700">
                        <Icon className="w-4 h-4" />
                        {count} {statusConfig[s].label.toLowerCase()}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </Card>

          {grouped.map(({ category, checks }) => {
            if (checks.length === 0) return null
            const meta = categoryMeta[category]
            const CatIcon = meta.icon
            return (
              <div key={category}>
                <div className="flex items-center gap-2 mb-3">
                  <CatIcon className="w-5 h-5 text-slate-600" />
                  <h2 className="text-lg font-semibold text-slate-900">{meta.label}</h2>
                </div>
                <div className="space-y-3">
                  {checks.map((check) => {
                    const cfg = statusConfig[check.status]
                    const Icon = cfg.icon
                    return (
                      <Card
                        key={check.id}
                        className={`p-4 md:p-5 border rounded-xl ${cfg.row}`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                          <div className="flex items-start gap-3 min-w-0">
                            <Icon className="w-5 h-5 shrink-0 mt-0.5" />
                            <div className="min-w-0">
                              <p className="font-medium text-slate-900">{check.name}</p>
                              <p className="text-sm text-slate-600 mt-1">{check.message}</p>
                              {check.details && Object.keys(check.details).length > 0 && (
                                <pre className="mt-2 text-xs text-slate-500 bg-white/60 rounded-lg p-2 overflow-x-auto border border-slate-100">
                                  {JSON.stringify(check.details, null, 2)}
                                </pre>
                              )}
                            </div>
                          </div>
                          <Badge variant="outline" className={`shrink-0 ${cfg.badge}`}>
                            {cfg.label}
                          </Badge>
                        </div>
                      </Card>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </>
      ) : null}

      <Card className="p-4 border-slate-200 bg-slate-50 text-sm text-slate-600">
        <div className="flex items-start gap-2">
          <Activity className="w-4 h-4 mt-0.5 shrink-0" />
          <p>
            <strong>DLR webhooks:</strong> If HostPinnacle webhooks show degraded but delivery sync
            is operational, TXTLINK is updating statuses by polling HostPinnacle directly. Configure
            the DLR URL in Settings if you want real-time callbacks too.
          </p>
        </div>
      </Card>
    </div>
  )
}

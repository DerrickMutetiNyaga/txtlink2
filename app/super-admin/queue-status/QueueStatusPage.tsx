'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  RefreshCw,
  Activity,
  Users,
  MessageSquare,
  CheckCircle2,
  Loader2,
  HeartPulse,
} from 'lucide-react'
import { SystemHealthPanel } from '@/components/super-admin/SystemHealthPanel'

interface QueueStatus {
  global: {
    globalActiveWorkers: number
    totalQueued: number
    processing: number
    isRunning: boolean
    accountCount: number
    accounts: Array<{
      userId: string
      queued: number
      activeWorkers: number
    }>
  }
  isOwner: boolean
}

function StatCard({
  label,
  value,
  icon: Icon,
  color = 'slate',
}: {
  label: string
  value: string | number
  icon: React.ElementType
  color?: 'slate' | 'emerald' | 'amber' | 'blue'
}) {
  const colorClasses = {
    slate: 'bg-slate-50 text-slate-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
    blue: 'bg-blue-50 text-blue-600',
  }

  return (
    <Card className="p-6 bg-white border border-slate-200 rounded-2xl shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500 mb-2">{label}</p>
          <p className="text-3xl font-bold text-slate-900">{value.toLocaleString()}</p>
        </div>
        <div className={`w-12 h-12 rounded-xl ${colorClasses[color]} flex items-center justify-center`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </Card>
  )
}

export default function QueueStatusPage() {
  const searchParams = useSearchParams()
  const tabParam = searchParams.get('tab')
  const [tab, setTab] = useState<'queue' | 'health'>(tabParam === 'health' ? 'health' : 'queue')
  const [queueStatus, setQueueStatus] = useState<QueueStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())
  const [autoRefresh, setAutoRefresh] = useState(true)

  useEffect(() => {
    if (tabParam === 'health') setTab('health')
  }, [tabParam])

  const fetchQueueStatus = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/sms/queue-status', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setQueueStatus(data)
        setLastUpdated(new Date())
      }
    } catch (error) {
      console.error('Failed to fetch queue status:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchQueueStatus()
  }, [])

  useEffect(() => {
    if (!autoRefresh || tab !== 'queue') return

    const interval = setInterval(() => {
      fetchQueueStatus()
    }, 2000)

    return () => clearInterval(interval)
  }, [autoRefresh, tab])

  if (loading && tab === 'queue') {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-600 mx-auto mb-4" />
            <p className="text-slate-600">Loading…</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Queue & System Health</h1>
        <p className="text-slate-500 mt-1">SMS queue monitoring and platform health checks</p>
      </div>

      <div className="flex gap-2 border-b border-slate-200 pb-1">
        <button
          type="button"
          onClick={() => setTab('queue')}
          className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
            tab === 'queue'
              ? 'bg-white border border-b-white border-slate-200 text-emerald-700 -mb-px'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Activity className="w-4 h-4 inline mr-2" />
          SMS Queue
        </button>
        <button
          type="button"
          onClick={() => setTab('health')}
          className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
            tab === 'health'
              ? 'bg-white border border-b-white border-slate-200 text-emerald-700 -mb-px'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <HeartPulse className="w-4 h-4 inline mr-2" />
          System Health
        </button>
      </div>

      {tab === 'health' ? (
        <SystemHealthPanel fetchUrl="/api/sms/queue-status?health=1" />
      ) : (
        <>
          <div className="flex items-center justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={autoRefresh ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : ''}
            >
              <Activity className={`w-4 h-4 mr-2 ${autoRefresh ? 'animate-pulse' : ''}`} />
              Auto-refresh {autoRefresh ? 'ON' : 'OFF'}
            </Button>
            <Button variant="outline" onClick={fetchQueueStatus}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh Now
            </Button>
          </div>

          <div className="text-sm text-slate-500">
            Last updated: {lastUpdated.toLocaleTimeString()}
            {autoRefresh && (
              <span className="ml-2 text-emerald-600">• Auto-refreshing every 2 seconds</span>
            )}
          </div>

          {queueStatus && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                  label="Total Queued"
                  value={queueStatus.global.totalQueued}
                  icon={MessageSquare}
                  color="blue"
                />
                <StatCard
                  label="Active Workers"
                  value={queueStatus.global.globalActiveWorkers}
                  icon={Activity}
                  color="emerald"
                />
                <StatCard
                  label="Processing"
                  value={queueStatus.global.processing}
                  icon={Loader2}
                  color="amber"
                />
                <StatCard
                  label="Active Accounts"
                  value={queueStatus.global.accountCount}
                  icon={Users}
                  color="slate"
                />
              </div>

              <Card className="p-6 bg-white border border-slate-200 rounded-2xl shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-slate-900">Queue Status</h2>
                  {queueStatus.global.isRunning ? (
                    <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <div className="w-2 h-2 bg-emerald-600 rounded-full animate-pulse" />
                      Running
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium bg-slate-50 text-slate-700 border border-slate-200">
                      Stopped
                    </span>
                  )}
                </div>

                {queueStatus.global.totalQueued === 0 &&
                queueStatus.global.globalActiveWorkers === 0 ? (
                  <div className="text-center py-12">
                    <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
                    <p className="text-slate-600 font-medium">Queue is empty</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-slate-500 mb-1">Total Queued</p>
                      <p className="text-2xl font-bold text-slate-900">
                        {queueStatus.global.totalQueued.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-500 mb-1">Active Workers</p>
                      <p className="text-2xl font-bold text-emerald-600">
                        {queueStatus.global.globalActiveWorkers}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-500 mb-1">Processing</p>
                      <p className="text-2xl font-bold text-amber-600">
                        {queueStatus.global.processing}
                      </p>
                    </div>
                  </div>
                )}
              </Card>
            </>
          )}
        </>
      )}

      <p className="text-xs text-slate-500">
        Direct link:{' '}
        <Link href="/super-admin/queue-status?tab=health" className="text-emerald-700 underline">
          /super-admin/queue-status?tab=health
        </Link>
      </p>
    </div>
  )
}

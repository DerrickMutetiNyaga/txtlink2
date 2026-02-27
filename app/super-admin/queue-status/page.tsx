'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { RefreshCw, Activity, Users, MessageSquare, Clock, CheckCircle2, XCircle, Loader2 } from 'lucide-react'

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

function StatCard({ label, value, icon: Icon, color = 'slate' }: { 
  label: string
  value: string | number
  icon: any
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
  const [queueStatus, setQueueStatus] = useState<QueueStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())
  const [autoRefresh, setAutoRefresh] = useState(true)

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

  // Auto-refresh every 2 seconds
  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(() => {
      fetchQueueStatus()
    }, 2000)

    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRefresh])

  if (loading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-600 mx-auto mb-4" />
            <p className="text-slate-600">Loading queue status...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">SMS Queue Status</h1>
          <p className="text-slate-500 mt-1">Real-time monitoring of SMS queue processing</p>
        </div>
        <div className="flex items-center gap-3">
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
      </div>

      {/* Last Updated */}
      <div className="text-sm text-slate-500">
        Last updated: {lastUpdated.toLocaleTimeString()}
        {autoRefresh && <span className="ml-2 text-emerald-600">• Auto-refreshing every 2 seconds</span>}
      </div>

      {queueStatus && (
        <>
          {/* Global Stats */}
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

          {/* Queue Status */}
          <Card className="p-6 bg-white border border-slate-200 rounded-2xl shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-slate-900">Queue Status</h2>
              <div className="flex items-center gap-2">
                {queueStatus.global.isRunning ? (
                  <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <div className="w-2 h-2 bg-emerald-600 rounded-full animate-pulse" />
                    Running
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium bg-slate-50 text-slate-700 border border-slate-200">
                    <div className="w-2 h-2 bg-slate-600 rounded-full" />
                    Stopped
                  </span>
                )}
              </div>
            </div>

            {queueStatus.global.totalQueued === 0 && queueStatus.global.globalActiveWorkers === 0 ? (
              <div className="text-center py-12">
                <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
                <p className="text-slate-600 font-medium">Queue is empty</p>
                <p className="text-sm text-slate-500 mt-1">No messages are currently queued or being processed</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-slate-500 mb-1">Total Queued</p>
                    <p className="text-2xl font-bold text-slate-900">{queueStatus.global.totalQueued.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-slate-500 mb-1">Active Workers</p>
                    <p className="text-2xl font-bold text-emerald-600">{queueStatus.global.globalActiveWorkers}</p>
                  </div>
                  <div>
                    <p className="text-slate-500 mb-1">Currently Processing</p>
                    <p className="text-2xl font-bold text-amber-600">{queueStatus.global.processing}</p>
                  </div>
                </div>
              </div>
            )}
          </Card>

          {/* Account Queues */}
          {queueStatus.global.accounts.length > 0 && (
            <Card className="p-6 bg-white border border-slate-200 rounded-2xl shadow-sm">
              <h2 className="text-xl font-semibold text-slate-900 mb-4">Account Queues</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="text-left py-3 px-4 font-semibold text-slate-700">User ID</th>
                      <th className="text-right py-3 px-4 font-semibold text-slate-700">Queued</th>
                      <th className="text-right py-3 px-4 font-semibold text-slate-700">Active Workers</th>
                      <th className="text-center py-3 px-4 font-semibold text-slate-700">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {queueStatus.global.accounts.map((account) => (
                      <tr key={account.userId} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-4 font-mono text-xs text-slate-600">{account.userId}</td>
                        <td className="py-3 px-4 text-right font-semibold text-slate-900">{account.queued.toLocaleString()}</td>
                        <td className="py-3 px-4 text-right font-semibold text-emerald-600">{account.activeWorkers}</td>
                        <td className="py-3 px-4 text-center">
                          {account.activeWorkers > 0 ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <div className="w-1.5 h-1.5 bg-emerald-600 rounded-full animate-pulse" />
                              Processing
                            </span>
                          ) : account.queued > 0 ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                              <Clock className="w-3 h-3" />
                              Queued
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-50 text-slate-700 border border-slate-200">
                              <CheckCircle2 className="w-3 h-3" />
                              Idle
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  )
}


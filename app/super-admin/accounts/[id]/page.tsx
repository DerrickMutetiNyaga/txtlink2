'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { Card } from '@/components/ui/card'
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Loader2,
  MessageSquare,
  RefreshCw,
  Send,
  XCircle,
} from 'lucide-react'

interface DeliveryStats {
  total: number
  delivered: number
  sent: number
  pending: number
  failed: number
  lastSmsAt: string | null
}

interface AccountInfo {
  id: string
  name: string
  email: string
  phone: string
  credits: number
  isActive: boolean
  delivery: DeliveryStats
  deliveryHealth: 'none' | 'good' | 'watch' | 'problem'
}

interface DeliveryRow {
  id: string
  createdAt: string
  time: string
  recipient: string
  senderId: string
  message: string
  displayStatus: string
  status: string
  failureReason?: string
  providerStatus: string | null
}

const STATUS_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'delivered', label: 'Delivered' },
  { id: 'sent', label: 'Sent' },
  { id: 'pending', label: 'Pending' },
  { id: 'failed', label: 'Failed' },
] as const

function healthLabel(health: AccountInfo['deliveryHealth']) {
  if (health === 'good') return { text: 'Deliveries look healthy', className: 'text-emerald-800 bg-emerald-50 border-emerald-200' }
  if (health === 'watch') return { text: 'Some messages still pending or failing', className: 'text-amber-900 bg-amber-50 border-amber-200' }
  if (health === 'problem') return { text: 'Deliveries are failing', className: 'text-red-800 bg-red-50 border-red-200' }
  return { text: 'No SMS sent yet', className: 'text-slate-700 bg-slate-50 border-slate-200' }
}

function statusClass(status: string) {
  const value = status.toLowerCase()
  if (value.includes('delivered') || value === 'completed') return 'bg-emerald-50 text-emerald-800 border-emerald-200'
  if (value.includes('fail') || value.includes('reject') || value.includes('undeliver')) return 'bg-red-50 text-red-800 border-red-200'
  if (value.includes('sent')) return 'bg-sky-50 text-sky-800 border-sky-200'
  return 'bg-amber-50 text-amber-900 border-amber-200'
}

export default function SuperAdminAccountDeliveriesPage() {
  const params = useParams<{ id: string }>()
  const accountId = params?.id
  const [account, setAccount] = useState<AccountInfo | null>(null)
  const [messages, setMessages] = useState<DeliveryRow[]>([])
  const [stats, setStats] = useState<DeliveryStats | null>(null)
  const [status, setStatus] = useState<(typeof STATUS_FILTERS)[number]['id']>('all')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const token = () => localStorage.getItem('token')

  const loadAccount = useCallback(async () => {
    if (!accountId) return
    const response = await fetch(`/api/super-admin/accounts/${accountId}`, {
      headers: { Authorization: `Bearer ${token()}` },
    })
    if (response.status === 401 || response.status === 403) {
      window.location.href = '/auth/login'
      return
    }
    if (!response.ok) throw new Error('Could not load this account')
    const data = await response.json()
    setAccount(data.account)
  }, [accountId])

  const loadDeliveries = useCallback(async () => {
    if (!accountId) return
    const query = new URLSearchParams({
      status,
      page: String(page),
      limit: '50',
    })
    const response = await fetch(`/api/super-admin/accounts/${accountId}/deliveries?${query}`, {
      headers: { Authorization: `Bearer ${token()}` },
    })
    if (!response.ok) throw new Error('Could not load deliveries')
    const data = await response.json()
    setMessages(data.messages || [])
    setStats(data.stats || null)
    setTotal(data.pagination?.total || 0)
    setTotalPages(data.pagination?.totalPages || 1)
  }, [accountId, page, status])

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError('')
      await Promise.all([loadAccount(), loadDeliveries()])
    } catch (err: any) {
      setError(err.message || 'Could not load account deliveries')
    } finally {
      setLoading(false)
    }
  }, [loadAccount, loadDeliveries])

  useEffect(() => {
    load()
  }, [load])

  const counts = stats || account?.delivery
  const health = healthLabel(account?.deliveryHealth || 'none')

  return (
    <div className="p-6 lg:p-8 bg-slate-50 min-h-screen">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <Link
              href="/super-admin/accounts"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-700 hover:text-emerald-800 mb-3"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Accounts
            </Link>
            <h1 className="text-2xl lg:text-3xl font-bold text-slate-900">
              {account?.name || 'Account deliveries'}
            </h1>
            <p className="text-slate-700 mt-1">
              {account ? `${account.email}${account.phone ? ` · ${account.phone}` : ''}` : 'Check whether this customer’s SMS is delivering.'}
            </p>
            {account && (
              <p className={`inline-flex mt-3 text-sm font-medium rounded-lg border px-3 py-1.5 ${health.className}`}>
                {health.text}
              </p>
            )}
          </div>
          <button
            onClick={load}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl shadow-sm text-slate-800 hover:bg-slate-100 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {error && (
          <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
            {error}
          </p>
        )}

        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <StatBox label="Total" value={counts?.total ?? 0} icon={MessageSquare} />
          <StatBox label="Delivered" value={counts?.delivered ?? 0} icon={CheckCircle2} tone="good" />
          <StatBox label="Sent" value={counts?.sent ?? 0} icon={Send} tone="info" />
          <StatBox label="Pending" value={counts?.pending ?? 0} icon={Clock} tone="warn" />
          <StatBox label="Failed" value={counts?.failed ?? 0} icon={XCircle} tone="bad" />
        </div>

        <Card className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm">
          <div className="flex flex-wrap gap-2">
            {STATUS_FILTERS.map((filter) => (
              <button
                key={filter.id}
                onClick={() => {
                  setStatus(filter.id)
                  setPage(1)
                }}
                className={`px-3 py-2 rounded-lg text-sm font-medium border ${
                  status === filter.id
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-white text-slate-800 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </Card>

        <Card className="border border-slate-200 rounded-2xl shadow-sm bg-white overflow-hidden">
          {loading && messages.length === 0 ? (
            <div className="p-12 flex justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
            </div>
          ) : messages.length === 0 ? (
            <div className="p-12 text-center">
              <MessageSquare className="w-10 h-10 mx-auto mb-3 text-slate-400" />
              <p className="font-medium text-slate-900">No messages in this view</p>
              <p className="text-sm text-slate-600 mt-1">Try another status filter or wait for this account to send SMS.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-700 uppercase">Time</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-700 uppercase">Recipient</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-700 uppercase">Sender</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-700 uppercase">Message</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-700 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {messages.map((row) => (
                    <tr key={row.id} className="align-top">
                      <td className="py-3 px-4 text-sm text-slate-700 whitespace-nowrap">
                        {row.time}
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-900">{row.recipient}</td>
                      <td className="py-3 px-4 text-sm text-slate-800">{row.senderId}</td>
                      <td className="py-3 px-4 text-sm text-slate-700 max-w-sm">
                        <p className="line-clamp-2">{row.message}</p>
                        {row.failureReason && (
                          <p className="text-sm text-red-700 mt-1">{row.failureReason}</p>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium border ${statusClass(row.displayStatus)}`}>
                          {row.displayStatus}
                        </span>
                        {row.providerStatus && (
                          <p className="text-xs text-slate-500 mt-1">{row.providerStatus}</p>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 text-sm text-slate-700">
              <p>{total.toLocaleString()} messages</p>
              <div className="flex gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((value) => Math.max(1, value - 1))}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 disabled:opacity-40"
                >
                  Previous
                </button>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage((value) => value + 1)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}

function StatBox({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string
  value: number
  icon: typeof MessageSquare
  tone?: 'good' | 'info' | 'warn' | 'bad'
}) {
  const toneClass =
    tone === 'good'
      ? 'text-emerald-700'
      : tone === 'bad'
        ? 'text-red-700'
        : tone === 'warn'
          ? 'text-amber-800'
          : tone === 'info'
            ? 'text-sky-700'
            : 'text-slate-700'
  return (
    <Card className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm">
      <p className="text-sm text-slate-600 mb-1">{label}</p>
      <div className="flex items-center justify-between">
        <p className={`text-2xl font-bold ${toneClass}`}>{value.toLocaleString()}</p>
        <Icon className={`w-5 h-5 ${toneClass}`} />
      </div>
    </Card>
  )
}

'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  DollarSign,
  TrendingUp,
  Save,
  RefreshCw,
  Wallet,
  ShoppingCart,
  Percent,
  Users,
  CreditCard,
} from 'lucide-react'

interface PeriodStats {
  purchases: number
  creditsSold: number
  revenueKes: number
  costKes: number
  profitKes: number
}

interface RecentPurchase {
  id: string
  createdAt: string
  userName: string
  userEmail: string
  paidKes: number
  credits: number
  sellingPriceKes: number
  buyingPriceKes: number
  costKes: number
  profitKes: number
}

interface CostProfitData {
  buyingPriceKes: number
  sellingPriceKes: number
  profitPerSmsKes: number
  periods: {
    today: PeriodStats
    last7d: PeriodStats
    last30d: PeriodStats
    allTime: PeriodStats
  }
  recentPurchases: RecentPurchase[]
}

function formatKes(value: number) {
  return `KSh ${Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

function formatWhen(iso: string) {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString()
}

export default function SuperAdminProfitPage() {
  const [data, setData] = useState<CostProfitData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [buyingPrice, setBuyingPrice] = useState('')
  const [sellingPrice, setSellingPrice] = useState('')
  const [message, setMessage] = useState<{ type: 'ok' | 'error'; text: string } | null>(null)

  const fetchData = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('token')
      const response = await fetch('/api/super-admin/cost-profit', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (response.status === 401 || response.status === 403) {
        window.location.href = '/auth/login'
        return
      }
      if (!response.ok) throw new Error('Failed to load profit data')
      const result = await response.json()
      const payload: CostProfitData = result.data
      setData(payload)
      setBuyingPrice(String(payload.buyingPriceKes ?? 0))
      setSellingPrice(String(payload.sellingPriceKes ?? 0))
    } catch (error) {
      console.error('Profit fetch error:', error)
      setMessage({ type: 'error', text: 'Could not load profit data.' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const previewProfit = useMemo(() => {
    const buy = Number(buyingPrice)
    const sell = Number(sellingPrice)
    if (!Number.isFinite(buy) || !Number.isFinite(sell)) return null
    return Math.round((sell - buy) * 10000) / 10000
  }, [buyingPrice, sellingPrice])

  const savePrices = async () => {
    const buy = Number(buyingPrice)
    const sell = Number(sellingPrice)
    if (!Number.isFinite(buy) || buy < 0) {
      setMessage({ type: 'error', text: 'Buying price must be 0 or greater.' })
      return
    }
    if (!Number.isFinite(sell) || sell <= 0) {
      setMessage({ type: 'error', text: 'Selling price must be greater than 0.' })
      return
    }

    try {
      setSaving(true)
      setMessage(null)
      const token = localStorage.getItem('token')
      const response = await fetch('/api/super-admin/cost-profit', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ buyingPriceKes: buy, sellingPriceKes: sell }),
      })
      const result = await response.json()
      if (!response.ok) {
        throw new Error(result.error || 'Failed to save prices')
      }
      setMessage({ type: 'ok', text: 'Buying and selling prices saved. Profit will update as customers buy credits.' })
      await fetchData()
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to save prices.' })
    } finally {
      setSaving(false)
    }
  }

  const periods = data?.periods

  return (
    <div className="p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-slate-900">Profit</h1>
            <p className="text-slate-600 mt-1">
              Set buying and selling prices, then track profit as customers pay. All M-Pesa payments are under Finances.
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              href="/super-admin/mpesa-transactions"
              className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl shadow-sm text-slate-700 hover:bg-slate-100"
            >
              <CreditCard className="w-4 h-4" />
              All payments
            </Link>
            <button
              onClick={fetchData}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl shadow-sm text-slate-700 hover:bg-slate-100 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        <Card className="p-6 border border-slate-200/70 rounded-2xl bg-white shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-700">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Your prices (KES per SMS)</h2>
              <p className="text-sm text-slate-500">1 SMS credit = 1 billed SMS. Selling price is the default for accounts without a custom rate.</p>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <Label className="mb-2 block">Buying price</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={buyingPrice}
                onChange={(e) => setBuyingPrice(e.target.value)}
                placeholder="What you pay the provider"
              />
              <p className="text-xs text-slate-500 mt-1">Your cost from the SMS provider</p>
            </div>
            <div>
              <Label className="mb-2 block">Selling price</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={sellingPrice}
                onChange={(e) => setSellingPrice(e.target.value)}
                placeholder="What customers pay"
              />
              <p className="text-xs text-slate-500 mt-1">Default price customers pay per SMS</p>
            </div>
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
              <p className="text-sm text-emerald-800 mb-1">Profit per SMS</p>
              <p className="text-2xl font-semibold text-emerald-900">
                {previewProfit == null ? '—' : formatKes(previewProfit)}
              </p>
              <p className="text-xs text-emerald-700 mt-1">Selling price − buying price</p>
            </div>
          </div>

          {previewProfit != null && previewProfit < 0 && (
            <p className="text-sm text-rose-600 mt-4">Selling price is below buying price. Each SMS sold would lose money.</p>
          )}

          {message && (
            <p className={`text-sm mt-4 ${message.type === 'ok' ? 'text-emerald-700' : 'text-rose-600'}`}>
              {message.text}
            </p>
          )}

          <div className="mt-6">
            <Button
              onClick={savePrices}
              disabled={saving || loading}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <Save className="w-4 h-4 mr-2" />
              {saving ? 'Saving...' : 'Save prices'}
            </Button>
          </div>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Profit today"
            value={formatKes(periods?.today.profitKes || 0)}
            subtitle={`${periods?.today.purchases || 0} purchases`}
            icon={TrendingUp}
          />
          <StatCard
            title="Profit last 7 days"
            value={formatKes(periods?.last7d.profitKes || 0)}
            subtitle={`${periods?.last7d.creditsSold || 0} credits sold`}
            icon={Wallet}
          />
          <StatCard
            title="Profit last 30 days"
            value={formatKes(periods?.last30d.profitKes || 0)}
            subtitle={`${formatKes(periods?.last30d.revenueKes || 0)} collected`}
            icon={ShoppingCart}
          />
          <StatCard
            title="All-time profit"
            value={formatKes(periods?.allTime.profitKes || 0)}
            subtitle={`${formatKes(periods?.allTime.costKes || 0)} provider cost`}
            icon={Percent}
          />
        </div>

        {periods && (
          <Card className="p-6 border border-slate-200/70 rounded-2xl bg-white shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Breakdown</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wider text-slate-600">
                    <th className="py-3 pr-4">Period</th>
                    <th className="py-3 pr-4 text-right">Purchases</th>
                    <th className="py-3 pr-4 text-right">Credits sold</th>
                    <th className="py-3 pr-4 text-right">Collected</th>
                    <th className="py-3 pr-4 text-right">Your cost</th>
                    <th className="py-3 text-right">Profit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <BreakdownRow label="Today" stats={periods.today} />
                  <BreakdownRow label="Last 7 days" stats={periods.last7d} />
                  <BreakdownRow label="Last 30 days" stats={periods.last30d} />
                  <BreakdownRow label="All time" stats={periods.allTime} />
                </tbody>
              </table>
            </div>
            <p className="text-xs text-slate-500 mt-4">
              Profit on purchases = amount customers paid − (credits × your buying price). Older top-ups use the current buying price if they were recorded before this feature.
            </p>
          </Card>
        )}

        <Card className="p-6 border border-slate-200/70 rounded-2xl bg-white shadow-sm">
          <div className="flex items-center justify-between gap-2 mb-4">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-slate-500" />
              <h2 className="text-lg font-semibold text-slate-900">Recent payments</h2>
            </div>
            <Link href="/super-admin/mpesa-transactions" className="text-sm text-emerald-700 hover:underline">
              View all M-Pesa payments →
            </Link>
          </div>
          {loading && !data ? (
            <p className="text-slate-500">Loading...</p>
          ) : data?.recentPurchases?.length ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wider text-slate-600">
                    <th className="py-3 pr-4">When</th>
                    <th className="py-3 pr-4">Customer</th>
                    <th className="py-3 pr-4 text-right">Paid</th>
                    <th className="py-3 pr-4 text-right">Credits</th>
                    <th className="py-3 pr-4 text-right">Your cost</th>
                    <th className="py-3 text-right">Profit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.recentPurchases.map((row) => (
                    <tr key={row.id}>
                      <td className="py-3 pr-4 text-sm text-slate-600 whitespace-nowrap">{formatWhen(row.createdAt)}</td>
                      <td className="py-3 pr-4">
                        <div className="font-medium text-slate-900">{row.userName}</div>
                        <div className="text-xs text-slate-500">{row.userEmail}</div>
                      </td>
                      <td className="py-3 pr-4 text-right text-slate-900">{formatKes(row.paidKes)}</td>
                      <td className="py-3 pr-4 text-right text-slate-900">{row.credits.toLocaleString()}</td>
                      <td className="py-3 pr-4 text-right text-slate-600">{formatKes(row.costKes)}</td>
                      <td className={`py-3 text-right font-semibold ${row.profitKes >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                        {formatKes(row.profitKes)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-slate-500">No credit purchases yet. Profit will appear here as customers top up.</p>
          )}
        </Card>
      </div>
    </div>
  )
}

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
}: {
  title: string
  value: string
  subtitle: string
  icon: React.ElementType
}) {
  return (
    <Card className="p-5 border border-slate-200/70 rounded-2xl bg-white shadow-sm">
      <div className="flex items-start justify-between mb-3">
        <div className="p-2 rounded-lg bg-emerald-50 text-emerald-700">
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <p className="text-sm text-slate-600">{title}</p>
      <p className="text-2xl font-semibold text-slate-900 mt-1">{value}</p>
      <p className="text-xs text-slate-500 mt-1">{subtitle}</p>
    </Card>
  )
}

function BreakdownRow({ label, stats }: { label: string; stats: PeriodStats }) {
  return (
    <tr>
      <td className="py-3 pr-4 font-medium text-slate-900">{label}</td>
      <td className="py-3 pr-4 text-right text-slate-700">{stats.purchases.toLocaleString()}</td>
      <td className="py-3 pr-4 text-right text-slate-700">{stats.creditsSold.toLocaleString()}</td>
      <td className="py-3 pr-4 text-right text-slate-700">{formatKes(stats.revenueKes)}</td>
      <td className="py-3 pr-4 text-right text-slate-700">{formatKes(stats.costKes)}</td>
      <td className={`py-3 text-right font-semibold ${stats.profitKes >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
        {formatKes(stats.profitKes)}
      </td>
    </tr>
  )
}

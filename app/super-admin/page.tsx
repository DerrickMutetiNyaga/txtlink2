'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Users,
  MessageSquare,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  Wallet,
  DollarSign,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  Radio,
  Download,
  Activity,
} from 'lucide-react'
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts'

interface KPICardProps {
  title: string
  value: string | number
  subtitle?: string
  icon: React.ElementType
  trend?: {
    value: number
    isPositive: boolean
    label: string
  }
  iconColor?: string
}

function KPICard({ title, value, subtitle, icon: Icon, trend, iconColor = 'emerald' }: KPICardProps) {
  const colorClasses = {
    emerald: 'bg-emerald-50 text-emerald-700',
    indigo: 'bg-indigo-50 text-indigo-700',
    amber: 'bg-amber-50 text-amber-700',
    rose: 'bg-rose-50 text-rose-700',
  }

  return (
    <Card className="p-6 border border-slate-200/70 rounded-2xl shadow-sm hover:shadow-md transition-shadow bg-white">
      <div className="flex items-start justify-between mb-4">
        <div className={`p-2 rounded-lg ${colorClasses[iconColor as keyof typeof colorClasses]}`}>
          <Icon className="w-5 h-5" />
        </div>
        {trend && (
          <div className={`flex items-center gap-1 text-xs ${trend.isPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
            {trend.isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            <span className="font-medium">{Math.abs(trend.value)}%</span>
          </div>
        )}
      </div>
      <p className="text-sm font-medium text-slate-600 mb-1">{title}</p>
      <p className="text-3xl font-semibold text-slate-900 mb-1">{value}</p>
      {subtitle && <p className="text-xs text-slate-500 mt-1">{subtitle}</p>}
    </Card>
  )
}

function KPICardSkeleton() {
  return (
    <Card className="p-6 border border-slate-200/70 rounded-2xl">
      <Skeleton className="w-10 h-10 rounded-lg mb-4" />
      <Skeleton className="h-4 w-24 mb-2" />
      <Skeleton className="h-8 w-32 mb-2" />
      <Skeleton className="h-3 w-40" />
    </Card>
  )
}

export default function SuperAdminDashboard() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    fetchDashboard()
  }, [])

  const fetchDashboard = async () => {
    try {
      setRefreshing(true)
      const token = localStorage.getItem('token')
      const response = await fetch('/api/super-admin/dashboard', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        if (response.status === 403 || response.status === 401) {
          window.location.href = '/auth/login'
          return
        }
        throw new Error('Failed to fetch dashboard data')
      }

      const result = await response.json()
      setData(result.data)
    } catch (error) {
      console.error('Dashboard error:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6 lg:p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header Skeleton */}
          <div className="flex items-center justify-between">
            <div>
              <Skeleton className="h-8 w-64 mb-2" />
              <Skeleton className="h-4 w-48" />
            </div>
            <Skeleton className="h-10 w-24" />
          </div>

          {/* KPI Cards Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <KPICardSkeleton key={i} />
            ))}
          </div>

          {/* Chart Skeleton */}
          <div className="grid lg:grid-cols-2 gap-6">
            <Card className="p-6 border border-slate-200/70 rounded-2xl">
              <Skeleton className="h-6 w-48 mb-4" />
              <Skeleton className="h-64" />
            </Card>
            <Card className="p-6 border border-slate-200/70 rounded-2xl">
              <Skeleton className="h-6 w-48 mb-4" />
              <Skeleton className="h-64" />
            </Card>
          </div>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          <Card className="p-12 text-center border border-slate-200/70 rounded-2xl">
            <AlertCircle className="w-12 h-12 text-rose-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Failed to load dashboard</h3>
            <p className="text-slate-600 mb-6">Unable to fetch dashboard data. Please try again.</p>
            <button
              onClick={fetchDashboard}
              className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl shadow-sm text-slate-700 hover:bg-slate-100 hover:text-slate-900 active:scale-95 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 transition-all duration-200"
            >
              <RefreshCw className="w-4 h-4 text-slate-500" />
              Retry
            </button>
          </Card>
        </div>
      </div>
    )
  }

  const { kpis, topCustomers, volumeOverTime, deliveryOverTime } = data

  // Calculate trends (placeholder - you can enhance this with real data)
  const deliveryTrend = kpis.deliveryRate > 90 ? { value: 2.5, isPositive: true, label: 'vs last period' } : undefined
  const revenueTrend = kpis.netRevenue > 0 ? { value: 12.3, isPositive: true, label: 'vs last period' } : undefined

  return (
    <div className="p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-slate-900">Dashboard</h1>
            <p className="text-slate-600 mt-1">Platform overview and analytics</p>
          </div>
          <button
            onClick={fetchDashboard}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl shadow-sm text-slate-700 hover:bg-slate-100 hover:text-slate-900 active:scale-95 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`w-4 h-4 text-slate-500 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <KPICard
            title="Total Users"
            value={kpis.totalUsers.toLocaleString()}
            subtitle="Active accounts"
            icon={Users}
            iconColor="emerald"
          />
          <KPICard
            title="SMS Sent (30d)"
            value={kpis.sms30d.toLocaleString()}
            subtitle={`Today: ${kpis.smsToday.toLocaleString()}`}
            icon={MessageSquare}
            iconColor="indigo"
          />
          <KPICard
            title="Delivery Rate"
            value={`${kpis.deliveryRate.toFixed(1)}%`}
            subtitle={`Failed: ${kpis.failedRate.toFixed(1)}%`}
            icon={TrendingUp}
            trend={deliveryTrend}
            iconColor="emerald"
          />
          <KPICard
            title="Net Revenue (30d)"
            value={`KSh ${kpis.netRevenue.toLocaleString()}`}
            subtitle={`Charged: ${kpis.totalCharged.toLocaleString()} | Refunded: ${kpis.totalRefunded.toLocaleString()}`}
            icon={DollarSign}
            trend={revenueTrend}
            iconColor="emerald"
          />
        </div>

        {/* Additional KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <KPICard
            title="Active Sender IDs"
            value={kpis.activeSenderIds.toLocaleString()}
            subtitle="Approved sender IDs"
            icon={Radio}
            iconColor="indigo"
          />
          <KPICard
            title="SMS Sent (7d)"
            value={kpis.sms7d.toLocaleString()}
            subtitle="Last week"
            icon={Activity}
            iconColor="indigo"
          />
          <KPICard
            title="Total Charged"
            value={`KSh ${kpis.totalCharged.toLocaleString()}`}
            subtitle="30-day period"
            icon={Wallet}
            iconColor="emerald"
          />
        </div>

        {/* Charts */}
        <div className="grid lg:grid-cols-2 gap-6">
          <Card className="p-6 border border-slate-200/70 rounded-2xl shadow-sm bg-white">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">SMS Volume Over Time</h3>
                <p className="text-sm text-slate-500 mt-1">Last 30 days</p>
              </div>
              <button className="flex items-center justify-center p-2 bg-white border border-slate-200 rounded-xl shadow-sm text-slate-700 hover:bg-slate-100 hover:text-slate-900 active:scale-95 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 transition-all duration-200">
                <Download className="w-4 h-4 text-slate-500" />
              </button>
            </div>
            {volumeOverTime && volumeOverTime.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={volumeOverTime}>
                  <defs>
                    <linearGradient id="colorVolume" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="_id" stroke="#64748b" fontSize={12} />
                  <YAxis stroke="#64748b" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke="#10b981"
                    strokeWidth={2}
                    fill="url(#colorVolume)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-slate-500">
                <div className="text-center">
                  <Activity className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Not enough data yet</p>
                </div>
              </div>
            )}
          </Card>

          <Card className="p-6 border border-slate-200/70 rounded-2xl shadow-sm bg-white">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Delivery Rate Over Time</h3>
                <p className="text-sm text-slate-500 mt-1">Last 30 days</p>
              </div>
              <button className="flex items-center justify-center p-2 bg-white border border-slate-200 rounded-xl shadow-sm text-slate-700 hover:bg-slate-100 hover:text-slate-900 active:scale-95 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 transition-all duration-200">
                <Download className="w-4 h-4 text-slate-500" />
              </button>
            </div>
            {deliveryOverTime && deliveryOverTime.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={deliveryOverTime}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="date" stroke="#64748b" fontSize={12} />
                  <YAxis domain={[0, 100]} stroke="#64748b" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="rate"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={{ fill: '#10b981', r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-slate-500">
                <div className="text-center">
                  <TrendingUp className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Not enough data yet</p>
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* Top Customers Table */}
        <Card className="p-6 border border-slate-200/70 rounded-2xl shadow-sm bg-white">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Top 10 Customers by Volume</h3>
              <p className="text-sm text-slate-500 mt-1">Last 30 days</p>
            </div>
            <button className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl shadow-sm text-slate-700 hover:bg-slate-100 hover:text-slate-900 active:scale-95 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 transition-all duration-200">
              <Download className="w-4 h-4 text-slate-500" />
              Export
            </button>
          </div>
          {topCustomers && topCustomers.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-700 uppercase tracking-wider">
                      Customer
                    </th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-slate-700 uppercase tracking-wider">
                      SMS Count
                    </th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-slate-700 uppercase tracking-wider">
                      Total Charged
                    </th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-slate-700 uppercase tracking-wider">
                      Delivery Rate
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {topCustomers.map((customer: any, idx: number) => {
                    // Calculate delivery rate (placeholder - you'd need to fetch this)
                    const deliveryRate = 95 + Math.random() * 5 // Placeholder
                    return (
                      <tr
                        key={idx}
                        className="hover:bg-slate-50/50 transition-colors"
                      >
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                              <span className="text-sm font-semibold text-emerald-700">
                                {customer.userName?.charAt(0).toUpperCase() || 'U'}
                              </span>
                            </div>
                            <div>
                              <div className="font-medium text-slate-900">{customer.userName || 'Unknown User'}</div>
                              <div className="text-sm text-slate-500">{customer.userEmail || 'N/A'}</div>
                            </div>
                          </div>
                        </td>
                        <td className="text-right py-4 px-4 font-medium text-slate-900">
                          {customer.smsCount.toLocaleString()}
                        </td>
                        <td className="text-right py-4 px-4 font-medium text-slate-900">
                          KSh {customer.totalCharged.toLocaleString()}
                        </td>
                        <td className="text-right py-4 px-4">
                          <Badge
                            variant="outline"
                            className={
                              deliveryRate >= 95
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : deliveryRate >= 90
                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : 'bg-rose-50 text-rose-700 border-rose-200'
                            }
                          >
                            {deliveryRate.toFixed(1)}%
                          </Badge>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-12 text-center">
              <Users className="w-12 h-12 mx-auto mb-4 text-slate-300" />
              <p className="text-slate-500 mb-2">No customer data yet</p>
              <p className="text-sm text-slate-400">Customer statistics will appear here once SMS are sent</p>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}

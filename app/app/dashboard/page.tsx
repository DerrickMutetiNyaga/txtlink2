'use client'

import { useState, useEffect } from 'react'
import { PortalLayout } from '@/components/portal-layout'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  MessageSquare,
  TrendingUp,
  AlertCircle,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  Activity,
  BarChart3,
  Download,
  FileText,
  Plus,
  Users,
  Radio,
  Key,
  CheckCircle2,
  Clock,
  XCircle,
  ChevronRight,
  MoreVertical,
  Filter,
  Loader2,
} from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import Link from 'next/link'
import SenderIdAdBanner from '@/components/sender-id-ad/SenderIdAdBanner'
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts'

// Loading Skeleton for KPI Cards
function KPISkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
      {[1, 2, 3, 4].map((idx) => (
        <Card
          key={idx}
          className="p-6 bg-white border border-slate-200/80 rounded-2xl shadow-sm"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Skeleton className="w-4 h-4 rounded" />
              <Skeleton className="h-4 w-24 rounded" />
            </div>
            <Skeleton className="h-6 w-16 rounded-full" />
          </div>
          <div className="flex items-end justify-between mb-3">
            <Skeleton className="h-10 w-32 rounded" />
            <Skeleton className="h-5 w-12 rounded" />
          </div>
          <Skeleton className="h-4 w-20 rounded" />
        </Card>
      ))}
    </div>
  )
}

// Premium KPI Tiles Component - Clean & Minimal
function KPIPanel({ kpis, loading }: { kpis: any[]; loading?: boolean }) {
  if (loading) {
    return <KPISkeleton />
  }
  // Simple sparkline SVG generator - thin line only
  const SparklineSVG = ({ data, positive }: { data: any[]; positive: boolean }) => {
    const width = 48
    const height = 20
    const padding = 2
    const chartWidth = width - padding * 2
    const chartHeight = height - padding * 2
    
    const max = Math.max(...data.map(d => d.value))
    const min = Math.min(...data.map(d => d.value))
    const range = max - min || 1
    
    const points = data.map((d, i) => {
      const x = padding + (i / (data.length - 1)) * chartWidth
      const y = padding + chartHeight - ((d.value - min) / range) * chartHeight
      return `${x},${y}`
    }).join(' ')
    
    return (
      <svg width={width} height={height} className="opacity-40">
        <polyline
          points={points}
          fill="none"
          stroke={positive ? '#10b981' : '#ef4444'}
          strokeWidth="1"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
      {kpis.map((kpi, idx) => {
        const IconComponent = kpi.icon
        const isAccountBalance = kpi.label === 'Account Balance'
        
        return (
          <Card
            key={idx}
            className="p-6 bg-white border border-slate-200/80 rounded-2xl shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
          >
            {/* Top Row: Icon + Label + Change Badge */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <IconComponent size={16} className="text-slate-400" />
                <p className="text-sm font-medium text-slate-600">{kpi.label}</p>
              </div>
              {kpi.change && kpi.positive !== null && (
                <span
                  className={`flex items-center gap-1 text-sm font-semibold px-2 py-1 rounded-full ${
                    kpi.positive
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/50'
                      : 'bg-red-50 text-red-700 border border-red-200/50'
                  }`}
                >
                  {kpi.positive ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                  {kpi.change}
                </span>
              )}
            </div>

            {/* Main Value + Optional Sparkline */}
            <div className="flex items-end justify-between mb-3">
              {kpi.value === 'Loading...' ? (
                <div className="flex items-center gap-3">
                  <Loader2 className="w-8 h-8 text-slate-400 animate-spin" />
                  <Skeleton className="h-10 w-32 rounded" />
                </div>
              ) : (
                <>
                  <p className="text-3xl md:text-4xl font-semibold text-slate-900 tracking-tight leading-tight">
                    {kpi.value}
                  </p>
                  {kpi.sparklineData && (
                    <div className="ml-3 mb-1">
                      <SparklineSVG data={kpi.sparklineData} positive={kpi.positive} />
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Caption + Action */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-slate-500">{kpi.footerHint}</p>
              
              {/* Top up button for Account Balance - Premium Primary Action */}
              {isAccountBalance && (
                <Link
                  href="/app/billing"
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 text-white text-sm font-medium shadow-sm ring-1 ring-emerald-400/30 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:shadow-sm transition-all duration-200"
                >
                  <Plus size={14} />
                  Top up
                </Link>
              )}
            </div>
          </Card>
        )
      })}
    </div>
  )
}

// Premium Activity Item Component
function ActivityItem({ icon, title, subtitle, time, status, category }: any) {
  const statusColors: any = {
    completed: 'bg-emerald-50 text-emerald-700 border-emerald-200/50',
    approved: 'bg-blue-50 text-blue-700 border-blue-200/50',
    failed: 'bg-red-50 text-red-700 border-red-200/50',
    pending: 'bg-amber-50 text-amber-700 border-amber-200/50',
  }

  // Map icon string to icon component
  const iconMap: Record<string, React.ElementType> = {
    MessageSquare,
    Radio,
    Wallet,
    Users,
    Key,
  }

  const IconComponent = typeof icon === 'string' ? iconMap[icon] || MessageSquare : icon || MessageSquare

  return (
    <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-4 p-4 sm:p-5 rounded-xl hover:bg-slate-50/50 transition-all duration-200 border border-slate-100 group">
      <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0 group-hover:bg-[#ECFDF5] transition-colors">
        <IconComponent size={20} className="text-[#0F766E]" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-base font-medium text-slate-900 mb-1 leading-relaxed">{title}</p>
        <p className="text-sm text-slate-500 mb-2 leading-relaxed">{subtitle}</p>
        <div className="flex items-center gap-2 mt-2">
          <span className="text-sm text-slate-400">{time}</span>
          {category && (
            <>
              <span className="text-slate-300">•</span>
              <span className="text-sm text-slate-400">{category}</span>
            </>
          )}
        </div>
      </div>
      <span
        className={`text-sm font-semibold px-3 py-1.5 rounded-full border capitalize flex-shrink-0 self-start sm:self-auto ${statusColors[status] || statusColors.completed}`}
      >
        {status}
      </span>
    </div>
  )
}

export default function DashboardPage() {
  const [dateRange, setDateRange] = useState('7D')
  const [activityFilter, setActivityFilter] = useState('All')
  const [balance, setBalance] = useState<number>(0)
  const [loadingBalance, setLoadingBalance] = useState(true)
  const [loadingStats, setLoadingStats] = useState(true)
  const [dashboardData, setDashboardData] = useState<any>(null)

  // Fetch real balance from API
  useEffect(() => {
    const fetchBalance = async () => {
      try {
        const token = localStorage.getItem('token')
        const response = await fetch('/api/user/balance', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (response.ok) {
          const data = await response.json()
          setBalance(data.balance || 0)
        }
      } catch (error) {
        console.error('Failed to fetch balance:', error)
      } finally {
        setLoadingBalance(false)
      }
    }

    fetchBalance()
  }, [])

  // Fetch dashboard statistics
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoadingStats(true)
        const token = localStorage.getItem('token')
        const response = await fetch(`/api/user/dashboard?range=${dateRange}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (response.ok) {
          const data = await response.json()
          setDashboardData(data)
        }
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error)
      } finally {
        setLoadingStats(false)
      }
    }

    fetchDashboardData()
  }, [dateRange])

  // KPI Data with sparklines - using real data
  const kpis = dashboardData
    ? [
        {
          icon: MessageSquare,
          label: 'SMS Sent (Today)',
          value: dashboardData.kpis.smsSentToday.value.toLocaleString(),
          change: `${dashboardData.kpis.smsSentToday.positive ? '+' : ''}${dashboardData.kpis.smsSentToday.change}%`,
          positive: dashboardData.kpis.smsSentToday.positive,
          footerHint: 'vs yesterday',
          sparklineData: dashboardData.kpis.smsSentToday.sparklineData,
        },
        {
          icon: TrendingUp,
          label: 'Delivery Rate',
          value: `${dashboardData.kpis.deliveryRate.value.toFixed(1)}%`,
          change: `${dashboardData.kpis.deliveryRate.positive ? '+' : ''}${dashboardData.kpis.deliveryRate.change}%`,
          positive: dashboardData.kpis.deliveryRate.positive,
          footerHint: 'vs last week',
          sparklineData: dashboardData.kpis.deliveryRate.sparklineData,
        },
        {
          icon: AlertCircle,
          label: 'Failed Messages',
          value: dashboardData.kpis.failedMessages.value.toLocaleString(),
          change: `${dashboardData.kpis.failedMessages.positive ? '-' : '+'}${Math.abs(parseFloat(dashboardData.kpis.failedMessages.change))}%`,
          positive: dashboardData.kpis.failedMessages.positive,
          footerHint: 'vs yesterday',
          sparklineData: dashboardData.kpis.failedMessages.sparklineData,
        },
        {
          icon: Wallet,
          label: 'Account Balance',
          value: loadingBalance ? 'Loading...' : `${balance.toLocaleString()} credits`,
          change: null,
          positive: null,
          footerHint: 'Available credits',
          sparklineData: null,
        },
      ]
    : [
        {
          icon: MessageSquare,
          label: 'SMS Sent (Today)',
          value: loadingStats ? 'Loading...' : '0',
          change: null,
          positive: null,
          footerHint: 'vs yesterday',
          sparklineData: null,
        },
        {
          icon: TrendingUp,
          label: 'Delivery Rate',
          value: loadingStats ? 'Loading...' : '0%',
          change: null,
          positive: null,
          footerHint: 'vs last week',
          sparklineData: null,
        },
        {
          icon: AlertCircle,
          label: 'Failed Messages',
          value: loadingStats ? 'Loading...' : '0',
          change: null,
          positive: null,
          footerHint: 'vs yesterday',
          sparklineData: null,
        },
        {
          icon: Wallet,
          label: 'Account Balance',
          value: loadingBalance ? 'Loading...' : `${balance.toLocaleString()} credits`,
          change: null,
          positive: null,
          footerHint: 'Available credits',
          sparklineData: null,
        },
      ]

  // Chart Data - using real data
  const smsVolumeData = dashboardData?.chartData || []

  const deliveryBreakdown = dashboardData
    ? [
        { name: 'Delivered', value: dashboardData.deliveryBreakdown.delivered, color: '#10b981' },
        { name: 'Pending', value: dashboardData.deliveryBreakdown.pending, color: '#f59e0b' },
        { name: 'Failed', value: dashboardData.deliveryBreakdown.failed, color: '#ef4444' },
      ]
    : [
        { name: 'Delivered', value: 0, color: '#10b981' },
        { name: 'Pending', value: 0, color: '#f59e0b' },
        { name: 'Failed', value: 0, color: '#ef4444' },
      ]

  // Activity Data - using real data
  const activities = dashboardData?.activities || []

  const activityFilters = ['All', 'Campaigns', 'Billing', 'Sender IDs', 'API', 'Contacts']

  return (
    <PortalLayout activeSection="Dashboard">
      <div className="space-y-6 w-full">
        {/* Sender ID Ad Banner */}
        <SenderIdAdBanner currentPage="dashboard" />
        
        {/* Premium Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-5 mb-4">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-3">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-semibold text-slate-900">Dashboard</h1>
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 text-xs sm:text-sm font-semibold border border-emerald-200/50 w-fit">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                All systems operational
              </span>
            </div>
            <p className="text-base text-slate-500 leading-relaxed">Dashboard / Overview</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {/* Date Range Selector */}
            <div className="flex items-center gap-1 p-1 sm:p-1.5 bg-slate-100 rounded-xl border border-slate-200/60 w-full sm:w-auto">
              {['Today', '7D', '30D'].map((range) => (
                <button
                  key={range}
                  onClick={() => setDateRange(range)}
                  className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    dateRange === range
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {range}
                </button>
              ))}
            </div>
            {/* Quick Actions Dropdown */}
            <div className="relative group">
              <Button
                variant="outline"
                className="h-9 px-3 border-slate-200 text-slate-700 hover:bg-slate-50"
              >
                <MoreVertical size={16} />
              </Button>
              <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-xl shadow-lg border border-slate-200/60 p-1.5 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                <Link
                  href="/app/templates"
                  className="flex items-center gap-2.5 px-4 py-2.5 rounded-lg hover:bg-slate-50 text-base text-slate-700 leading-relaxed"
                >
                  <FileText size={18} />
                  Create Template
                </Link>
                <Link
                  href="/app/billing"
                  className="flex items-center gap-2.5 px-4 py-2.5 rounded-lg hover:bg-slate-50 text-base text-slate-700 leading-relaxed"
                >
                  <Wallet size={18} />
                  Buy Credits
                </Link>
              </div>
            </div>
            <Link href="/app/send-sms" className="w-full sm:w-auto">
              <Button className="w-full sm:w-auto h-11 px-5 bg-[#0F766E] hover:bg-[#115E59] text-white rounded-xl text-base font-medium shadow-sm hover:shadow-md transition-all">
                <Plus size={18} className="mr-2" />
                New SMS
              </Button>
            </Link>
          </div>
        </div>

        {/* Premium KPI Tiles */}
        <div className="mb-2">
          <KPIPanel kpis={kpis} loading={loadingStats && !dashboardData} />
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
          {/* SMS Volume Chart - Wider */}
          <Card className="md:col-span-2 app-card-padding bg-white/80 backdrop-blur-sm border border-slate-200/70 rounded-2xl shadow-sm">
            <div className="app-section-header mb-4 sm:mb-6">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/60">
                  <BarChart3 size={20} className="text-[#0F766E]" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 leading-tight">SMS Volume</h3>
                  <p className="text-sm text-slate-500 leading-relaxed mt-0.5">Messages sent and delivered</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {['7D', '30D', '90D'].map((period) => (
                  <button
                    key={period}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      dateRange === period
                        ? 'bg-slate-100 text-slate-900'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    {period}
                  </button>
                ))}
                <button className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                  <Download size={18} className="text-slate-600" />
                </button>
              </div>
            </div>
            <div className="h-56 sm:h-64 lg:h-72">
              {loadingStats && smsVolumeData.length === 0 ? (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center">
                    <Loader2 className="w-12 h-12 text-slate-400 animate-spin mx-auto mb-4" />
                    <p className="text-sm text-slate-500">Loading chart data...</p>
                  </div>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={smsVolumeData}>
                  <defs>
                    <linearGradient id="colorSent" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0F766E" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#0F766E" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorDelivered" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="date" stroke="#94a3b8" fontSize={13} />
                  <YAxis stroke="#94a3b8" fontSize={13} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      padding: '10px',
                      fontSize: '14px',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="sent"
                    stroke="#0F766E"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorSent)"
                    name="Sent"
                  />
                  <Area
                    type="monotone"
                    dataKey="delivered"
                    stroke="#10b981"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorDelivered)"
                    name="Delivered"
                  />
                    <Legend />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </Card>

          {/* Delivery Breakdown - Narrower */}
          <Card className="app-card-padding bg-white/80 backdrop-blur-sm border border-slate-200/70 rounded-2xl shadow-sm">
            <div className="app-section-header mb-4 sm:mb-6">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/60">
                  <Activity size={20} className="text-[#0F766E]" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 leading-tight">Delivery Breakdown</h3>
                  <p className="text-sm text-slate-500 leading-relaxed mt-0.5">Status distribution</p>
                </div>
              </div>
            </div>
            <div className="h-56 sm:h-64 lg:h-72">
              {loadingStats && deliveryBreakdown.every(item => item.value === 0) ? (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center">
                    <Loader2 className="w-12 h-12 text-slate-400 animate-spin mx-auto mb-4" />
                    <p className="text-sm text-slate-500">Loading breakdown data...</p>
                  </div>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                  <Pie
                    data={deliveryBreakdown}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {deliveryBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      padding: '10px',
                      fontSize: '14px',
                    }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    height={40}
                    iconType="circle"
                    wrapperStyle={{ fontSize: '13px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
            <div className="mt-5 space-y-3 pt-5 border-t border-slate-100">
              {deliveryBreakdown.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between text-base">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-3.5 h-3.5 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-slate-600 leading-relaxed">{item.name}</span>
                  </div>
                  <span className="font-semibold text-slate-900">{item.value.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Bottom Grid: Activity + System Status */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Recent Activity - Wider */}
          <Card className="lg:col-span-2 app-card-padding bg-white/80 backdrop-blur-sm border border-slate-200/70 rounded-2xl shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between mb-4 sm:mb-6">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/60">
                  <Calendar size={20} className="text-[#0F766E]" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 leading-tight">Recent Activity</h3>
                  <p className="text-sm text-slate-500 leading-relaxed mt-0.5">Latest platform events</p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex flex-wrap items-center gap-1.5 p-1.5 bg-slate-100 rounded-lg border border-slate-200/60">
                  {activityFilters.map((filter) => (
                    <button
                      key={filter}
                      onClick={() => setActivityFilter(filter)}
                      className={`px-3 py-1.5 rounded text-sm font-medium transition-all ${
                        activityFilter === filter
                          ? 'bg-white text-slate-900 shadow-sm'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {filter}
                    </button>
                  ))}
                </div>
                <Link
                  href="/app/reports"
                  className="flex items-center gap-2 text-base font-medium text-[#0F766E] hover:text-[#115E59] transition-colors group"
                >
                  View all
                  <ChevronRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
                </Link>
              </div>
            </div>
            <div className="space-y-3">
              {loadingStats && activities.length === 0 ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((idx) => (
                    <div key={idx} className="flex items-start gap-4 p-5 rounded-xl border border-slate-100">
                      <Skeleton className="w-12 h-12 rounded-xl flex-shrink-0" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-5 w-3/4 rounded" />
                        <Skeleton className="h-4 w-full rounded" />
                        <Skeleton className="h-4 w-1/2 rounded" />
                      </div>
                      <Skeleton className="h-6 w-20 rounded-full flex-shrink-0" />
                    </div>
                  ))}
                </div>
              ) : activities.length > 0 ? (
                activities
                  .filter(
                    (activity) => activityFilter === 'All' || activity.category === activityFilter
                  )
                  .map((activity) => (
                    <ActivityItem key={activity.id || activity._id} {...activity} />
                  ))
              ) : (
                <div className="text-center py-12 text-slate-500">
                  <MessageSquare size={48} className="mx-auto mb-4 text-slate-300" />
                  <p className="text-base">No activities yet</p>
                  <p className="text-sm mt-1">Your SMS activities will appear here</p>
                </div>
              )}
            </div>
          </Card>

          {/* System Status Panel - Narrower */}
          <div className="space-y-6">
            {/* System Status */}
            <Card className="app-card-padding bg-white/80 backdrop-blur-sm border border-slate-200/70 rounded-2xl shadow-sm">
              <div className="flex items-center gap-3 mb-5">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/60">
                  <Activity size={20} className="text-[#0F766E]" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 leading-tight">System Status</h3>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-4 rounded-xl bg-emerald-50/50 border border-emerald-200/30">
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 size={18} className="text-emerald-600" />
                    <span className="text-base font-medium text-slate-900 leading-relaxed">API Services</span>
                  </div>
                  <span className="text-sm font-semibold text-emerald-700">Operational</span>
                </div>
                <div className="flex items-center justify-between p-4 rounded-xl bg-emerald-50/50 border border-emerald-200/30">
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 size={18} className="text-emerald-600" />
                    <span className="text-base font-medium text-slate-900 leading-relaxed">SMS Gateway</span>
                  </div>
                  <span className="text-sm font-semibold text-emerald-700">Operational</span>
                </div>
                <div className="flex items-center justify-between p-4 rounded-xl bg-amber-50/50 border border-amber-200/30">
                  <div className="flex items-center gap-2.5">
                    <Clock size={18} className="text-amber-600" />
                    <span className="text-base font-medium text-slate-900 leading-relaxed">Webhooks</span>
                  </div>
                  <span className="text-sm font-semibold text-amber-700">Degraded</span>
                </div>
              </div>
            </Card>

            {/* Deliverability Alerts */}
            <Card className="app-card-padding bg-white/80 backdrop-blur-sm border border-slate-200/70 rounded-2xl shadow-sm">
              <div className="flex items-center gap-3 mb-5">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/60">
                  <AlertCircle size={20} className="text-[#0F766E]" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 leading-tight">Alerts</h3>
              </div>
              <div className="space-y-3">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/60">
                  <div className="flex items-start gap-3">
                    <AlertCircle size={18} className="text-amber-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-base font-medium text-slate-900 mb-1.5 leading-relaxed">
                        Delivery rate below threshold
                      </p>
                      <p className="text-sm text-slate-500 leading-relaxed">
                        Kenya region: 94.2% (target: 95%)
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            {/* Compliance Quick Links */}
            <Card className="app-card-padding bg-white/80 backdrop-blur-sm border border-slate-200/70 rounded-2xl shadow-sm">
              <div className="flex items-center gap-3 mb-5">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/60">
                  <Radio size={20} className="text-[#0F766E]" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 leading-tight">Compliance</h3>
              </div>
              <div className="space-y-2">
                <Link
                  href="/app/sender-ids"
                  className="flex items-center justify-between p-4 rounded-xl hover:bg-slate-50 transition-colors group"
                >
                  <span className="text-base text-slate-700 leading-relaxed">Sender ID Status</span>
                  <ChevronRight size={16} className="text-slate-400 group-hover:text-slate-600 group-hover:translate-x-0.5 transition-all" />
                </Link>
                <Link
                  href="/app/settings"
                  className="flex items-center justify-between p-4 rounded-xl hover:bg-slate-50 transition-colors group"
                >
                  <span className="text-base text-slate-700 leading-relaxed">KYC Verification</span>
                  <ChevronRight size={16} className="text-slate-400 group-hover:text-slate-600 group-hover:translate-x-0.5 transition-all" />
                </Link>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </PortalLayout>
  )
}

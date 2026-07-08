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
  CheckCircle2,
  Clock,
  ChevronRight,
  MoreVertical,
  Loader2,
} from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import Link from 'next/link'
import SenderIdAdBanner from '@/components/sender-id-ad/SenderIdAdBanner'
import { cn } from '@/lib/utils'
import {
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

const cardClass =
  'bg-white border border-[#E2E8F0] rounded-2xl shadow-sm w-full max-w-full min-w-0'

const primaryBtnClass =
  'h-12 rounded-[14px] bg-[#2F9B73] hover:bg-[#267D5E] text-white font-medium shadow-sm'

const segmentedActive =
  'bg-[#ECFDF5] text-[#047857] border border-[#2F9B73]'

const segmentedInactive =
  'bg-white text-[#64748B] border border-transparent hover:bg-[#F8FAFC]'

// Loading Skeleton for KPI Cards
function KPISkeleton() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-5">
      {[1, 2, 3, 4].map((idx) => (
        <Card key={idx} className={cn(cardClass, 'p-3.5 md:p-6')}>
          <div className="flex items-center justify-between mb-2 md:mb-4">
            <Skeleton className="h-3.5 w-20 rounded" />
            <Skeleton className="h-5 w-12 rounded-full hidden md:block" />
          </div>
          <Skeleton className="h-7 md:h-10 w-24 rounded" />
          <Skeleton className="h-3 w-16 rounded mt-2 hidden md:block" />
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

  const SparklineSVG = ({ data, positive }: { data: any[]; positive: boolean }) => {
    const width = 48
    const height = 20
    const padding = 2
    const chartWidth = width - padding * 2
    const chartHeight = height - padding * 2

    const max = Math.max(...data.map((d) => d.value))
    const min = Math.min(...data.map((d) => d.value))
    const range = max - min || 1

    const points = data
      .map((d, i) => {
        const x = padding + (i / (data.length - 1)) * chartWidth
        const y = padding + chartHeight - ((d.value - min) / range) * chartHeight
        return `${x},${y}`
      })
      .join(' ')

    return (
      <svg width={width} height={height} className="opacity-40">
        <polyline
          points={points}
          fill="none"
          stroke={positive ? '#2F9B73' : '#EF4444'}
          strokeWidth="1"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    )
  }

  const mobileLabel = (label: string) => {
    if (label === 'Account Balance') return 'Remaining Credits'
    if (label === 'SMS Sent (Today)') return 'SMS Sent Today'
    return label
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-5">
      {kpis.map((kpi, idx) => {
        const IconComponent = kpi.icon
        const isAccountBalance = kpi.label === 'Account Balance'

        return (
          <Card
            key={idx}
            className={cn(
              cardClass,
              'p-3.5 md:p-6 hover:shadow-md md:hover:-translate-y-0.5 transition-all duration-200'
            )}
          >
            <div className="flex items-start justify-between gap-1 mb-2 md:mb-4">
              <div className="flex items-center gap-1.5 min-w-0">
                <IconComponent size={14} className="text-[#64748B] shrink-0 md:w-4 md:h-4" />
                <p className="text-xs md:text-sm font-medium text-[#64748B] leading-tight break-words">
                  <span className="md:hidden">{mobileLabel(kpi.label)}</span>
                  <span className="hidden md:inline">{kpi.label}</span>
                </p>
              </div>
              {kpi.change && kpi.positive !== null && (
                <span
                  className={cn(
                    'hidden md:flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full shrink-0',
                    kpi.positive
                      ? 'bg-[#ECFDF5] text-[#047857] border border-[#2F9B73]/30'
                      : 'bg-red-50 text-[#EF4444] border border-red-200/50'
                  )}
                >
                  {kpi.positive ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                  {kpi.change}
                </span>
              )}
            </div>

            <div className="flex items-end justify-between mb-1 md:mb-3">
              {kpi.value === 'Loading...' ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="w-5 h-5 md:w-8 md:h-8 text-[#64748B] animate-spin" />
                  <Skeleton className="h-7 md:h-10 w-20 md:w-32 rounded" />
                </div>
              ) : (
                <>
                  <p className="text-xl md:text-3xl lg:text-4xl font-semibold text-[#0F172A] tracking-tight leading-tight break-words">
                    {isAccountBalance ? (
                      <>
                        <span className="md:hidden">{kpi.value.replace(' credits', '')}</span>
                        <span className="hidden md:inline">{kpi.value}</span>
                      </>
                    ) : (
                      kpi.value
                    )}
                  </p>
                  {kpi.sparklineData && (
                    <div className="ml-2 mb-1 hidden md:block">
                      <SparklineSVG data={kpi.sparklineData} positive={kpi.positive} />
                    </div>
                  )}
                </>
              )}
            </div>

            {kpi.change && kpi.positive !== null && (
              <span
                className={cn(
                  'md:hidden inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full mb-1',
                  kpi.positive
                    ? 'bg-[#ECFDF5] text-[#047857]'
                    : 'bg-red-50 text-[#EF4444]'
                )}
              >
                {kpi.positive ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                {kpi.change}
              </span>
            )}

            <div className="hidden md:flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-[#64748B]">{kpi.footerHint}</p>
              {isAccountBalance && (
                <Link
                  href="/app/billing"
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#2F9B73] hover:bg-[#267D5E] text-white text-sm font-medium shadow-sm transition-all"
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
  const statusColors: Record<string, string> = {
    completed: 'bg-[#ECFDF5] text-[#047857] border-[#2F9B73]/30',
    approved: 'bg-blue-50 text-blue-700 border-blue-200/50',
    failed: 'bg-red-50 text-[#EF4444] border-red-200/50',
    pending: 'bg-amber-50 text-[#F59E0B] border-amber-200/50',
  }

  const iconMap: Record<string, React.ElementType> = {
    MessageSquare,
    Radio,
    Wallet,
    Users,
  }

  const IconComponent =
    typeof icon === 'string' ? iconMap[icon] || MessageSquare : icon || MessageSquare

  return (
    <div className="flex items-start gap-3 p-3 md:p-5 rounded-xl hover:bg-[#F8FAFC] transition-all border border-[#E2E8F0] group min-w-0">
      <div className="w-9 h-9 md:w-12 md:h-12 rounded-xl bg-[#F8FAFC] flex items-center justify-center shrink-0 group-hover:bg-[#ECFDF5] transition-colors">
        <IconComponent size={16} className="text-[#2F9B73] md:w-5 md:h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm md:text-base font-medium text-[#0F172A] mb-0.5 leading-snug break-words">
          {title}
        </p>
        <p className="text-xs md:text-sm text-[#64748B] mb-1 leading-snug line-clamp-2 break-words">
          {subtitle}
        </p>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-[#64748B]">{time}</span>
          {category && (
            <>
              <span className="text-[#CBD5E1]">•</span>
              <span className="text-xs text-[#64748B]">{category}</span>
            </>
          )}
        </div>
      </div>
      <span
        className={cn(
          'text-[10px] md:text-sm font-semibold px-2 py-1 md:px-3 md:py-1.5 rounded-full border capitalize shrink-0',
          statusColors[status] || statusColors.completed
        )}
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
        { name: 'Delivered', value: dashboardData.deliveryBreakdown.delivered, color: '#2F9B73' },
        { name: 'Pending', value: dashboardData.deliveryBreakdown.pending, color: '#F59E0B' },
        { name: 'Failed', value: dashboardData.deliveryBreakdown.failed, color: '#EF4444' },
      ]
    : [
        { name: 'Delivered', value: 0, color: '#2F9B73' },
        { name: 'Pending', value: 0, color: '#F59E0B' },
        { name: 'Failed', value: 0, color: '#EF4444' },
      ]

  // Activity Data - using real data
  const activities = dashboardData?.activities || []

  const activityFilters = ['All', 'Campaigns', 'Billing', 'Sender IDs', 'API', 'Contacts']

  const filteredActivities = activities.filter(
    (activity: { category?: string }) =>
      activityFilter === 'All' || activity.category === activityFilter
  )

  const deliveryRateValue = dashboardData
    ? `${dashboardData.kpis.deliveryRate.value.toFixed(1)}%`
    : loadingStats
      ? '—'
      : '0%'

  const failedCount = dashboardData
    ? dashboardData.kpis.failedMessages.value.toLocaleString()
    : loadingStats
      ? '—'
      : '0'

  const creditsDisplay = loadingBalance ? '—' : balance.toLocaleString()

  const dateRanges = ['Today', '7D', '30D'] as const
  const chartPeriods = ['7D', '30D', '90D'] as const

  return (
    <PortalLayout activeSection="Dashboard">
      <div className="space-y-4 md:space-y-6 w-full max-w-full min-w-0">
        <SenderIdAdBanner currentPage="dashboard" />

        {/* Mobile compact header */}
        <div className="md:hidden min-w-0">
          <div className="flex items-center justify-between gap-2 mb-3">
            <h1 className="text-xl font-semibold text-[#0F172A]">Dashboard</h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#ECFDF5] text-[#047857] text-[11px] font-semibold border border-[#2F9B73]/30 shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-[#2F9B73] animate-pulse" />
              All systems operational
            </span>
          </div>
          <div className="grid grid-cols-3 gap-1.5 p-1 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0]">
            {dateRanges.map((range) => (
              <button
                key={range}
                type="button"
                onClick={() => setDateRange(range)}
                className={cn(
                  'px-2 py-2 rounded-lg text-xs font-medium transition-all',
                  dateRange === range ? segmentedActive : segmentedInactive
                )}
              >
                {range}
              </button>
            ))}
          </div>
        </div>

        {/* Desktop header */}
        <div className="hidden md:flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-5">
          <div className="min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-2">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-semibold text-[#0F172A]">Dashboard</h1>
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#ECFDF5] text-[#047857] text-sm font-semibold border border-[#2F9B73]/30 w-fit">
                <span className="w-2 h-2 rounded-full bg-[#2F9B73] animate-pulse" />
                All systems operational
              </span>
            </div>
            <p className="text-sm text-[#64748B]">Dashboard / Overview</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <div className="flex items-center gap-1 p-1.5 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0]">
              {dateRanges.map((range) => (
                <button
                  key={range}
                  type="button"
                  onClick={() => setDateRange(range)}
                  className={cn(
                    'px-4 py-2 rounded-lg text-sm font-medium transition-all',
                    dateRange === range ? segmentedActive : segmentedInactive
                  )}
                >
                  {range}
                </button>
              ))}
            </div>
            <div className="relative group hidden lg:block">
              <Button
                type="button"
                className="h-9 px-3 bg-white border border-[#E2E8F0] text-[#334155] hover:bg-[#F8FAFC] rounded-xl"
              >
                <MoreVertical size={16} />
              </Button>
              <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-xl shadow-lg border border-[#E2E8F0] p-1.5 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                <Link
                  href="/app/templates"
                  className="flex items-center gap-2.5 px-4 py-2.5 rounded-lg hover:bg-[#F8FAFC] text-sm text-[#334155]"
                >
                  <FileText size={18} />
                  Create Template
                </Link>
                <Link
                  href="/app/billing"
                  className="flex items-center gap-2.5 px-4 py-2.5 rounded-lg hover:bg-[#F8FAFC] text-sm text-[#334155]"
                >
                  <Wallet size={18} />
                  Buy Credits
                </Link>
              </div>
            </div>
            <Link href="/app/send-sms">
              <Button className={cn(primaryBtnClass, 'h-11 px-5')}>
                <Plus size={18} />
                New SMS
              </Button>
            </Link>
          </div>
        </div>

        {/* Mobile welcome summary */}
        <Card className={cn(cardClass, 'md:hidden p-4')}>
          <h2 className="text-base font-semibold text-[#0F172A] mb-0.5">Welcome back</h2>
          <p className="text-sm text-[#64748B] mb-3">Your SMS workspace is running normally.</p>
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] p-2.5 min-w-0">
              <p className="text-[10px] uppercase tracking-wide text-[#64748B] mb-0.5">Delivery</p>
              <p className="text-sm font-semibold text-[#047857] truncate">{deliveryRateValue}</p>
            </div>
            <div className="rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] p-2.5 min-w-0">
              <p className="text-[10px] uppercase tracking-wide text-[#64748B] mb-0.5">Credits</p>
              <p className="text-sm font-semibold text-[#0F172A] truncate">{creditsDisplay}</p>
            </div>
            <div className="rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] p-2.5 min-w-0">
              <p className="text-[10px] uppercase tracking-wide text-[#64748B] mb-0.5">Failed</p>
              <p className="text-sm font-semibold text-[#EF4444] truncate">{failedCount}</p>
            </div>
          </div>
        </Card>

        {/* Mobile main action */}
        <Link href="/app/send-sms" className="md:hidden block w-full">
          <Button className={cn(primaryBtnClass, 'w-full text-base')}>
            <Plus size={18} />
            New SMS
          </Button>
        </Link>

        {/* KPI stats grid */}
        <KPIPanel kpis={kpis} loading={loadingStats && !dashboardData} />

        {/* Mobile account balance / top up */}
        <Card className={cn(cardClass, 'md:hidden p-4')}>
          <div className="flex items-center justify-between gap-3 min-w-0">
            <div className="min-w-0">
              <p className="text-lg font-semibold text-[#0F172A]">
                {loadingBalance ? 'Loading...' : `${balance.toLocaleString()} credits`}
              </p>
              <p className="text-xs text-[#64748B]">Available credits</p>
            </div>
            <Link href="/app/billing" className="shrink-0">
              <Button className={cn(primaryBtnClass, 'h-10 px-4 text-sm')}>
                <Plus size={14} />
                Top up
              </Button>
            </Link>
          </div>
        </Card>

        {/* Charts */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 min-w-0">
          <Card className={cn(cardClass, 'md:col-span-2 p-4 md:p-6')}>
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between mb-3 md:mb-6 min-w-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="p-2 rounded-xl bg-[#ECFDF5] border border-[#E2E8F0] shrink-0">
                  <BarChart3 size={18} className="text-[#2F9B73]" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-base md:text-lg font-semibold text-[#0F172A]">SMS Volume</h3>
                  <p className="text-xs md:text-sm text-[#64748B]">Messages sent and delivered</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 min-w-0">
                <div className="grid grid-cols-3 gap-1 flex-1 md:flex-none p-0.5 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0]">
                  {chartPeriods.map((period) => (
                    <button
                      key={period}
                      type="button"
                      className={cn(
                        'px-2 md:px-3 py-1.5 rounded-lg text-xs md:text-sm font-medium transition-all',
                        dateRange === period ? segmentedActive : segmentedInactive
                      )}
                    >
                      {period}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  className="hidden sm:flex p-2 hover:bg-[#F8FAFC] rounded-lg transition-colors shrink-0"
                >
                  <Download size={18} className="text-[#64748B]" />
                </button>
              </div>
            </div>
            <div className="h-[220px] md:h-64 lg:h-72 min-w-0">
              {loadingStats && smsVolumeData.length === 0 ? (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center">
                    <Loader2 className="w-8 h-8 text-[#64748B] animate-spin mx-auto mb-2" />
                    <p className="text-sm text-[#64748B]">Loading chart data...</p>
                  </div>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={smsVolumeData}>
                    <defs>
                      <linearGradient id="colorSent" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2F9B73" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#2F9B73" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorDelivered" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#267D5E" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#267D5E" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                    <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} tick={{ fill: '#64748B' }} />
                    <YAxis stroke="#94a3b8" fontSize={11} tick={{ fill: '#64748B' }} width={32} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #E2E8F0',
                        borderRadius: '8px',
                        padding: '8px',
                        fontSize: '12px',
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="sent"
                      stroke="#2F9B73"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorSent)"
                      name="Sent"
                    />
                    <Area
                      type="monotone"
                      dataKey="delivered"
                      stroke="#267D5E"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorDelivered)"
                      name="Delivered"
                    />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </Card>

          <Card className={cn(cardClass, 'p-4 md:p-6')}>
            <div className="flex items-center gap-2.5 mb-3 md:mb-5">
              <div className="p-2 rounded-xl bg-[#ECFDF5] border border-[#E2E8F0] shrink-0">
                <Activity size={18} className="text-[#2F9B73]" />
              </div>
              <div className="min-w-0">
                <h3 className="text-base md:text-lg font-semibold text-[#0F172A]">Delivery Breakdown</h3>
                <p className="text-xs md:text-sm text-[#64748B] hidden md:block">Status distribution</p>
              </div>
            </div>
            <div className="h-[140px] md:h-56 lg:h-64 min-w-0">
              {loadingStats && deliveryBreakdown.every((item) => item.value === 0) ? (
                <div className="h-full flex items-center justify-center">
                  <Loader2 className="w-8 h-8 text-[#64748B] animate-spin" />
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={deliveryBreakdown}
                      cx="50%"
                      cy="50%"
                      innerRadius="45%"
                      outerRadius="70%"
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
                        border: '1px solid #E2E8F0',
                        borderRadius: '8px',
                        padding: '8px',
                        fontSize: '12px',
                      }}
                    />
                    <Legend
                      verticalAlign="bottom"
                      height={28}
                      iconType="circle"
                      wrapperStyle={{ fontSize: '11px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
            <div className="mt-3 md:mt-5 grid grid-cols-3 md:grid-cols-1 gap-2 md:gap-0 md:space-y-2.5 pt-3 md:pt-5 border-t border-[#E2E8F0]">
              {deliveryBreakdown.map((item, idx) => (
                <div
                  key={idx}
                  className="flex flex-col md:flex-row md:items-center md:justify-between rounded-xl md:rounded-none bg-[#F8FAFC] md:bg-transparent border border-[#E2E8F0] md:border-0 p-2.5 md:p-0 text-center md:text-left"
                >
                  <div className="flex items-center justify-center md:justify-start gap-1.5 md:gap-2.5">
                    <div
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-xs md:text-sm text-[#64748B]">{item.name}</span>
                  </div>
                  <span className="text-sm md:text-base font-semibold text-[#0F172A] mt-1 md:mt-0">
                    {item.value.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Activity + sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 min-w-0">
          <Card className={cn(cardClass, 'lg:col-span-2 p-4 md:p-6')}>
            <div className="flex flex-col gap-3 mb-4 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="p-2 rounded-xl bg-[#ECFDF5] border border-[#E2E8F0] shrink-0">
                    <Calendar size={18} className="text-[#2F9B73]" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-base md:text-lg font-semibold text-[#0F172A]">Recent Activity</h3>
                    <p className="text-xs md:text-sm text-[#64748B] hidden md:block">Latest platform events</p>
                  </div>
                </div>
                <Link
                  href="/app/reports"
                  className="flex items-center gap-1 text-sm font-medium text-[#2F9B73] hover:text-[#267D5E] shrink-0"
                >
                  View all
                  <ChevronRight size={14} />
                </Link>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 md:flex-wrap md:overflow-visible md:mx-0 md:px-0 md:p-1 md:bg-[#F8FAFC] md:rounded-lg md:border md:border-[#E2E8F0]">
                {activityFilters.map((filter) => (
                  <button
                    key={filter}
                    type="button"
                    onClick={() => setActivityFilter(filter)}
                    className={cn(
                      'shrink-0 px-3 py-1.5 rounded-full md:rounded-lg text-xs md:text-sm font-medium transition-all whitespace-nowrap',
                      activityFilter === filter ? segmentedActive : segmentedInactive
                    )}
                  >
                    {filter}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2.5 md:space-y-3">
              {loadingStats && activities.length === 0 ? (
                <div className="space-y-2.5">
                  {[1, 2, 3].map((idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-3 p-3 rounded-xl border border-[#E2E8F0]"
                    >
                      <Skeleton className="w-9 h-9 rounded-xl shrink-0" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-3/4 rounded" />
                        <Skeleton className="h-3 w-full rounded" />
                      </div>
                      <Skeleton className="h-5 w-16 rounded-full shrink-0" />
                    </div>
                  ))}
                </div>
              ) : filteredActivities.length > 0 ? (
                filteredActivities.map((activity: { id?: string; _id?: string }, index: number) => (
                  <div key={activity.id || activity._id} className={cn(index >= 3 && 'hidden md:block')}>
                    <ActivityItem {...activity} />
                  </div>
                ))
              ) : (
                <div className="text-center py-8 md:py-12 text-[#64748B]">
                  <MessageSquare size={36} className="mx-auto mb-3 text-[#CBD5E1]" />
                  <p className="text-sm md:text-base">No activities yet</p>
                  <p className="text-xs md:text-sm mt-1">Your SMS activities will appear here</p>
                </div>
              )}
            </div>
          </Card>

          <div className="space-y-4 md:space-y-6 min-w-0">
            <Card className={cn(cardClass, 'p-4 md:p-6')}>
              <div className="flex items-center gap-2.5 mb-3 md:mb-5">
                <div className="p-2 rounded-xl bg-[#ECFDF5] border border-[#E2E8F0] shrink-0">
                  <Activity size={18} className="text-[#2F9B73]" />
                </div>
                <h3 className="text-base md:text-lg font-semibold text-[#0F172A]">System Status</h3>
              </div>
              <div className="space-y-2 md:space-y-3">
                {[
                  { label: 'API Services', status: 'Operational', tone: 'operational' as const },
                  { label: 'SMS Gateway', status: 'Operational', tone: 'operational' as const },
                  { label: 'Webhooks', status: 'Degraded', tone: 'degraded' as const },
                ].map((item) => (
                  <div
                    key={item.label}
                    className={cn(
                      'flex items-center justify-between p-3 md:p-4 rounded-xl border min-w-0',
                      item.tone === 'operational'
                        ? 'bg-[#ECFDF5]/50 border-[#2F9B73]/20'
                        : 'bg-amber-50/50 border-amber-200/40'
                    )}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {item.tone === 'operational' ? (
                        <CheckCircle2 size={16} className="text-[#2F9B73] shrink-0" />
                      ) : (
                        <Clock size={16} className="text-[#F59E0B] shrink-0" />
                      )}
                      <span className="text-sm md:text-base font-medium text-[#0F172A] truncate">
                        {item.label}
                      </span>
                    </div>
                    <span
                      className={cn(
                        'text-xs md:text-sm font-semibold shrink-0 ml-2',
                        item.tone === 'operational' ? 'text-[#047857]' : 'text-[#F59E0B]'
                      )}
                    >
                      {item.status}
                    </span>
                  </div>
                ))}
              </div>
            </Card>

            <Card className={cn(cardClass, 'p-4 md:p-6')}>
              <div className="flex items-center justify-between gap-2 mb-3 md:mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-[#ECFDF5] border border-[#E2E8F0] shrink-0">
                    <AlertCircle size={18} className="text-[#2F9B73]" />
                  </div>
                  <h3 className="text-base md:text-lg font-semibold text-[#0F172A]">Alerts</h3>
                </div>
                <Link href="/app/reports" className="text-xs font-medium text-[#2F9B73] md:hidden">
                  View all
                </Link>
              </div>
              <div className="p-3 md:p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
                <div className="flex items-start gap-2.5">
                  <AlertCircle size={16} className="text-[#F59E0B] mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[#0F172A] mb-0.5 break-words">
                      Delivery rate below threshold
                    </p>
                    <p className="text-xs text-[#64748B]">Kenya region: 94.2% (target: 95%)</p>
                  </div>
                </div>
              </div>
            </Card>

            <Card className={cn(cardClass, 'p-4 md:p-6')}>
              <div className="flex items-center gap-2.5 mb-3 md:mb-4">
                <div className="p-2 rounded-xl bg-[#ECFDF5] border border-[#E2E8F0] shrink-0">
                  <Radio size={18} className="text-[#2F9B73]" />
                </div>
                <h3 className="text-base md:text-lg font-semibold text-[#0F172A]">Compliance</h3>
              </div>
              <div className="space-y-1">
                <Link
                  href="/app/sender-ids"
                  className="flex items-center justify-between p-3 rounded-xl hover:bg-[#F8FAFC] transition-colors group border border-transparent hover:border-[#E2E8F0]"
                >
                  <span className="text-sm text-[#334155]">Sender ID Status</span>
                  <ChevronRight size={16} className="text-[#64748B] group-hover:text-[#2F9B73]" />
                </Link>
                <Link
                  href="/app/settings"
                  className="flex items-center justify-between p-3 rounded-xl hover:bg-[#F8FAFC] transition-colors group border border-transparent hover:border-[#E2E8F0]"
                >
                  <span className="text-sm text-[#334155]">KYC Verification</span>
                  <ChevronRight size={16} className="text-[#64748B] group-hover:text-[#2F9B73]" />
                </Link>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </PortalLayout>
  )
}

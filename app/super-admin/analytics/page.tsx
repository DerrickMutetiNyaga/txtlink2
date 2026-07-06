'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  BarChart3,
  Download,
  RefreshCw,
  Filter,
  MessageSquare,
  CheckCircle2,
  XCircle,
  DollarSign,
  TrendingUp,
} from 'lucide-react'

export default function SuperAdminAnalytics() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    userId: '',
    senderId: '',
    status: '',
  })

  useEffect(() => {
    fetchAnalytics()
  }, [])

  const fetchAnalytics = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('token')
      const params = new URLSearchParams()
      if (filters.startDate) params.append('startDate', filters.startDate)
      if (filters.endDate) params.append('endDate', filters.endDate)
      if (filters.userId) params.append('userId', filters.userId)
      if (filters.senderId) params.append('senderId', filters.senderId)
      if (filters.status) params.append('status', filters.status)

      const response = await fetch(`/api/super-admin/analytics?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (response.ok) {
        const result = await response.json()
        setData(result.data)
      }
    } catch (error) {
      console.error('Error fetching analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  const clearFilters = () => {
    setFilters({
      startDate: '',
      endDate: '',
      userId: '',
      senderId: '',
      status: '',
    })
  }

  const exportCSV = () => {
    // TODO: Implement CSV export functionality
    console.log('Export CSV')
  }

  // Calculate failure percentages
  const getFailurePercentage = (count: number) => {
    if (!data || !data.volume.failed) return 0
    return ((count / data.volume.failed) * 100).toFixed(1)
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold text-[#020617]">Analytics & Reports</h1>
            <p className="text-[#64748B] mt-1">Detailed SMS analytics and insights</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={fetchAnalytics}
              className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl shadow-sm text-slate-700 hover:bg-slate-100 hover:text-slate-900 active:scale-95 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 transition-all duration-200"
            >
              <RefreshCw className="w-4 h-4 text-slate-500" />
              Refresh
            </button>
            <button
              onClick={exportCSV}
              className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl shadow-sm text-slate-700 hover:bg-slate-100 hover:text-slate-900 active:scale-95 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 transition-all duration-200"
            >
              <Download className="w-4 h-4 text-slate-500" />
              Export CSV
            </button>
          </div>
        </div>

        {/* Filters */}
        <Card className="bg-white border-[#E5E7EB] border-l-4 border-l-[#FACC15] shadow-sm">
          <div className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Filter className="w-5 h-5 text-[#64748B]" />
              <h2 className="text-lg font-semibold text-[#020617]">Filters</h2>
            </div>
            <Separator className="mb-6 bg-[#E5E7EB]" />
            <div className="grid md:grid-cols-5 gap-4">
              <div>
                <label className="text-sm font-medium text-[#020617] mb-1 block">Start Date</label>
                <Input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                  className="bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-yellow-300 focus:border-yellow-400"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-[#020617] mb-1 block">End Date</label>
                <Input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                  className="bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-yellow-300 focus:border-yellow-400"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-[#020617] mb-1 block">User</label>
                <Input
                  value={filters.userId}
                  onChange={(e) => setFilters({ ...filters, userId: e.target.value })}
                  placeholder="Optional"
                  className="bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-yellow-300 focus:border-yellow-400"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-[#020617] mb-1 block">Sender ID</label>
                <Input
                  value={filters.senderId}
                  onChange={(e) => setFilters({ ...filters, senderId: e.target.value })}
                  placeholder="Optional"
                  className="bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-yellow-300 focus:border-yellow-400"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-[#020617] mb-1 block">Status</label>
                <Select
                  value={filters.status || 'all'}
                  onValueChange={(value) => setFilters({ ...filters, status: value === 'all' ? '' : value })}
                >
                  <SelectTrigger className="bg-white border-slate-200 text-slate-900 focus:ring-2 focus:ring-yellow-300 focus:border-yellow-400">
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="sent">Sent</SelectItem>
                    <SelectItem value="delivered">Delivered</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <Button
                onClick={fetchAnalytics}
                className="bg-yellow-400 hover:bg-yellow-500 text-slate-900 font-medium"
              >
                Apply Filters
              </Button>
              <Button
                onClick={clearFilters}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium"
              >
                Clear Filters
              </Button>
            </div>
          </div>
        </Card>

        {loading ? (
          <Card className="bg-white border-[#E5E7EB] shadow-sm">
            <div className="p-12 text-center">
              <RefreshCw className="w-8 h-8 animate-spin text-[#64748B] mx-auto mb-4" />
              <p className="text-[#64748B]">Loading analytics...</p>
            </div>
          </Card>
        ) : data ? (
          <>
            {/* KPI Metrics - Volume */}
            <div className="grid md:grid-cols-4 gap-6">
              <Card className="bg-white border-[#E5E7EB] shadow-sm rounded-lg p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-lg bg-[#F1F5F9]">
                    <MessageSquare className="w-6 h-6 text-[#64748B]" />
                  </div>
                  <div>
                    <p className="text-sm text-[#64748B] mb-1">Total SMS</p>
                    <p className="text-2xl font-semibold text-[#020617]">
                      {data.volume.total.toLocaleString()}
                    </p>
                  </div>
                </div>
              </Card>
              <Card className="bg-white border-[#E5E7EB] shadow-sm rounded-lg p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-lg bg-[#16A34A]/10">
                    <CheckCircle2 className="w-6 h-6 text-[#16A34A]" />
                  </div>
                  <div>
                    <p className="text-sm text-[#64748B] mb-1">Delivered</p>
                    <p className="text-2xl font-semibold text-[#16A34A]">
                      {data.volume.delivered.toLocaleString()}
                    </p>
                  </div>
                </div>
              </Card>
              <Card className="bg-white border-[#E5E7EB] shadow-sm rounded-lg p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-lg bg-[#DC2626]/10">
                    <XCircle className="w-6 h-6 text-[#DC2626]" />
                  </div>
                  <div>
                    <p className="text-sm text-[#64748B] mb-1">Failed</p>
                    <p className="text-2xl font-semibold text-[#DC2626]">
                      {data.volume.failed.toLocaleString()}
                    </p>
                  </div>
                </div>
              </Card>
              <Card className="bg-white border-[#E5E7EB] shadow-sm rounded-lg p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-lg bg-[#FACC15]/10">
                    <DollarSign className="w-6 h-6 text-[#FACC15]" />
                  </div>
                  <div>
                    <p className="text-sm text-[#64748B] mb-1">Total Charged</p>
                    <p className="text-2xl font-semibold text-[#FACC15]">
                      KSh {data.revenue.totalCharged.toLocaleString()}
                    </p>
                  </div>
                </div>
              </Card>
            </div>

            {/* KPI Metrics - Profit */}
            <div className="grid md:grid-cols-4 gap-6 mt-6">
              <Card className="bg-white border-[#E5E7EB] shadow-sm rounded-lg p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-lg bg-[#F1F5F9]">
                    <DollarSign className="w-6 h-6 text-[#64748B]" />
                  </div>
                  <div>
                    <p className="text-sm text-[#64748B] mb-1">Provider Cost</p>
                    <p className="text-2xl font-semibold text-[#64748B]">
                      KSh {((data.revenue.totalProviderCost || 0).toLocaleString())}
                    </p>
                  </div>
                </div>
              </Card>
              <Card className="bg-white border-[#E5E7EB] shadow-sm rounded-lg p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-lg bg-[#16A34A]/10">
                    <TrendingUp className="w-6 h-6 text-[#16A34A]" />
                  </div>
                  <div>
                    <p className="text-sm text-[#64748B] mb-1">Profit</p>
                    <p className="text-2xl font-semibold text-[#16A34A]">
                      KSh {((data.revenue.totalProfit || 0).toLocaleString())}
                    </p>
                  </div>
                </div>
              </Card>
              <Card className="bg-white border-[#E5E7EB] shadow-sm rounded-lg p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-lg bg-[#F1F5F9]">
                    <BarChart3 className="w-6 h-6 text-[#64748B]" />
                  </div>
                  <div>
                    <p className="text-sm text-[#64748B] mb-1">Avg. Price / Part</p>
                    <p className="text-2xl font-semibold text-[#020617]">
                      KSh {((data.revenue.avgPricePerPart || 0).toFixed(2))}
                    </p>
                  </div>
                </div>
              </Card>
              <Card className="bg-white border-[#E5E7EB] shadow-sm rounded-lg p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-lg bg-[#F1F5F9]">
                    <MessageSquare className="w-6 h-6 text-[#64748B]" />
                  </div>
                  <div>
                    <p className="text-sm text-[#64748B] mb-1">Total Parts</p>
                    <p className="text-2xl font-semibold text-[#020617]">
                      {((data.revenue.totalParts || 0).toLocaleString())}
                    </p>
                  </div>
                </div>
              </Card>
            </div>

            {/* Revenue Info Text */}
            <p className="text-sm text-[#64748B] mt-2">
              Profit = Total Charged - Provider Cost. Provider cost is based on provider per-part charges. Revenue is calculated based on SMS parts sent, including overrides where applicable.
            </p>

            {/* Top Customers by Spend */}
            <Card className="bg-white border-[#E5E7EB] shadow-sm rounded-lg">
              <div className="p-6">
                <h2 className="text-lg font-semibold text-[#020617] mb-6">Top Customers by Spend</h2>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-[#E5E7EB]">
                        <th className="text-left py-3 px-4 text-sm font-semibold text-[#020617]">
                          Customer
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-[#020617]">Email</th>
                        <th className="text-right py-3 px-4 text-sm font-semibold text-[#020617]">
                          SMS Count
                        </th>
                        <th className="text-right py-3 px-4 text-sm font-semibold text-[#020617]">
                          Parts Used
                        </th>
                        <th className="text-right py-3 px-4 text-sm font-semibold text-[#020617]">
                          Total Charged (KES)
                        </th>
                        <th className="text-right py-3 px-4 text-sm font-semibold text-[#020617]">
                          Provider Cost (KES)
                        </th>
                        <th className="text-right py-3 px-4 text-sm font-semibold text-[#020617]">
                          Profit (KES)
                        </th>
                        <th className="text-right py-3 px-4 text-sm font-semibold text-[#020617]">
                          Avg Price/Part
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.topCustomers && data.topCustomers.length > 0 ? (
                        data.topCustomers.map((customer: any, idx: number) => (
                          <tr
                            key={idx}
                            className="border-b border-[#E5E7EB] hover:bg-[#F8FAFC] transition-colors"
                          >
                            <td className="py-3 px-4">
                              <div className="font-medium text-[#020617]">{customer.userName}</div>
                            </td>
                            <td className="py-3 px-4">
                              <div className="text-sm text-[#64748B]">{customer.userEmail}</div>
                            </td>
                            <td className="text-right py-3 px-4 text-[#020617]">
                              {customer.smsCount.toLocaleString()}
                            </td>
                            <td className="text-right py-3 px-4 text-[#020617]">
                              {(customer.totalParts || 0).toLocaleString()}
                            </td>
                            <td className="text-right py-3 px-4">
                              <span className="font-semibold text-[#020617]">
                                KSh {customer.totalCharged.toLocaleString()}
                              </span>
                            </td>
                            <td className="text-right py-3 px-4 text-[#64748B]">
                              KSh {((customer.totalProviderCost || 0).toLocaleString())}
                            </td>
                            <td className="text-right py-3 px-4">
                              <span className="font-semibold text-[#16A34A]">
                                KSh {((customer.totalProfit || 0).toLocaleString())}
                              </span>
                            </td>
                            <td className="text-right py-3 px-4 text-[#020617]">
                              KSh {((customer.avgPricePerPart || 0).toFixed(2))}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={8} className="py-8 text-center text-[#64748B]">
                            No customer data available for selected period
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </Card>

            {/* All Customers Summary */}
            <Card className="bg-white border-[#E5E7EB] shadow-sm rounded-lg">
              <div className="p-6">
                <h2 className="text-lg font-semibold text-[#020617] mb-6">All Customers Summary</h2>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-[#E5E7EB]">
                        <th className="text-left py-3 px-4 text-sm font-semibold text-[#020617]">
                          Customer
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-[#020617]">Email</th>
                        <th className="text-right py-3 px-4 text-sm font-semibold text-[#020617]">
                          SMS Count
                        </th>
                        <th className="text-right py-3 px-4 text-sm font-semibold text-[#020617]">
                          Parts Used
                        </th>
                        <th className="text-right py-3 px-4 text-sm font-semibold text-[#020617]">
                          Total Charged (KES)
                        </th>
                        <th className="text-right py-3 px-4 text-sm font-semibold text-[#020617]">
                          Provider Cost (KES)
                        </th>
                        <th className="text-right py-3 px-4 text-sm font-semibold text-[#020617]">
                          Profit (KES)
                        </th>
                        <th className="text-right py-3 px-4 text-sm font-semibold text-[#020617]">
                          Avg Price/Part
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.allCustomers && data.allCustomers.length > 0 ? (
                        data.allCustomers.map((customer: any, idx: number) => (
                          <tr
                            key={idx}
                            className="border-b border-[#E5E7EB] hover:bg-[#F8FAFC] transition-colors"
                          >
                            <td className="py-3 px-4">
                              <div className="font-medium text-[#020617]">{customer.userName}</div>
                            </td>
                            <td className="py-3 px-4">
                              <div className="text-sm text-[#64748B]">{customer.userEmail}</div>
                            </td>
                            <td className="text-right py-3 px-4 text-[#020617]">
                              {customer.smsCount.toLocaleString()}
                            </td>
                            <td className="text-right py-3 px-4 text-[#020617]">
                              {(customer.totalParts || 0).toLocaleString()}
                            </td>
                            <td className="text-right py-3 px-4">
                              <span className="font-semibold text-[#020617]">
                                KSh {customer.totalCharged.toLocaleString()}
                              </span>
                            </td>
                            <td className="text-right py-3 px-4 text-[#64748B]">
                              KSh {((customer.totalProviderCost || 0).toLocaleString())}
                            </td>
                            <td className="text-right py-3 px-4">
                              <span className="font-semibold text-[#16A34A]">
                                KSh {((customer.totalProfit || 0).toLocaleString())}
                              </span>
                            </td>
                            <td className="text-right py-3 px-4 text-[#020617]">
                              KSh {((customer.avgPricePerPart || 0).toFixed(2))}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={8} className="py-8 text-center text-[#64748B]">
                            No customer data available for selected period
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </Card>

            {/* Top Failure Reasons */}
            <Card className="bg-white border-[#E5E7EB] shadow-sm rounded-lg">
              <div className="p-6">
                <h2 className="text-lg font-semibold text-[#020617] mb-6">Top Failure Reasons</h2>
                {data.failureReasons && data.failureReasons.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-[#E5E7EB]">
                          <th className="text-left py-3 px-4 text-sm font-semibold text-[#020617]">
                            Reason
                          </th>
                          <th className="text-right py-3 px-4 text-sm font-semibold text-[#020617]">
                            Count
                          </th>
                          <th className="text-right py-3 px-4 text-sm font-semibold text-[#020617]">
                            % of failures
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.failureReasons.map((reason: any, idx: number) => (
                          <tr
                            key={idx}
                            className="border-b border-[#E5E7EB] hover:bg-[#F8FAFC] transition-colors"
                          >
                            <td className="py-3 px-4">
                              <span className="text-sm font-medium text-[#020617]">
                                {reason._id || 'Unknown'}
                              </span>
                            </td>
                            <td className="text-right py-3 px-4 text-[#020617]">{reason.count}</td>
                            <td className="text-right py-3 px-4 text-[#64748B]">
                              {getFailurePercentage(reason.count)}%
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="py-8 text-center text-[#64748B]">
                    No failures recorded for selected period
                  </div>
                )}
              </div>
            </Card>
          </>
        ) : null}
      </div>
    </div>
  )
}


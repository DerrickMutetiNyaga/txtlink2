'use client'

import { AdminLayout } from '@/components/admin-layout'
import { Card } from '@/components/ui/card'
import { BarChart3, Users, Radio, TrendingUp } from 'lucide-react'

export default function AdminDashboardPage() {
  const kpis = [
    { icon: Users, label: 'Active Clients', value: '247', change: '+12 this month' },
    { icon: Radio, label: 'Pending Sender IDs', value: '18', change: 'Requires review' },
    { icon: TrendingUp, label: 'Daily SMS Volume', value: '42.5M', change: '+8.2% vs yesterday' },
    { icon: BarChart3, label: 'Revenue (MTD)', value: '$125,430', change: '+15% vs last month' },
  ]

  const recentApprovals = [
    { client: 'Tech Solutions Ltd', senderID: 'TECHSOL', date: '2 hours ago', status: 'approved' },
    { client: 'Finance Bank', senderID: 'FBANK', date: '5 hours ago', status: 'approved' },
    { client: 'E-Health Clinics', senderID: 'CLINIC', date: '1 day ago', status: 'pending' },
  ]

  return (
    <AdminLayout activeSection="Dashboard">
      <div className="space-y-8">
        {/* KPI Cards */}
        <div className="grid md:grid-cols-4 gap-6">
          {kpis.map((kpi, idx) => (
            <Card key={idx} className="p-6 border-border">
              <div className="flex items-start justify-between mb-4">
                <kpi.icon size={24} className="text-primary" />
              </div>
              <p className="text-sm text-muted-foreground mb-1">{kpi.label}</p>
              <p className="text-2xl font-bold text-primary">{kpi.value}</p>
              <p className="text-xs text-muted-foreground mt-2">{kpi.change}</p>
            </Card>
          ))}
        </div>

        {/* Recent Activity */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card className="p-6 border-border">
            <h3 className="font-semibold text-foreground mb-6">Recent Approvals</h3>
            <div className="space-y-4">
              {recentApprovals.map((approval, idx) => (
                <div key={idx} className="flex items-center justify-between p-4 bg-muted rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium text-foreground">{approval.client}</p>
                    <p className="text-sm text-muted-foreground">{approval.senderID}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">{approval.date}</p>
                    <span className="inline-block mt-1 px-2 py-1 text-xs font-semibold rounded bg-green-50 text-green-700">
                      {approval.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-6 border-border">
            <h3 className="font-semibold text-foreground mb-6">System Status</h3>
            <div className="space-y-4">
              {[
                { service: 'SMS Gateway', status: 'Operational', uptime: '99.99%' },
                { service: 'API Servers', status: 'Operational', uptime: '99.98%' },
                { service: 'Database', status: 'Operational', uptime: '99.99%' },
              ].map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-4 bg-muted rounded-lg">
                  <div>
                    <p className="font-medium text-foreground">{item.service}</p>
                    <p className="text-sm text-muted-foreground">Uptime: {item.uptime}</p>
                  </div>
                  <span className="inline-block px-3 py-1 text-xs font-semibold rounded bg-green-50 text-green-700">
                    {item.status}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </AdminLayout>
  )
}

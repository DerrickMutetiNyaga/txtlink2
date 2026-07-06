'use client'

import { PortalLayout } from '@/components/portal-layout'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Radio, Plus, CheckCircle, Clock, XCircle } from 'lucide-react'
import { useState, useEffect } from 'react'
import Link from 'next/link'

interface SenderID {
  id: string
  senderName: string
  status: 'approved' | 'pending' | 'rejected' | 'active'
  isDefault: boolean
  createdAt: string | Date
  usage: number
}

export default function SenderIDsPage() {
  const [senderIDs, setSenderIDs] = useState<SenderID[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    approved: 0,
    pending: 0,
    rejected: 0,
  })

  useEffect(() => {
    const fetchSenderIDs = async () => {
      try {
        setLoading(true)
        const token = localStorage.getItem('token')
        const response = await fetch('/api/senderids', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (response.ok) {
          const data = await response.json()
          setSenderIDs(data.senderIds || [])
          
          // Calculate statistics
          const approved = data.senderIds?.filter((sid: SenderID) => sid.status === 'approved' || sid.status === 'active').length || 0
          const pending = data.senderIds?.filter((sid: SenderID) => sid.status === 'pending').length || 0
          const rejected = data.senderIds?.filter((sid: SenderID) => sid.status === 'rejected').length || 0
          
          setStats({ approved, pending, rejected })
        }
      } catch (error) {
        console.error('Failed to fetch sender IDs:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchSenderIDs()
  }, [])

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
      case 'active':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200'
      case 'pending':
        return 'bg-blue-50 text-blue-700 border-blue-200'
      case 'rejected':
        return 'bg-red-50 text-red-700 border-red-200'
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200'
    }
  }

  const formatDate = (date: string | Date) => {
    if (!date) return 'N/A'
    const d = new Date(date)
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
  }

  return (
    <PortalLayout activeSection="Sender IDs">
      <div className="space-y-6">
        {/* Header */}
<<<<<<< HEAD
        <div className="app-page-header">
          <div>
            <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900 mb-2">Sender IDs</h1>
            <p className="text-gray-600">Manage your approved and pending sender IDs</p>
          </div>
          <Link href="/app/sender-ids/request" className="w-full sm:w-auto">
            <Button className="w-full sm:w-auto bg-teal-600 text-white hover:bg-teal-700">
=======
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-gray-900 mb-2">Sender IDs</h1>
            <p className="text-gray-600">Manage your approved and pending sender IDs</p>
          </div>
          <Link href="/app/sender-ids/request">
            <Button className="bg-teal-600 text-white hover:bg-teal-700">
>>>>>>> 4a3d95970903f9fc28665c46227114641494cea8
              <Plus size={18} className="mr-2" /> Apply for New Sender ID
            </Button>
          </Link>
        </div>

        {/* Stats */}
<<<<<<< HEAD
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
=======
        <div className="grid md:grid-cols-3 gap-6">
>>>>>>> 4a3d95970903f9fc28665c46227114641494cea8
          <Card className="p-5 bg-white border border-gray-100 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-emerald-100 text-emerald-600">
                <CheckCircle size={20} />
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">Approved</p>
                <p className="text-3xl font-bold text-gray-900">{stats.approved}</p>
              </div>
            </div>
          </Card>
          <Card className="p-5 bg-white border border-gray-100 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-blue-100 text-blue-600">
                <Clock size={20} />
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">Pending</p>
                <p className="text-3xl font-bold text-gray-900">{stats.pending}</p>
              </div>
            </div>
          </Card>
          <Card className="p-5 bg-white border border-gray-100 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-red-100 text-red-600">
                <XCircle size={20} />
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">Rejected</p>
                <p className="text-3xl font-bold text-gray-900">{stats.rejected}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Sender IDs List */}
        {loading ? (
          <div className="text-center py-12 text-gray-500">
            <Clock className="w-8 h-8 animate-spin mx-auto mb-2" />
            <p>Loading sender IDs...</p>
          </div>
        ) : senderIDs.length === 0 ? (
          <Card className="p-12 bg-white border border-gray-100 shadow-sm text-center">
            <Radio className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Sender IDs</h3>
            <p className="text-gray-600 mb-6">You don't have any sender IDs assigned yet.</p>
            <Link href="/app/sender-ids/request">
              <Button className="bg-teal-600 text-white hover:bg-teal-700">
                <Plus size={18} className="mr-2" /> Apply for New Sender ID
              </Button>
            </Link>
          </Card>
        ) : (
<<<<<<< HEAD
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            {senderIDs.map((senderID) => (
              <Card key={senderID.id} className="p-4 sm:p-6 bg-white border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between mb-4">
=======
          <div className="grid md:grid-cols-2 gap-6">
            {senderIDs.map((senderID) => (
              <Card key={senderID.id} className="p-6 bg-white border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-4">
>>>>>>> 4a3d95970903f9fc28665c46227114641494cea8
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-xl bg-teal-100 text-teal-600">
                      <Radio size={20} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-lg text-gray-900">{senderID.senderName}</h3>
                        {senderID.isDefault && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-teal-100 text-teal-700 font-medium">
                            Default
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500">
                        {senderID.status === 'approved' || senderID.status === 'active'
                          ? 'Ready to use for sending SMS'
                          : senderID.status === 'pending'
                          ? 'Awaiting approval'
                          : 'Not available for use'}
                      </p>
                    </div>
                  </div>
                  {/* Status badge top-right */}
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${getStatusBadge(senderID.status)}`}>
                    {senderID.status === 'active' ? 'Approved' : senderID.status.charAt(0).toUpperCase() + senderID.status.slice(1)}
                  </span>
                </div>
                <div className="space-y-2.5 mb-5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Messages Sent:</span>
                    <span className="font-semibold text-gray-900">{senderID.usage.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Created:</span>
                    <span className="font-medium text-gray-700">{formatDate(senderID.createdAt)}</span>
                  </div>
                </div>
                {/* Button hierarchy: Primary (solid) vs Secondary (outline) */}
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                  >
                    View Details
                  </Button>
                  {(senderID.status === 'approved' || senderID.status === 'active') && (
                    <Button className="flex-1 bg-teal-600 text-white hover:bg-teal-700">
                      Use This ID
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </PortalLayout>
  )
}

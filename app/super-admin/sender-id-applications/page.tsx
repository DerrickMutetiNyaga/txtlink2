'use client'

import { useEffect, useMemo, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import {
  FileText,
  Download,
  RefreshCw,
  ChevronRight,
  CheckCircle2,
  XCircle,
} from 'lucide-react'

interface Application {
  id: string
  desiredSenderId: string
  contactPerson: string
  phoneNumber: string
  email: string
  smsUseCase: string
  sampleSmsMessage: string
  industry: string
  status: string
  hasCertificate: boolean
  businessCertificateFileName: string
  businessCertificateMimeType: string
  businessCertificateSize: number
  rejectionReason?: string
  createdAt: string
  user: { id: string; name: string; email: string; phone?: string } | null
  invoice: { id: string; status: string; amount: number; currency: string; paidAt?: string } | null
}

const STATUS_FILTERS = [
  { id: 'review', label: 'Needs review', statuses: ['under_review', 'submitted'] },
  { id: 'payment', label: 'Awaiting payment', statuses: ['payment_pending'] },
  { id: 'approved', label: 'Approved', statuses: ['approved'] },
  { id: 'rejected', label: 'Rejected', statuses: ['rejected'] },
  { id: 'all', label: 'All', statuses: [] },
]

function statusBadge(status: string) {
  const map: Record<string, string> = {
    payment_pending: 'bg-amber-50 text-amber-800 border-amber-200',
    submitted: 'bg-sky-50 text-sky-800 border-sky-200',
    under_review: 'bg-indigo-50 text-indigo-800 border-indigo-200',
    approved: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    rejected: 'bg-rose-50 text-rose-800 border-rose-200',
  }
  return map[status] || 'bg-slate-50 text-slate-700 border-slate-200'
}

function statusLabel(status: string) {
  return status.replace(/_/g, ' ')
}

function formatBytes(size?: number) {
  if (!size) return ''
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}

function formatWhen(iso?: string) {
  if (!iso) return '—'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString()
}

export default function SenderIdApplicationsPage() {
  const [applications, setApplications] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('review')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ type: 'ok' | 'error'; text: string } | null>(null)

  const token = () => localStorage.getItem('token')

  const load = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/super-admin/sender-id-requests', {
        headers: { Authorization: `Bearer ${token()}` },
      })
      if (response.status === 401 || response.status === 403) {
        window.location.href = '/auth/login'
        return
      }
      if (!response.ok) throw new Error('Failed to load applications')
      const result = await response.json()
      setApplications(result.applications || [])
    } catch (error) {
      console.error(error)
      setMessage({ type: 'error', text: 'Could not load Sender ID applications.' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const visible = useMemo(() => {
    const group = STATUS_FILTERS.find((f) => f.id === filter)
    if (!group || group.id === 'all') return applications
    return applications.filter((app) => group.statuses.includes(app.status))
  }, [applications, filter])

  const selected = visible.find((app) => app.id === selectedId) || applications.find((app) => app.id === selectedId) || null

  const review = async (action: 'approve' | 'reject') => {
    if (!selected) return
    if (action === 'reject' && !rejectReason.trim()) {
      setMessage({ type: 'error', text: 'Enter a rejection reason first.' })
      return
    }
    try {
      setBusy(true)
      setMessage(null)
      const response = await fetch(`/api/super-admin/sender-id-requests/${selected.id}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action, reason: rejectReason }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Failed to update application')
      setRejectReason('')
      setMessage({
        type: 'ok',
        text: action === 'approve' ? 'Application approved and sender ID assigned.' : 'Application rejected.',
      })
      await load()
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to update application.' })
    } finally {
      setBusy(false)
    }
  }

  const downloadCertificate = async (app: Application) => {
    try {
      const response = await fetch(`/api/super-admin/sender-id-requests/${app.id}/certificate`, {
        headers: { Authorization: `Bearer ${token()}` },
      })
      if (!response.ok) {
        const result = await response.json().catch(() => ({}))
        throw new Error(result.error || 'Download failed')
      }
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = app.businessCertificateFileName || `${app.desiredSenderId}-certificate`
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Could not download the certificate.' })
    }
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-slate-900">Sender ID Applications</h1>
            <p className="text-slate-600 mt-1">
              Open submitted forms, download the uploaded certificate, then approve or reject.
            </p>
          </div>
          <button
            onClick={load}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl shadow-sm text-slate-700 hover:bg-slate-100 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          {STATUS_FILTERS.map((item) => (
            <button
              key={item.id}
              onClick={() => setFilter(item.id)}
              className={`px-3 py-1.5 rounded-full text-sm border ${
                filter === item.id
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {message && (
          <p className={`text-sm ${message.type === 'ok' ? 'text-emerald-700' : 'text-rose-600'}`}>{message.text}</p>
        )}

        <div className="grid lg:grid-cols-3 gap-6">
          <Card className="p-4 border border-slate-200/70 rounded-2xl bg-white shadow-sm lg:col-span-1">
            <h2 className="text-sm font-semibold text-slate-900 mb-3">
              Applications ({visible.length})
            </h2>
            {loading ? (
              <p className="text-sm text-slate-500">Loading...</p>
            ) : visible.length === 0 ? (
              <p className="text-sm text-slate-500">No applications in this list yet.</p>
            ) : (
              <div className="space-y-2">
                {visible.map((app) => (
                  <button
                    key={app.id}
                    onClick={() => setSelectedId(app.id)}
                    className={`w-full text-left rounded-xl border p-3 transition-colors ${
                      selectedId === app.id
                        ? 'border-emerald-300 bg-emerald-50'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-slate-900">{app.desiredSenderId || 'Untitled'}</p>
                        <p className="text-xs text-slate-500">{app.user?.name || app.contactPerson || app.email}</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-400 mt-0.5" />
                    </div>
                    <div className="mt-2">
                      <Badge className={statusBadge(app.status)}>{statusLabel(app.status)}</Badge>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </Card>

          <Card className="p-6 border border-slate-200/70 rounded-2xl bg-white shadow-sm lg:col-span-2">
            {!selected ? (
              <div className="h-80 flex items-center justify-center text-slate-500">
                Select an application to view the form and download the file.
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900">{selected.desiredSenderId}</h2>
                    <p className="text-slate-500">
                      {selected.user?.name || selected.contactPerson} · {selected.user?.email || selected.email}
                    </p>
                  </div>
                  <Badge className={statusBadge(selected.status)}>{statusLabel(selected.status)}</Badge>
                </div>

                <div className="grid sm:grid-cols-2 gap-4 text-sm">
                  <Detail label="Contact person" value={selected.contactPerson} />
                  <Detail label="Phone" value={selected.phoneNumber} />
                  <Detail label="Email" value={selected.email} />
                  <Detail label="Industry" value={selected.industry} />
                  <Detail label="Use case" value={selected.smsUseCase} />
                  <Detail label="Submitted" value={formatWhen(selected.createdAt)} />
                  <Detail
                    label="Payment"
                    value={
                      selected.invoice
                        ? `${selected.invoice.status} · ${selected.invoice.currency} ${selected.invoice.amount}`
                        : 'No invoice'
                    }
                  />
                  <Detail label="Account" value={selected.user?.name || '—'} />
                </div>

                <div>
                  <p className="text-sm font-medium text-slate-500 mb-2">Sample SMS</p>
                  <p className="rounded-xl bg-slate-50 border border-slate-200 p-4 text-sm text-slate-800 whitespace-pre-wrap">
                    {selected.sampleSmsMessage || '—'}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-slate-100 text-slate-700">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">
                        {selected.businessCertificateFileName || 'Business certificate'}
                      </p>
                      <p className="text-xs text-slate-500">
                        {selected.hasCertificate
                          ? `${selected.businessCertificateMimeType || 'file'} ${formatBytes(selected.businessCertificateSize)}`
                          : 'No file uploaded'}
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={() => downloadCertificate(selected)}
                    disabled={!selected.hasCertificate}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </Button>
                </div>

                {selected.rejectionReason && (
                  <p className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-xl p-3">
                    Rejection reason: {selected.rejectionReason}
                  </p>
                )}

                {(selected.status === 'under_review' || selected.status === 'submitted') && (
                  <div className="space-y-3">
                    <Textarea
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      placeholder="Reason if you reject this application"
                      rows={3}
                    />
                    <div className="flex gap-3">
                      <Button
                        variant="outline"
                        disabled={busy}
                        onClick={() => review('reject')}
                        className="flex-1 border-rose-200 text-rose-700 hover:bg-rose-50"
                      >
                        <XCircle className="w-4 h-4 mr-2" />
                        Reject
                      </Button>
                      <Button
                        disabled={busy}
                        onClick={() => review('approve')}
                        className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                      >
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        Approve
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-slate-500 mb-1">{label}</p>
      <p className="font-medium text-slate-900">{value || '—'}</p>
    </div>
  )
}

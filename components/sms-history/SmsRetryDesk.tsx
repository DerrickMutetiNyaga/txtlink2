'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import {
  AlertTriangle,
  ChevronDown,
  Clock,
  Loader2,
  Phone,
  Radio,
  RefreshCw,
  XCircle,
} from 'lucide-react'

export type ActionableSms = {
  id: string
  time: string
  recipient: string
  senderId: string
  message: string
  status: string
  displayStatus?: string
  fallbackStatus?: string | null
  failureReason?: string
  providerRetryAttempted?: boolean
  requiresPhoneTopUp?: boolean
}

type ViewFilter = 'all' | 'pending' | 'failed'

type ActionKind = 'retry-provider' | 'queue-phone' | 'retry-phone'

const PENDING_STATUSES = new Set(['queued', 'sent', 'processing', 'retrying', 'pending'])
const FAILED_STATUSES = new Set([
  'failed',
  'expired',
  'rejected',
  'undeliverable',
  'provider_timeout',
])

const PHONE_IN_PROGRESS = new Set([
  'queued_for_phone',
  'sending_via_phone',
  'sent_via_phone',
  'delivered_via_phone',
])

function isPendingSms(sms: ActionableSms) {
  return PENDING_STATUSES.has(sms.status)
}

function isFailedSms(sms: ActionableSms) {
  return (
    FAILED_STATUSES.has(sms.status) ||
    sms.fallbackStatus === 'phone_failed' ||
    sms.fallbackStatus === 'phone_requires_topup'
  )
}

function canRetryViaSenderId(sms: ActionableSms) {
  if (sms.status === 'delivered') return false
  if (sms.providerRetryAttempted) return false
  if (sms.fallbackStatus === 'retrying_provider' || sms.fallbackStatus === 'retry_waiting_delivery') {
    return false
  }
  return true
}

function canRetryViaPhone(sms: ActionableSms) {
  if (sms.status === 'delivered') return false
  if (PHONE_IN_PROGRESS.has(sms.fallbackStatus || '')) return false
  return true
}

function phoneActionFor(sms: ActionableSms): 'queue-phone' | 'retry-phone' {
  if (
    sms.fallbackStatus === 'phone_failed' ||
    sms.fallbackStatus === 'phone_requires_topup'
  ) {
    return 'retry-phone'
  }
  return 'queue-phone'
}

function statusTone(sms: ActionableSms) {
  if (isFailedSms(sms)) return 'bg-red-50 text-red-700 border-red-100'
  if (isPendingSms(sms)) return 'bg-amber-50 text-amber-800 border-amber-100'
  return 'bg-slate-50 text-slate-700 border-slate-100'
}

type Props = {
  onChanged?: () => void
}

export function SmsRetryDesk({ onChanged }: Props) {
  const { toast } = useToast()
  const [open, setOpen] = useState(true)
  const [view, setView] = useState<ViewFilter>('all')
  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState<ActionableSms[]>([])
  const [counts, setCounts] = useState({ pending: 0, failed: 0, total: 0 })
  const [busyId, setBusyId] = useState<string | null>(null)
  const [busyAction, setBusyAction] = useState<ActionKind | null>(null)

  const fetchActionable = useCallback(async (showSpinner = true) => {
    try {
      if (showSpinner) setLoading(true)
      const token = localStorage.getItem('token')
      const response = await fetch(
        `/api/user/sms/history/actionable?view=${view}&limit=50`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      if (!response.ok) throw new Error('Failed to load')
      const data = await response.json()
      setItems(data.data || [])
      setCounts(data.counts || { pending: 0, failed: 0, total: 0 })
    } catch {
      if (showSpinner) {
        toast({
          title: 'Could not load retry list',
          description: 'Refresh and try again.',
          variant: 'destructive',
        })
      }
    } finally {
      if (showSpinner) setLoading(false)
    }
  }, [view, toast])

  useEffect(() => {
    fetchActionable(true)
  }, [fetchActionable])

  // Auto-expand when there is work to do
  useEffect(() => {
    if (counts.total > 0) setOpen(true)
  }, [counts.total])

  const summaryLabel = useMemo(() => {
    if (counts.total === 0) return 'No pending or failed SMS'
    const parts: string[] = []
    if (counts.pending > 0) parts.push(`${counts.pending} pending`)
    if (counts.failed > 0) parts.push(`${counts.failed} failed`)
    return parts.join(' · ')
  }, [counts])

  const runAction = async (sms: ActionableSms, action: ActionKind) => {
    setBusyId(sms.id)
    setBusyAction(action)
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/user/sms-fallback/${sms.id}/${action}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Action failed')
      }
      toast({
        title: action === 'retry-provider' ? 'Retrying via Sender ID' : 'Queued for phone gateway',
        description: data.message || 'Retry started.',
      })
      await fetchActionable(false)
      onChanged?.()
    } catch (err) {
      toast({
        title: 'Retry failed',
        description: err instanceof Error ? err.message : 'Could not start retry',
        variant: 'destructive',
      })
    } finally {
      setBusyId(null)
      setBusyAction(null)
    }
  }

  return (
    <Card className="overflow-hidden rounded-[18px] border border-[#E2E8F0] bg-white shadow-sm">
      <Collapsible open={open} onOpenChange={setOpen}>
        <div className="flex flex-col gap-3 border-b border-[#E2E8F0] bg-gradient-to-r from-[#FFF7ED] via-white to-[#ECFDF5] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="group flex min-w-0 flex-1 items-start gap-3 text-left"
            >
              <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-[#E2E8F0]">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
              </span>
              <span className="min-w-0">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="text-base font-semibold text-[#0F172A]">
                    Pending & Failed SMS
                  </span>
                  {counts.total > 0 && (
                    <Badge className="rounded-full bg-[#0F172A] px-2 py-0.5 text-[11px] font-medium text-white hover:bg-[#0F172A]">
                      {counts.total}
                    </Badge>
                  )}
                </span>
                <span className="mt-0.5 block text-sm text-[#64748B]">
                  Retry undelivered messages via your Sender ID or Android phone gateway.
                </span>
                <span className="mt-1 block text-xs font-medium text-[#94A3B8] sm:hidden">
                  {summaryLabel}
                </span>
              </span>
              <ChevronDown
                className={cn(
                  'mt-2 h-5 w-5 shrink-0 text-[#64748B] transition-transform duration-200',
                  open && 'rotate-180'
                )}
              />
            </button>
          </CollapsibleTrigger>

          <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
            <span className="hidden text-xs font-medium text-[#64748B] sm:inline">
              {summaryLabel}
            </span>
            <select
              value={view}
              onChange={(e) => setView(e.target.value as ViewFilter)}
              className="h-10 min-w-[9.5rem] rounded-xl border border-[#E2E8F0] bg-white px-3 text-sm text-[#0F172A] shadow-sm focus:border-[#2F9B73] focus:outline-none focus:ring-2 focus:ring-[#2F9B73]/20"
              aria-label="Filter pending and failed SMS"
            >
              <option value="all">All ({counts.total})</option>
              <option value="pending">Pending ({counts.pending})</option>
              <option value="failed">Failed ({counts.failed})</option>
            </select>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => fetchActionable(true)}
              disabled={loading}
              className="h-10 rounded-xl border border-[#E2E8F0] bg-white px-3 text-[#2F9B73] hover:bg-[#ECFDF5]"
            >
              <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
            </Button>
          </div>
        </div>

        <CollapsibleContent>
          <div className="px-4 py-3 sm:px-5">
            {loading ? (
              <div className="flex items-center justify-center gap-2 py-10 text-sm text-[#64748B]">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading messages…
              </div>
            ) : items.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[#E2E8F0] bg-[#F8FAFC] px-4 py-10 text-center">
                <Clock className="mx-auto mb-2 h-8 w-8 text-[#CBD5E1]" />
                <p className="text-sm font-medium text-[#334155]">All clear</p>
                <p className="mt-1 text-xs text-[#94A3B8]">
                  No {view === 'all' ? 'pending or failed' : view} SMS right now.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-[#F1F5F9]">
                {items.map((sms) => {
                  const senderOk = canRetryViaSenderId(sms)
                  const phoneOk = canRetryViaPhone(sms)
                  const phoneAction = phoneActionFor(sms)
                  const rowBusy = busyId === sms.id

                  return (
                    <li
                      key={sms.id}
                      className="flex flex-col gap-3 py-4 first:pt-2 last:pb-2 lg:flex-row lg:items-center lg:justify-between"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium text-[#0F172A]">{sms.recipient}</span>
                          <Badge
                            variant="outline"
                            className={cn(
                              'rounded-full border px-2 py-0 text-[11px] font-medium',
                              statusTone(sms)
                            )}
                          >
                            {isFailedSms(sms) ? (
                              <XCircle className="mr-1 h-3 w-3" />
                            ) : (
                              <Clock className="mr-1 h-3 w-3" />
                            )}
                            {sms.displayStatus || sms.status}
                          </Badge>
                          <span className="text-xs text-[#94A3B8]">{sms.time}</span>
                        </div>
                        <p className="mt-1 text-xs text-[#64748B]">
                          Sender ID:{' '}
                          <span className="font-medium text-[#334155]">{sms.senderId}</span>
                        </p>
                        <p className="mt-1 line-clamp-2 text-sm text-[#475569]">{sms.message}</p>
                        {sms.failureReason && (
                          <p className="mt-1 text-xs text-red-600">{sms.failureReason}</p>
                        )}
                      </div>

                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center lg:shrink-0">
                        <Button
                          type="button"
                          size="sm"
                          disabled={!senderOk || rowBusy}
                          onClick={() => runAction(sms, 'retry-provider')}
                          className="h-9 rounded-xl bg-[#2F9B73] px-3 text-xs font-medium text-white hover:bg-[#267D5E] disabled:opacity-50"
                          title={
                            senderOk
                              ? `Resend via Sender ID ${sms.senderId}`
                              : 'Sender ID retry already used or in progress'
                          }
                        >
                          {rowBusy && busyAction === 'retry-provider' ? (
                            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Radio className="mr-1.5 h-3.5 w-3.5" />
                          )}
                          Retry via Sender ID
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          disabled={!phoneOk || rowBusy}
                          onClick={() => runAction(sms, phoneAction)}
                          className="h-9 rounded-xl border border-[#E2E8F0] bg-white px-3 text-xs font-medium text-[#0F172A] hover:bg-[#F8FAFC] disabled:opacity-50"
                          title={
                            phoneOk
                              ? 'Send through Android phone gateway'
                              : 'Already queued or sending via phone'
                          }
                        >
                          {rowBusy &&
                          (busyAction === 'queue-phone' || busyAction === 'retry-phone') ? (
                            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Phone className="mr-1.5 h-3.5 w-3.5 text-[#2F9B73]" />
                          )}
                          Retry via Phone Gateway
                        </Button>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  )
}

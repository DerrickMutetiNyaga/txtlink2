'use client'

import { useEffect, useState } from 'react'
import { Copy, Check, Smartphone } from 'lucide-react'

interface PaybillDetails {
  enabled: boolean
  paybill: string
  account: string
  profilePhone?: string
}

export function PaybillInstructions({
  profilePhone,
  showOptionalStkNote = false,
}: {
  profilePhone?: string
  showOptionalStkNote?: boolean
}) {
  const [details, setDetails] = useState<PaybillDetails | null>(null)
  const [copied, setCopied] = useState<string | null>(null)
  const [lookupPhone, setLookupPhone] = useState(profilePhone || '')
  const [lookupError, setLookupError] = useState('')
  const [lookingUp, setLookingUp] = useState(false)

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
    fetch('/api/payments/paybill', {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.enabled && data.paybill) {
          setDetails({
            enabled: true,
            paybill: data.paybill,
            account: data.account || '',
            profilePhone: data.profilePhone || '',
          })
        }
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (profilePhone) setLookupPhone(profilePhone)
  }, [profilePhone])

  const copy = async (value: string, key: string) => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(key)
      setTimeout(() => setCopied(null), 1500)
    } catch {
      // ignore
    }
  }

  const lookupAccount = async () => {
    const phone = lookupPhone.trim()
    if (!phone) {
      setLookupError('Enter the phone number on your TXTLINK profile.')
      return
    }
    try {
      setLookingUp(true)
      setLookupError('')
      const response = await fetch('/api/payments/paybill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      })
      const data = await response.json()
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Could not find that account')
      }
      if (!data.account) {
        setLookupError('No TXTLINK account uses that phone. Check Settings → Profile, or log in.')
        return
      }
      setDetails((current) => ({
        enabled: true,
        paybill: data.paybill || current?.paybill || '',
        account: data.account,
        profilePhone: data.profilePhone || phone,
      }))
    } catch (error: any) {
      setLookupError(error.message || 'Could not look up that number')
    } finally {
      setLookingUp(false)
    }
  }

  if (!details) return null

  const rows = [
    { key: 'paybill', label: 'Paybill', value: details.paybill },
    ...(details.account
      ? [{ key: 'account', label: 'Account number', value: details.account }]
      : []),
  ]

  const displayPhone = details.profilePhone || profilePhone

  return (
    <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-5 sm:p-6">
      <div className="flex items-start gap-3 mb-4">
        <div className="p-2 rounded-xl bg-emerald-600 text-white shrink-0">
          <Smartphone className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-semibold text-slate-900">Pay with M-Pesa (no app needed)</h3>
          <p className="text-sm text-slate-800 mt-1">
            Lipa na M-Pesa → Pay Bill. Your account number is usually the last 5 digits of your
            TXTLINK phone (or last 4 if that code is already taken). Numbers never start or end
            with 0. Once given, this number is
            yours forever and is never given to anyone else.
          </p>
        </div>
      </div>

      <ol className="text-sm text-slate-800 space-y-1.5 mb-4 list-decimal list-inside">
        <li>Open M-Pesa on your phone</li>
        <li>Lipa na M-Pesa → Pay Bill</li>
        <li>Enter the details below, then the amount</li>
        <li>Enter your PIN. Credits appear automatically</li>
      </ol>

      <div className="space-y-2">
        {rows.map((row) => (
          <div
            key={row.key}
            className="flex items-center justify-between gap-3 rounded-xl bg-white border border-slate-200 px-4 py-3"
          >
            <div>
              <p className="text-sm text-slate-600">{row.label}</p>
              <p className="text-xl font-bold tracking-wide text-slate-900">{row.value}</p>
            </div>
            <button
              type="button"
              onClick={() => copy(row.value, row.key)}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-800 hover:text-emerald-900"
            >
              {copied === row.key ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied === row.key ? 'Copied' : 'Copy'}
            </button>
          </div>
        ))}
      </div>

      {!details.account && (
        <div className="mt-4 rounded-xl bg-white border border-slate-200 p-4 space-y-3">
          <p className="text-sm font-medium text-slate-900">
            Enter your TXTLINK phone to see your account number
          </p>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="tel"
              value={lookupPhone}
              onChange={(e) => setLookupPhone(e.target.value)}
              placeholder="e.g. 0712345678"
              className="w-full h-11 px-4 rounded-xl border border-slate-200 text-slate-900"
            />
            <button
              type="button"
              onClick={lookupAccount}
              disabled={lookingUp}
              className="h-11 px-5 rounded-xl bg-emerald-700 text-white font-medium hover:bg-emerald-800 disabled:opacity-50"
            >
              {lookingUp ? 'Checking...' : 'Show account'}
            </button>
          </div>
          {lookupError && <p className="text-sm font-medium text-red-700">{lookupError}</p>}
        </div>
      )}

      <p className="text-sm text-slate-800 mt-4">
        Use the account number shown here
        {displayPhone ? ` (from ${displayPhone})` : ''}. It never changes, and it is never given to
        another person.
      </p>
      {showOptionalStkNote && (
        <p className="text-sm text-slate-700 mt-2">
          Prefer a prompt on your phone? You can still send an STK push below.
        </p>
      )}
    </div>
  )
}

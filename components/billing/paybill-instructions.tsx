'use client'

import { useEffect, useState } from 'react'
import { Copy, Check, Smartphone } from 'lucide-react'

interface PaybillDetails {
  enabled: boolean
  paybill: string
  account: string
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

  useEffect(() => {
    fetch('/api/payments/paybill')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.enabled && data.paybill) {
          setDetails({ enabled: true, paybill: data.paybill, account: data.account || 'SMS' })
        }
      })
      .catch(() => {})
  }, [])

  const copy = async (value: string, key: string) => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(key)
      setTimeout(() => setCopied(null), 1500)
    } catch {
      // ignore
    }
  }

  if (!details) return null

  const rows = [
    { key: 'paybill', label: 'Paybill', value: details.paybill },
    { key: 'account', label: 'Account', value: details.account },
  ]

  return (
    <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-5 sm:p-6">
      <div className="flex items-start gap-3 mb-4">
        <div className="p-2 rounded-xl bg-emerald-600 text-white shrink-0">
          <Smartphone className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-semibold text-slate-900">Pay with M-Pesa (no app needed)</h3>
          <p className="text-sm text-slate-600 mt-1">
            Lipa na M-Pesa → Paybill. Use this same account for every top-up. Credits go to the TXTLINK profile that has this paying phone number.
          </p>
        </div>
      </div>

      <ol className="text-sm text-slate-700 space-y-1.5 mb-4 list-decimal list-inside">
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
              <p className="text-xs text-slate-500">{row.label}</p>
              <p className="text-xl font-bold tracking-wide text-slate-900">{row.value}</p>
            </div>
            <button
              type="button"
              onClick={() => copy(row.value, row.key)}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-700 hover:text-emerald-800"
            >
              {copied === row.key ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied === row.key ? 'Copied' : 'Copy'}
            </button>
          </div>
        ))}
      </div>

      <p className="text-xs text-slate-600 mt-4">
        Pay from the M-Pesa number on your TXTLINK profile
        {profilePhone ? ` (${profilePhone})` : ''}. Do not change the account number.
      </p>
      {showOptionalStkNote && (
        <p className="text-xs text-slate-500 mt-2">
          Prefer a prompt on your phone? You can still send an STK push below.
        </p>
      )}
    </div>
  )
}

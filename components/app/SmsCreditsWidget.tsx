'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'

export function SmsCreditsWidget() {
  const [credits, setCredits] = useState<number>(0)
  const [deliveryRate] = useState(92.2) // TODO: Calculate from actual SMS stats
  const [loading, setLoading] = useState(true)
  const isLowBalance = credits < 500

  // Fetch real credits from API
  useEffect(() => {
    const fetchCredits = async () => {
      try {
        const token = localStorage.getItem('token')
        if (!token) {
          setLoading(false)
          return
        }

        const response = await fetch('/api/user/balance', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (response.ok) {
          const data = await response.json()
          setCredits(data.balance || 0)
        } else if (response.status === 401) {
          // Unauthorized - token expired or invalid, silently handle
          setLoading(false)
          return
        }
      } catch (error) {
        // Only log non-network errors
        if (error instanceof TypeError && error.message.includes('fetch')) {
          // Network error, don't log
        } else {
          console.error('Failed to fetch credits:', error)
        }
      } finally {
        setLoading(false)
      }
    }

    fetchCredits()

    // Listen for real-time balance updates
    const handleBalanceUpdate = (event: CustomEvent) => {
      if (event.detail?.newBalance !== undefined) {
        setCredits(event.detail.newBalance)
      }
    }

    window.addEventListener('balanceUpdated', handleBalanceUpdate as EventListener)
    return () => {
      window.removeEventListener('balanceUpdated', handleBalanceUpdate as EventListener)
    }
  }, [])

  return (
    <div className="flex items-center gap-3">
      {/* SMS Credits Mini-Card - Premium & Calm */}
      <div className="hidden md:flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2">
        <div className="leading-tight">
          <div className="flex items-center gap-1.5 mb-0.5">
            <p className="text-xs text-slate-500">SMS Credits</p>
            {isLowBalance && (
              <span className="inline-block h-2 w-2 rounded-full bg-amber-500"></span>
            )}
          </div>
          <p className="text-base font-semibold text-slate-900">
            {credits.toLocaleString()}
          </p>
          <p className={`text-[11px] ${isLowBalance ? 'text-amber-600' : 'text-slate-400'}`}>
            {isLowBalance ? 'Low balance' : `${deliveryRate}% delivery rate`}
          </p>
        </div>
        
        {/* Top up Button - Only CTA */}
        <Link href="/app/billing/top-up">
          <Button className="ml-2 h-9 rounded-xl bg-emerald-600 px-3 text-sm font-medium text-white hover:bg-emerald-700">
            <Plus className="h-4 w-4 mr-1.5" />
            Top up
          </Button>
        </Link>
      </div>

      {/* Mobile: Compact version */}
      <div className="md:hidden flex items-center gap-2">
        <div className="text-sm font-semibold text-slate-900">
          {credits.toLocaleString()}
        </div>
        {isLowBalance && (
          <span className="inline-block h-2 w-2 rounded-full bg-amber-500"></span>
        )}
        <Link href="/app/billing/top-up">
          <Button className="h-8 rounded-xl bg-emerald-600 px-3 text-xs font-medium text-white hover:bg-emerald-700">
            <Plus className="h-3.5 w-3.5 mr-1" />
            Top up
          </Button>
        </Link>
      </div>
    </div>
  )
}

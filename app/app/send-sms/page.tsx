'use client'

import { PortalLayout } from '@/components/portal-layout'
import { QuickSendForm } from '@/components/send-sms/QuickSendForm'
import { BulkSendForm } from '@/components/send-sms/BulkSendForm'
import SenderIdAdBanner from '@/components/sender-id-ad/SenderIdAdBanner'
import { useState, useEffect } from 'react'

export default function SendSMSPage() {
  const [mode, setMode] = useState<'quick' | 'bulk'>('quick')
  const [balance, setBalance] = useState<number>(0)
  const [loadingBalance, setLoadingBalance] = useState(true)
  const [pricePerCreditKes, setPricePerCreditKes] = useState<number | null>(null)

  // Fetch real balance from API
  useEffect(() => {
    const fetchBalance = async () => {
      try {
        const token = localStorage.getItem('token')
        if (!token) {
          setLoadingBalance(false)
          return
        }

        const response = await fetch('/api/user/balance', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (response.ok) {
          const data = await response.json()
          setBalance(data.balance || 0)
          if (typeof data.pricePerCreditKes === 'number') {
            setPricePerCreditKes(data.pricePerCreditKes)
          }
        } else if (response.status === 401) {
          // Unauthorized - token expired or invalid, silently handle
          setLoadingBalance(false)
          return
        }
      } catch (error) {
        // Only log non-network errors
        if (error instanceof TypeError && error.message.includes('fetch')) {
          // Network error, don't log
        } else {
          console.error('Failed to fetch balance:', error)
        }
      } finally {
        setLoadingBalance(false)
      }
    }

    fetchBalance()
  }, [])

  // Reset form state when switching modes
  useEffect(() => {
    // This ensures clean state when switching between modes
    // Each form component manages its own state internally
  }, [mode])

  return (
    <PortalLayout activeSection="Send SMS">
      <div className="max-w-7xl mx-auto">
        {/* Sender ID Ad Banner */}
        <SenderIdAdBanner currentPage="send-sms" />
        
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-semibold text-slate-900 mb-2">Send SMS</h1>
          <p className="text-base text-slate-500 leading-relaxed">
            Compose and send messages instantly or schedule for later
          </p>
        </div>

        {/* Mode Switch - Segmented Control */}
        <div className="mb-6">
          <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200/60">
            <button
              onClick={() => setMode('quick')}
              className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                mode === 'quick'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Quick Send
            </button>
            <button
              onClick={() => setMode('bulk')}
              className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                mode === 'bulk'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Bulk Send
            </button>
          </div>
        </div>

        {/* Strict Conditional Rendering - Only one form at a time */}
        {!loadingBalance && mode === 'quick' && (
          <QuickSendForm 
            balance={balance} 
            pricePerCreditKes={pricePerCreditKes || undefined}
            onBalanceUpdate={(newBalance) => setBalance(newBalance)}
          />
        )}
        {!loadingBalance && mode === 'bulk' && (
          <BulkSendForm 
            balance={balance}
            pricePerCreditKes={pricePerCreditKes || undefined}
          />
        )}
      </div>
    </PortalLayout>
  )
}

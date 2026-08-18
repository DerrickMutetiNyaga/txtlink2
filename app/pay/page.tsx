'use client'

import Link from 'next/link'
import { PaybillInstructions } from '@/components/billing/paybill-instructions'

export default function PublicPayPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="marketing-container py-12 sm:py-16">
        <div className="max-w-xl mx-auto space-y-6">
          <div>
            <p className="text-sm font-medium text-emerald-700 mb-2">TXTLINK</p>
            <h1 className="text-3xl font-bold text-slate-900">Buy SMS credits</h1>
            <p className="text-slate-600 mt-2">
              You do not need to open the portal to pay. Send M-Pesa to the Paybill below. The account number is SMS for everyone.
            </p>
          </div>

          <PaybillInstructions />

          <p className="text-sm text-slate-500">
            Already have an account?{' '}
            <Link href="/auth/login" className="text-emerald-700 font-medium hover:underline">
              Log in
            </Link>{' '}
            to check your balance, or update your profile phone in Settings if credits did not arrive.
          </p>
        </div>
      </div>
    </div>
  )
}

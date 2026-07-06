import Link from 'next/link'
import { Check } from 'lucide-react'

interface MobileBrandHeaderProps {
  features: string[]
}

export function MobileBrandHeader({ features }: MobileBrandHeaderProps) {
  return (
    <div className="px-4 pt-6 pb-5 bg-gradient-to-br from-emerald-50 via-white to-emerald-50/30 rounded-b-2xl max-h-[220px] overflow-hidden">
      {/* Top Bar */}
      <div className="flex items-center justify-between mb-3">
        <Link href="/" className="inline-block">
          <span className="text-lg font-bold text-emerald-600">TXTLink</span>
        </Link>
        <Link
          href="/contact"
          className="text-xs text-gray-600 hover:text-emerald-600 transition-colors font-medium"
        >
          Help
        </Link>
      </div>

      {/* Badge */}
      <div className="mb-2.5">
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 border border-emerald-200">
          TXTLink • Enterprise Messaging
        </span>
      </div>

      {/* Headline */}
      <h1 className="text-lg sm:text-xl font-bold text-gray-900 mb-2.5 leading-tight">
        Send SMS that feels reliable.
      </h1>

      {/* Features - Only 2 on mobile */}
      <ul className="space-y-1.5">
        {features.slice(0, 2).map((feature, idx) => (
          <li key={idx} className="flex items-start gap-2">
            <div className="flex-shrink-0 mt-0.5">
              <div className="w-4 h-4 rounded-full bg-emerald-100 flex items-center justify-center">
                <Check className="w-2.5 h-2.5 text-emerald-600" />
              </div>
            </div>
            <p className="text-xs text-gray-700 leading-relaxed">{feature}</p>
          </li>
        ))}
      </ul>
    </div>
  )
}


import { Check } from 'lucide-react'
import Link from 'next/link'

interface BrandPanelProps {
  features: string[]
}

export function BrandPanel({ features }: BrandPanelProps) {
  return (
    <div className="relative flex flex-col justify-between h-full p-8 sm:p-10 md:p-12 lg:p-16">
      {/* Background Gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 via-white to-emerald-50/30" />
      
      {/* Content */}
      <div className="relative z-10">
        {/* Badge */}
        <div className="mb-8 sm:mb-10">
          <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 border border-emerald-200">
            TXTLink • Enterprise Messaging
          </span>
        </div>

        {/* Headline */}
        <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight mb-6 sm:mb-8">
          Send SMS that feels reliable.
        </h1>

        {/* Features */}
        <ul className="space-y-4 sm:space-y-5 mb-8 sm:mb-12">
          {features.map((feature, idx) => (
            <li key={idx} className="flex items-start gap-3 sm:gap-4">
              <div className="flex-shrink-0 mt-0.5">
                <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-emerald-100 flex items-center justify-center">
                  <Check className="w-3 h-3 sm:w-4 sm:h-4 text-emerald-600" />
                </div>
              </div>
              <p className="text-base sm:text-lg text-gray-700 leading-relaxed">{feature}</p>
            </li>
          ))}
        </ul>
      </div>

      {/* Footer */}
      <div className="relative z-10 mt-auto pt-8">
        <p className="text-xs sm:text-sm text-gray-500">
          © {new Date().getFullYear()} TXTLink. All rights reserved.
        </p>
      </div>
    </div>
  )
}


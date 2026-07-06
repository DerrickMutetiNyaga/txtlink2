'use client'

import React from 'react'
import { LucideIcon } from 'lucide-react'

interface ValueTileProps {
  icon: LucideIcon
  title: string
  description: string
  metric: string
  index: number
}

export function ValueTile({ icon: Icon, title, description, metric, index }: ValueTileProps) {
  return (
    <div
      className="p-6 bg-white rounded-xl border border-slate-200/60 shadow-sm hover:shadow-md transition-all duration-300"
      style={{
        animation: `fadeInUp 0.6s ease-out ${index * 0.1 + 0.3}s both`,
      }}
    >
      <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-teal-50 to-emerald-50 flex items-center justify-center mb-4">
        <Icon className="w-6 h-6 text-teal-600" />
      </div>
      <h3 className="text-lg font-semibold text-slate-900 mb-2">{title}</h3>
      <p className="text-sm text-slate-600 mb-4">{description}</p>
      <div className="pt-4 border-t border-slate-100">
        <p className="text-xs font-semibold text-teal-600 uppercase tracking-wider">
          {metric}
        </p>
      </div>
    </div>
  )
}


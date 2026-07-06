'use client'

import React from 'react'
import { AlertCircle, Info, CheckCircle2, AlertTriangle, LucideIcon } from 'lucide-react'

interface CalloutProps {
  type?: 'info' | 'warning' | 'error' | 'success'
  title?: string
  children: React.ReactNode
}

const calloutStyles = {
  info: {
    icon: Info,
    bg: 'bg-teal-50',
    border: 'border-teal-200',
    iconColor: 'text-teal-600',
    titleColor: 'text-teal-900',
    textColor: 'text-teal-800',
  },
  warning: {
    icon: AlertTriangle,
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    iconColor: 'text-amber-600',
    titleColor: 'text-amber-900',
    textColor: 'text-amber-800',
  },
  error: {
    icon: AlertCircle,
    bg: 'bg-red-50',
    border: 'border-red-200',
    iconColor: 'text-red-600',
    titleColor: 'text-red-900',
    textColor: 'text-red-800',
  },
  success: {
    icon: CheckCircle2,
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    iconColor: 'text-emerald-600',
    titleColor: 'text-emerald-900',
    textColor: 'text-emerald-800',
  },
}

export function Callout({ type = 'info', title, children }: CalloutProps) {
  const style = calloutStyles[type]
  const Icon = style.icon

  return (
    <div className={`${style.bg} ${style.border} border rounded-lg p-4 my-6`}>
      <div className="flex gap-3">
        <Icon className={`w-5 h-5 ${style.iconColor} flex-shrink-0 mt-0.5`} />
        <div className="flex-1">
          {title && (
            <h4 className={`font-semibold ${style.titleColor} mb-1`}>{title}</h4>
          )}
          <div className={`text-sm ${style.textColor}`}>{children}</div>
        </div>
      </div>
    </div>
  )
}


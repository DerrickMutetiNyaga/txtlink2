import { CheckCircle, Clock, AlertCircle, XCircle, Radio } from 'lucide-react'

interface StatusBadgeProps {
  status: 'approved' | 'pending' | 'rejected' | 'failed' | 'delivered' | 'active' | 'suspended'
  label?: string
}

export function StatusBadge({ status, label }: StatusBadgeProps) {
  const statusConfig = {
    approved: {
      bg: 'bg-emerald-50',
      text: 'text-emerald-700',
      border: 'border-emerald-200',
      icon: CheckCircle,
      label: label || 'Approved',
    },
    pending: {
      bg: 'bg-slate-50',
      text: 'text-slate-700',
      border: 'border-slate-200',
      icon: Clock,
      label: label || 'Pending',
    },
    rejected: {
      bg: 'bg-red-50',
      text: 'text-red-700',
      border: 'border-red-200',
      icon: XCircle,
      label: label || 'Rejected',
    },
    failed: {
      bg: 'bg-red-50',
      text: 'text-red-700',
      border: 'border-red-200',
      icon: XCircle,
      label: label || 'Failed',
    },
    delivered: {
      bg: 'bg-emerald-50',
      text: 'text-emerald-700',
      border: 'border-emerald-200',
      icon: CheckCircle,
      label: label || 'Delivered',
    },
    active: {
      bg: 'bg-emerald-50',
      text: 'text-emerald-700',
      border: 'border-emerald-200',
      icon: Radio,
      label: label || 'Active',
    },
    suspended: {
      bg: 'bg-red-50',
      text: 'text-red-700',
      border: 'border-red-200',
      icon: AlertCircle,
      label: label || 'Suspended',
    },
  }

  const config = statusConfig[status]
  const Icon = config.icon

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${config.bg} ${config.text} ${config.border}`}>
      <Icon size={12} />
      {config.label}
    </span>
  )
}

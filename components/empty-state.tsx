'use client';

import { Button } from '@/components/ui/button'
import { type LucideIcon } from 'lucide-react'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
  ctaLabel?: string
  ctaHref?: string
  onCTA?: () => void
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  ctaLabel,
  ctaHref,
  onCTA,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
      <div className="p-4 bg-muted rounded-full mb-4">
        <Icon size={32} className="text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground mb-6 max-w-sm">{description}</p>
      {ctaLabel && (
        <Button
          onClick={onCTA}
          className="bg-primary text-primary-foreground hover:bg-primary/90"
        >
          {ctaLabel}
        </Button>
      )}
    </div>
  )
}

'use client'

import React, { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowRight, LucideIcon } from 'lucide-react'
import Link from 'next/link'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'

interface IndustryCardProps {
  icon: LucideIcon
  title: string
  bestFor: string
  topOutcomes: string[]
  keyFeatures: string[]
  useCases: string[]
  variant?: 'default' | 'gradient-stripe' | 'rounded-badge'
  index: number
}

export function IndustryCard({
  icon: Icon,
  title,
  bestFor,
  topOutcomes,
  keyFeatures,
  useCases,
  variant = 'default',
  index,
}: IndustryCardProps) {
  const badgeVariants = {
    default: 'rounded-xl',
    'gradient-stripe': 'rounded-xl',
    'rounded-badge': 'rounded-2xl',
  }

  const stripeVariants = {
    default: '',
    'gradient-stripe': 'h-1 bg-gradient-to-r from-teal-500 via-emerald-500 to-teal-500',
    'rounded-badge': '',
  }

  return (
    <Card
      className="group relative bg-white border border-slate-200/70 rounded-2xl shadow-sm hover:shadow-md hover:-translate-y-1 hover:ring-1 hover:ring-teal-200 transition-all duration-300 overflow-hidden"
      style={{
        animation: `fadeInUp 0.6s ease-out ${index * 0.1}s both`,
      }}
    >
      {/* Top border gradient stripe (for gradient-stripe variant) */}
      {variant === 'gradient-stripe' && (
        <div className={stripeVariants['gradient-stripe']} />
      )}

      <div className="p-6">
        {/* Icon Badge */}
        <div className="mb-5">
          <div
            className={`w-12 h-12 ${badgeVariants[variant]} bg-gradient-to-br from-teal-50 via-teal-100/50 to-emerald-50 flex items-center justify-center mb-4 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-sm`}
          >
            <Icon className="w-6 h-6 text-teal-600 relative z-10" />
          </div>
          <h3 className="text-xl font-semibold text-slate-900 mb-1">{title}</h3>
          <p className="text-xs text-slate-500 font-medium">Best for: {bestFor}</p>
        </div>

        {/* Top Outcomes */}
        <div className="mb-5">
          <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
            Top Outcomes
          </h4>
          <ul className="space-y-2">
            {topOutcomes.map((outcome, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-500 mt-2 flex-shrink-0" />
                <span>{outcome}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Key Features Accordion */}
        <div className="mb-5">
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="features" className="border-0">
              <AccordionTrigger className="text-xs font-semibold text-slate-700 hover:no-underline py-2">
                <span>Key Features</span>
              </AccordionTrigger>
              <AccordionContent>
                <ul className="space-y-2 pt-2">
                  {keyFeatures.map((feature, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                      <span className="w-1.5 h-1.5 rounded-full bg-teal-500 mt-2 flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>

        {/* Use Case Chips */}
        <div className="mb-6">
          <div className="flex flex-wrap gap-2">
            {useCases.slice(0, 3).map((useCase, i) => (
              <span
                key={i}
                className="px-2.5 py-1 bg-slate-50 text-slate-600 text-xs rounded-md font-medium border border-slate-200/60"
              >
                {useCase}
              </span>
            ))}
            {useCases.length > 3 && (
              <span className="px-2.5 py-1 bg-slate-50 text-slate-500 text-xs rounded-md">
                +{useCases.length - 3} more
              </span>
            )}
          </div>
        </div>

        {/* CTA Row */}
        <div className="pt-4 border-t border-slate-100">
          <Link href="/contact" className="block">
            <Button className="w-full bg-teal-600 text-white hover:bg-teal-700 h-9 text-sm font-medium group/btn">
              View solution
              <ArrowRight className="ml-1.5 w-3.5 h-3.5 transition-transform duration-300 group-hover/btn:translate-x-0.5" />
            </Button>
          </Link>
        </div>
      </div>
    </Card>
  )
}


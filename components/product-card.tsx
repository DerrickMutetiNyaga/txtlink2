'use client'

import React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Check, ArrowRight, LucideIcon } from 'lucide-react'

interface ProductCardProps {
  icon: LucideIcon
  title: string
  description: string
  features: string[]
  keyFeature?: string // The feature to highlight with a pill
  bestFor: string
  compliance: string[]
  href: string
  index?: number
}

export function ProductCard({
  icon: Icon,
  title,
  description,
  features,
  keyFeature,
  bestFor,
  compliance,
  href,
  index = 0,
}: ProductCardProps) {
  const router = useRouter()

  const handleViewDocs = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault()
    
    // Check if user is authenticated
    if (typeof window !== 'undefined') {
      const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true'
      
      if (!isAuthenticated) {
        // Store intended destination for redirect after login
        const docsUrl = href === '#' ? '/developers' : href
        localStorage.setItem('redirectAfterLogin', docsUrl)
        // Redirect to login page if not authenticated
        router.push('/auth/login')
      } else {
        // If authenticated, go to developers/docs page
        const docsUrl = href === '#' ? '/developers' : href
        router.push(docsUrl)
      }
    }
  }

  return (
    <div
      className="group relative bg-white rounded-2xl border border-slate-200/60 shadow-sm hover:shadow-md hover:-translate-y-1 hover:ring-1 hover:ring-teal-200 transition-all duration-500 ease-out overflow-hidden flex flex-col"
      style={{
        animation: `fadeInUp 0.6s ease-out ${index * 0.1}s both`,
      }}
    >
      {/* Decorative blurred blob in top-right */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-teal-500/5 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />

      {/* Header strip with soft teal gradient */}
      <div className="h-1 bg-gradient-to-r from-teal-50 via-teal-100/50 to-transparent" />

      {/* Content */}
      <div className="relative z-10 p-6 flex flex-col h-full">
        {/* Icon Badge */}
        <div className="mb-5">
          <div className="relative w-12 h-12 rounded-xl bg-gradient-to-br from-teal-50 via-teal-50/50 to-transparent flex items-center justify-center mb-4 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-sm">
            <Icon className="w-6 h-6 text-teal-600 relative z-10" />
          </div>
          
          {/* Title and Best For */}
          <div className="mb-2">
            <h3 className="text-xl font-semibold text-slate-900 mb-1.5 leading-tight">
              {title}
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              Best for: {bestFor}
            </p>
          </div>
          
          {/* Description */}
          <p className="text-sm text-slate-600 leading-relaxed mb-5">
            {description}
          </p>
        </div>

        {/* Features List */}
        <div className="mb-6 space-y-2.5 flex-grow">
          {features.map((feature, idx) => {
            const isKeyFeature = keyFeature === feature
            return (
              <div
                key={feature}
                className="flex items-center gap-2.5 text-sm"
              >
                <div className="flex-shrink-0 w-4 h-4 rounded flex items-center justify-center">
                  <Check className="w-3.5 h-3.5 text-teal-600" />
                </div>
                <span
                  className={`leading-relaxed ${
                    isKeyFeature
                      ? 'inline-flex items-center gap-1.5'
                      : 'text-slate-600'
                  }`}
                >
                  {feature}
                  {isKeyFeature && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-teal-50 text-teal-700 text-xs font-medium">
                      Key feature
                    </span>
                  )}
                </span>
              </div>
            )
          })}
        </div>

        {/* Footer Area */}
        <div className="mt-auto pt-5 border-t border-slate-100">
          {/* Compliance Badges */}
          <div className="flex flex-wrap items-center gap-2 mb-4">
            {compliance.map((badge) => (
              <span
                key={badge}
                className="inline-flex items-center px-2.5 py-1 rounded-md bg-slate-50 text-slate-600 text-xs font-medium border border-slate-200/60"
              >
                {badge}
              </span>
            ))}
          </div>

          {/* CTA Area */}
          <div className="flex items-center gap-3">
            <Link href={href} className="flex-1">
              <Button className="w-full bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white rounded-lg h-9 text-sm font-medium shadow-sm hover:shadow-md transition-all duration-300 group/btn">
                Learn more
                <ArrowRight className="ml-1.5 w-3.5 h-3.5 transition-transform duration-300 group-hover/btn:translate-x-0.5" />
              </Button>
            </Link>
            <Link
              href="#"
              onClick={handleViewDocs}
              className="text-sm text-slate-600 hover:text-teal-600 transition-colors inline-flex items-center gap-1 group/link"
            >
              View docs
              <ArrowRight className="w-3.5 h-3.5 transition-transform duration-300 group-hover/link:translate-x-0.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}


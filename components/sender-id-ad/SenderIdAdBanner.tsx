'use client'

import { useEffect, useState } from 'react'
import { X, Sparkles, ArrowRight } from 'lucide-react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface SenderIdAd {
  _id: string
  title: string
  description: string
  senderIdName: string
  price: number
  priceUnit: string
  ctaText: string
  ctaLink: string
  backgroundColor: string
  textColor: string
  accentColor: string
  icon?: string
  displayFrequency: 'low' | 'medium' | 'high'
  showOnPages: string[]
}

interface SenderIdAdBannerProps {
  currentPage?: string
}

export default function SenderIdAdBanner({ currentPage = 'dashboard' }: SenderIdAdBannerProps) {
  const [ad, setAd] = useState<SenderIdAd | null>(null)
  const [isVisible, setIsVisible] = useState(false)
  const [isDismissed, setIsDismissed] = useState(false)
  const router = useRouter()

  useEffect(() => {
    // Check if ad was dismissed in this session
    const dismissed = sessionStorage.getItem('senderIdAdDismissed')
    if (dismissed) {
      setIsDismissed(true)
      return
    }

    // Fetch ad
    fetch('/api/sender-id-ad')
      .then(res => res.json())
      .then(data => {
        console.log('Sender ID Ad API Response:', data)
        console.log('Current Page:', currentPage)
        console.log('Ad isActive:', data.ad?.isActive)
        console.log('Show on Pages:', data.ad?.showOnPages)
        
        if (data.ad && data.ad.isActive) {
          // Check if ad should show on this page
          // If showOnPages is empty or includes current page, show it
          const shouldShow = !data.ad.showOnPages || 
                            data.ad.showOnPages.length === 0 || 
                            data.ad.showOnPages.includes(currentPage)
          
          console.log('Should show ad:', shouldShow)
          
          if (shouldShow) {
            setAd(data.ad)
            // Show immediately for testing, then apply delay
            setIsVisible(true)
            // Uncomment below to restore delay behavior
            // const delay = data.ad.displayFrequency === 'high' ? 500 : data.ad.displayFrequency === 'medium' ? 1000 : 2000
            // setTimeout(() => setIsVisible(true), delay)
          }
        } else {
          console.log('Ad not active or not found')
        }
      })
      .catch(err => console.error('Error fetching ad:', err))
  }, [currentPage])

  const handleDismiss = () => {
    setIsVisible(false)
    setIsDismissed(true)
    sessionStorage.setItem('senderIdAdDismissed', 'true')
    // Reset dismissal after 1 hour
    setTimeout(() => {
      sessionStorage.removeItem('senderIdAdDismissed')
    }, 60 * 60 * 1000)
  }

  const handleClick = async () => {
    if (ad) {
      // Track click
      await fetch('/api/sender-id-ad', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adId: ad._id }),
      })
      
      router.push(ad.ctaLink)
    }
  }

  if (!ad || isDismissed) {
    return null
  }

  // Use modern color palette - adjust if using defaults
  const bgColor = ad.backgroundColor === '#ECFDF5' || ad.backgroundColor === '#DDFBE6' ? '#DDFBE6' : ad.backgroundColor
  const headingColor = ad.textColor === '#065F46' || ad.textColor === '#052E2B' ? '#052E2B' : ad.textColor
  const bodyColor = ad.textColor === '#065F46' || ad.textColor === '#052E2B' ? '#2D6A63' : ad.textColor
  const priceColor = ad.accentColor === '#0F766E' ? '#064E3B' : ad.accentColor
  const ctaColor = ad.accentColor === '#0F766E' ? '#0F766E' : ad.accentColor
  const ctaHoverColor = ad.accentColor === '#0F766E' ? '#0B5E58' : ad.accentColor

  return (
    <div
      className="relative overflow-hidden rounded-2xl sm:rounded-3xl transition-all duration-500 ease-out mb-6 p-4 sm:p-6 lg:p-8"
      style={{
        backgroundColor: bgColor,
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0)' : 'translateY(-10px)',
        pointerEvents: isVisible ? 'auto' : 'none',
        boxShadow: '0 12px 30px rgba(2, 44, 34, 0.08)',
      }}
    >
      {/* Decorative background shapes - subtle depth */}
      <div
        className="hidden sm:block absolute -bottom-12 -left-12 w-48 h-48 rounded-full opacity-15 blur-3xl pointer-events-none"
        style={{ backgroundColor: '#C8F5D4' }}
      />
      <div
        className="hidden sm:block absolute -top-8 -right-8 w-32 h-32 rounded-full opacity-10 blur-2xl pointer-events-none"
        style={{ backgroundColor: '#C8F5D4' }}
      />

      {/* Dismiss button - smaller and lighter */}
      <button
        onClick={handleDismiss}
        className="absolute top-4 right-4 w-7 h-7 rounded-full flex items-center justify-center transition-all hover:scale-110 hover:bg-white/20"
        style={{ 
          backgroundColor: 'rgba(15, 118, 110, 0.06)',
          color: ctaHoverColor,
        }}
        aria-label="Dismiss"
      >
        <X className="w-3.5 h-3.5" />
      </button>

      <div className="relative flex flex-col sm:flex-row items-start gap-4 sm:gap-6 min-w-0">
        {/* Icon */}
        <div
          className="flex-shrink-0 w-12 h-12 sm:w-14 sm:h-14 rounded-[14px] flex items-center justify-center"
          style={{ 
            backgroundColor: `${ctaColor}15`,
          }}
        >
          {ad.icon ? (
            <span className="text-2xl">{ad.icon}</span>
          ) : (
            <Sparkles className="w-7 h-7" style={{ color: ctaColor }} />
          )}
        </div>

        {/* Content - stacked layout */}
        <div className="flex-1 min-w-0">
          {/* Heading */}
          <h3 
            className="text-xl sm:text-2xl lg:text-[2rem] font-bold mb-2 sm:mb-3 leading-tight break-words"
            style={{ 
              color: headingColor,
              fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif',
              fontWeight: 700,
              letterSpacing: '-0.02em',
            }}
          >
            {ad.title}
          </h3>
          
          {/* Description */}
          <p 
            className="text-sm sm:text-base mb-4 sm:mb-6 leading-relaxed break-words"
            style={{ 
              color: bodyColor,
              fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif',
              fontWeight: 400,
              lineHeight: 1.5,
            }}
          >
            {ad.description}
          </p>
          
          {/* Price and CTA row */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6">
            <div className="flex items-baseline gap-2 flex-wrap">
              <span 
                className="text-xl sm:text-2xl lg:text-[28px] font-extrabold"
                style={{ 
                  color: priceColor,
                  fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif',
                  fontWeight: 800,
                  letterSpacing: '-0.01em',
                }}
              >
                KSh {ad.price.toLocaleString()}
              </span>
              <span 
                className="text-[15px] font-medium opacity-75"
                style={{ 
                  color: bodyColor,
                  fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif',
                  fontWeight: 500,
                }}
              >
                {ad.priceUnit}
              </span>
            </div>
            
            {/* CTA Button */}
            <Link
              href={ad.ctaLink}
              onClick={handleClick}
              className="inline-flex items-center justify-center gap-2 px-5 sm:px-[22px] py-3 rounded-[14px] font-semibold transition-all hover:scale-105 hover:shadow-lg w-full sm:w-auto"
              style={{
                backgroundColor: ctaColor,
                color: '#FFFFFF',
                height: '48px',
                fontSize: '15px',
                fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif',
                fontWeight: 600,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = ctaHoverColor
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = ctaColor
              }}
            >
              {ad.ctaText}
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

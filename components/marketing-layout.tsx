'use client';

import React from "react"
import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Menu, X } from 'lucide-react'
import { Footer } from '@/components/footer'

export function MarketingLayout({ children }: { children: React.ReactNode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const closeMobileMenu = () => setMobileMenuOpen(false)

  return (
    <div className="min-h-screen bg-[#F9FAFB] text-gray-900 flex flex-col overflow-x-hidden w-full">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-3 min-w-0">
          <Link
            href="/"
            className="text-xl sm:text-2xl font-bold text-teal-600 hover:text-teal-700 transition-colors flex-shrink-0"
            onClick={closeMobileMenu}
          >
            TXTLINK
          </Link>

          <div className="hidden md:flex items-center gap-6 lg:gap-8 flex-shrink-0">
            <Link href="/products" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors whitespace-nowrap">
              Products
            </Link>
            <Link href="/pricing" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors whitespace-nowrap">
              Pricing
            </Link>
            <Link href="/industries" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors whitespace-nowrap">
              Industries
            </Link>
            <Link href="/about" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors whitespace-nowrap">
              About
            </Link>
            <Link href="/contact" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors whitespace-nowrap">
              Contact
            </Link>
          </div>

          <div className="hidden md:flex gap-3 lg:gap-4 flex-shrink-0">
            <Link href="/auth/login">
              <Button className="bg-teal-600 text-white hover:bg-teal-700">
                Sign In
              </Button>
            </Link>
            <Link href="/auth/register">
              <Button className="bg-teal-600 text-white hover:bg-teal-700">
                Get Started
              </Button>
            </Link>
          </div>

          <button
            type="button"
            className="md:hidden flex-shrink-0 p-2 -mr-2 rounded-lg hover:bg-gray-100 transition-colors"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200 bg-white px-4 py-4 space-y-1 max-h-[calc(100vh-4rem)] overflow-y-auto">
            {[
              { href: '/products', label: 'Products' },
              { href: '/pricing', label: 'Pricing' },
              { href: '/industries', label: 'Industries' },
              { href: '/about', label: 'About' },
              { href: '/contact', label: 'Contact' },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="block py-3 px-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg"
                onClick={closeMobileMenu}
              >
                {item.label}
              </Link>
            ))}
            <div className="pt-3 space-y-2 border-t border-gray-100">
              <Link href="/auth/login" className="block" onClick={closeMobileMenu}>
                <Button className="w-full bg-teal-600 text-white hover:bg-teal-700">
                  Sign In
                </Button>
              </Link>
              <Link href="/auth/register" className="block" onClick={closeMobileMenu}>
                <Button className="w-full bg-teal-600 text-white hover:bg-teal-700">
                  Get Started
                </Button>
              </Link>
            </div>
          </div>
        )}
      </nav>

      {/* Main content */}
      <main className="pt-16 sm:pt-20 pb-0 flex-grow w-full min-w-0">{children}</main>

      {/* Footer */}
      <Footer />
    </div>
  )
}

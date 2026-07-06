'use client';

import React from "react"
import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Menu, X } from 'lucide-react'
import { Footer } from '@/components/footer'

export function MarketingLayout({ children }: { children: React.ReactNode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <div className="min-h-screen bg-[#F9FAFB] text-gray-900 flex flex-col">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold text-teal-600 hover:text-teal-700 transition-colors">
            TXTLINK
          </Link>
          <div className="hidden md:flex items-center gap-8">
            <Link href="/products" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
              Products
            </Link>
            <Link href="/pricing" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
              Pricing
            </Link>
            <Link href="/industries" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
              Industries
            </Link>
            <Link href="/about" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
              About
            </Link>
            <Link href="/contact" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
              Contact
            </Link>
          </div>
          <div className="hidden md:flex gap-4">
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
            className="md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200 bg-white p-4 space-y-4">
            <Link href="/products" className="block text-sm font-medium text-gray-600 hover:text-gray-900">
              Products
            </Link>
            <Link href="/pricing" className="block text-sm font-medium text-gray-600 hover:text-gray-900">
              Pricing
            </Link>
            <Link href="/industries" className="block text-sm font-medium text-gray-600 hover:text-gray-900">
              Industries
            </Link>
            <Link href="/about" className="block text-sm font-medium text-gray-600 hover:text-gray-900">
              About
            </Link>
            <Link href="/contact" className="block text-sm font-medium text-gray-600 hover:text-gray-900">
              Contact
            </Link>
            <Link href="/auth/login" className="block">
              <Button className="w-full bg-teal-600 text-white hover:bg-teal-700">
                Sign In
              </Button>
            </Link>
            <Link href="/auth/register" className="block">
              <Button className="w-full bg-teal-600 text-white hover:bg-teal-700">
                Get Started
              </Button>
            </Link>
          </div>
        )}
      </nav>

      {/* Main content */}
      <main className="pt-20 pb-0 flex-grow">{children}</main>

      {/* Footer */}
      <Footer />
    </div>
  )
}

'use client'

import React from "react"

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  Menu,
  X,
  LayoutDashboard,
  Users,
  Radio,
  BarChart3,
  DollarSign,
  HelpCircle,
  LogOut,
} from 'lucide-react'

interface AdminLayoutProps {
  children: React.ReactNode
  activeSection?: string
}

export function AdminLayout({ children, activeSection }: AdminLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mobileOpen, setMobileOpen] = useState(false)
  const router = useRouter()

  // Redirect super admin (owner) to super-admin pages
  useEffect(() => {
    if (typeof window === 'undefined') return
    
    const userStr = localStorage.getItem('user')
    if (!userStr) return

    try {
      const user = JSON.parse(userStr)
      // If user is owner, redirect to super-admin using window.location
      if (user.isOwner) {
        console.log('AdminLayout: Redirecting owner to /super-admin', { 
          isOwner: user.isOwner,
          email: user.email,
          userObject: user
        })
        // Use window.location for immediate, unblockable redirect
        window.location.href = '/super-admin'
        return
      }
    } catch (error) {
      console.error('Error parsing user from localStorage:', error)
    }
  }, [router])

  const menuItems = [
    { label: 'Dashboard', icon: LayoutDashboard, href: '/admin/dashboard' },
    { label: 'Clients', icon: Users, href: '/admin/clients' },
    { label: 'Sender ID Approvals', icon: Radio, href: '/admin/sender-id-approvals' },
    { label: 'Transactions', icon: DollarSign, href: '/admin/transactions' },
    { label: 'Support Tickets', icon: HelpCircle, href: '/admin/support-tickets' },
  ]

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? 'w-64' : 'w-20'
        } bg-primary text-primary-foreground border-r border-primary/20 transition-all duration-300 flex flex-col hidden md:flex`}
      >
        {/* Logo */}
        <div className="p-6 flex items-center justify-between border-b border-primary-foreground/20">
          {sidebarOpen && <span className="font-bold text-xl">TXTLINK Admin</span>}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1 hover:bg-primary-foreground/10 rounded"
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {menuItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                activeSection === item.label
                  ? 'bg-primary-foreground/20'
                  : 'hover:bg-primary-foreground/10'
              }`}
            >
              <item.icon size={20} />
              {sidebarOpen && <span className="text-sm font-medium">{item.label}</span>}
            </Link>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-primary-foreground/20">
          <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-primary-foreground/10 transition-colors">
            <LogOut size={20} />
            {sidebarOpen && <span className="text-sm font-medium">Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Top Bar */}
        <header className="bg-background border-b border-border px-6 py-4 flex items-center justify-between sticky top-0 z-40">
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-2 hover:bg-muted rounded"
          >
            {mobileOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
          <div className="flex-1 md:flex-none">
            <h1 className="text-xl font-semibold text-primary">Admin Portal</h1>
          </div>
          <button className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
            A
          </button>
        </header>

        {/* Mobile Menu */}
        {mobileOpen && (
          <div className="md:hidden border-b border-border bg-background p-4 space-y-2">
            {menuItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  activeSection === item.label ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
                }`}
                onClick={() => setMobileOpen(false)}
              >
                <item.icon size={20} />
                <span className="text-sm font-medium">{item.label}</span>
              </Link>
            ))}
          </div>
        )}

        {/* Page Content */}
        <main className="flex-1 p-6 overflow-y-auto">{children}</main>
      </div>
    </div>
  )
}

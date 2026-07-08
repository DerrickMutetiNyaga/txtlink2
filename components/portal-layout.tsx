'use client'

import React from "react"

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  Menu,
  X,
  LayoutDashboard,
  MessageSquare,
  Radio,
  BarChart3,
  Key,
  Webhook,
  CreditCard,
  HelpCircle,
  Settings,
  LogOut,
  Bell,
  Search,
  BookOpen,
  ChevronDown,
  ChevronRight,
  Zap,
  CheckCircle2,
  User,
  Plus,
  TrendingUp,
  History,
  FileBarChart,
  Smartphone,
} from 'lucide-react'
import { SmsCreditsWidget } from '@/components/app/SmsCreditsWidget'
import { setupFetchInterceptor } from '@/lib/utils/fetch-interceptor'

interface PortalLayoutProps {
  children: React.ReactNode
  activeSection?: string
}

interface NavGroup {
  title: string
  items: NavItem[]
}

interface NavItem {
  label: string
  icon: React.ElementType
  href: string
  shortcut?: string
}

export function PortalLayout({ children, activeSection }: PortalLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [userEmail, setUserEmail] = useState<string>('')
  const router = useRouter()
  const pathname = usePathname()

  // Collapse sidebar on small laptops, expand on large screens
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1280px)')
    const handleChange = (e: MediaQueryListEvent | MediaQueryList) => {
      setSidebarOpen(e.matches)
    }
    handleChange(mq)
    mq.addEventListener('change', handleChange)
    return () => mq.removeEventListener('change', handleChange)
  }, [])

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [mobileOpen])

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  // Redirect super admin (owner) to super-admin pages
  useEffect(() => {
    if (typeof window === 'undefined') return
    
    const userStr = localStorage.getItem('user')
    if (!userStr) return

    try {
      const user = JSON.parse(userStr)
      // If user is owner, redirect to super-admin using window.location
      if (user.isOwner && !pathname?.startsWith('/super-admin')) {
        console.log('PortalLayout: Redirecting owner to /super-admin', { 
          pathname, 
          isOwner: user.isOwner,
          email: user.email,
          userObject: user
        })
        // Use window.location for immediate, unblockable redirect
        window.location.href = '/super-admin'
        return
      }
    } catch (error) {
      // Ignore parse errors
    }
  }, [router, pathname])

  // Get user email from localStorage on client side only
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const email = localStorage.getItem('userEmail') || ''
      setUserEmail(email)
    }
  }, [])

  // Setup global fetch interceptor to handle 401 responses
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setupFetchInterceptor()
    }
  }, [])

  const navGroups: NavGroup[] = [
    {
      title: 'Messaging',
        items: [
        { label: 'Dashboard', icon: LayoutDashboard, href: '/app/dashboard' },
        { label: 'Send SMS', icon: MessageSquare, href: '/app/send-sms', shortcut: '⌘K' },
        { label: 'SMS History', icon: History, href: '/app/smshistory' },
        { label: 'Delivery Summary', icon: FileBarChart, href: '/app/delivery-summary' },
      ],
    },
    {
      title: 'Integrations',
      items: [
        { label: 'Sender IDs', icon: Radio, href: '/app/sender-ids' },
        { label: 'Phone Gateway', icon: Smartphone, href: '/app/sms-gateway' },
        { label: 'API Keys', icon: Key, href: '/app/api-keys' },
        { label: 'Webhooks', icon: Webhook, href: '/app/webhooks' },
      ],
    },
    {
      title: 'Admin',
      items: [
        { label: 'Reports', icon: BarChart3, href: '/app/reports' },
        { label: 'Billing', icon: CreditCard, href: '/app/billing' },
        { label: 'Docs', icon: BookOpen, href: '/developers' },
        { label: 'Support', icon: HelpCircle, href: '/app/support' },
        { label: 'Settings', icon: Settings, href: '/app/settings' },
      ],
    },
  ]

  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('isAuthenticated')
      localStorage.removeItem('userEmail')
    }
    router.push('/auth/login')
  }

  const isActive = (href: string) => {
    return pathname === href || pathname?.startsWith(href + '/')
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Premium Sidebar */}
      <aside
        className={`${
          sidebarOpen ? 'w-[260px]' : 'w-[76px]'
        } bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 border-r border-slate-700/50 transition-all duration-300 flex flex-col hidden lg:flex shadow-xl relative shrink-0`}
      >
        {/* Brand Header */}
        <div className="p-4 border-b border-slate-700/50">
          <div className="flex items-center justify-between mb-4">
            {sidebarOpen ? (
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#0F766E] to-[#115E59] flex items-center justify-center shadow-lg">
                  <span className="text-white font-bold text-sm">S</span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-base text-white">TXTLINK</span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#0F766E]/20 text-[#0F766E] border border-[#0F766E]/30">
                      Enterprise
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#0F766E] to-[#115E59] flex items-center justify-center mx-auto shadow-lg">
                <span className="text-white font-bold text-sm">S</span>
              </div>
            )}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-1.5 hover:bg-slate-700/50 rounded-lg transition-colors text-slate-400 hover:text-white"
            >
              {sidebarOpen ? <ChevronRight size={16} /> : <Menu size={18} />}
            </button>
          </div>
          
          {/* Workspace Switcher */}
          {sidebarOpen && (
            <button className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700/50 transition-all group">
              <span className="text-xs font-medium text-slate-300">TXTLINK Workspace</span>
              <ChevronDown size={14} className="text-slate-400 group-hover:text-slate-300" />
            </button>
          )}
        </div>

        {/* Navigation Groups */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          {navGroups.map((group, groupIdx) => (
            <div key={groupIdx}>
              {sidebarOpen && (
                <div className="px-3 mb-2">
                  <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                    {group.title}
                  </span>
                </div>
              )}
              <div className="space-y-1">
                {group.items.map((item) => {
                  const active = isActive(item.href)
                  const IconComponent = item.icon
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 ${
                        active
                          ? 'bg-slate-800/80 text-white shadow-md shadow-black/20'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                      }`}
                    >
                      {/* Active indicator */}
                      {active && (
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-[#0F766E] rounded-r-full" />
                      )}
                      <IconComponent size={18} className={active ? 'text-[#0F766E]' : ''} />
                      {sidebarOpen && (
                        <>
                          <span className="text-sm font-medium flex-1">{item.label}</span>
                          {item.shortcut && (
                            <span className="text-[10px] text-slate-500 font-mono">
                              {item.shortcut}
                            </span>
                          )}
                        </>
                      )}
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Bottom Section */}
        <div className="p-3 space-y-3 border-t border-slate-700/50">
          {/* Usage Card */}
          {sidebarOpen && (
            <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-slate-400">SMS Credits</span>
                <TrendingUp size={12} className="text-[#0F766E]" />
              </div>
              <div className="text-lg font-bold text-white mb-1">12,450</div>
              <div className="text-[10px] text-slate-500 mb-3">98.2% delivery rate</div>
              <Button
                size="sm"
                className="w-full h-8 bg-[#0F766E] hover:bg-[#115E59] text-white text-xs font-medium rounded-lg"
              >
                <Plus size={12} className="mr-1.5" />
                Top up
              </Button>
            </div>
          )}

          {/* Support Status */}
          {sidebarOpen && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-800/30 border border-slate-700/30">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-medium text-slate-300">All systems operational</span>
            </div>
          )}

          {/* User Menu */}
          <div className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-slate-800/40 transition-colors cursor-pointer group">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#0F766E] to-[#115E59] flex items-center justify-center">
              <User size={16} className="text-white" />
            </div>
            {sidebarOpen && (
              <>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-white truncate">
                    {userEmail ? userEmail.split('@')[0] : 'Account'}
                  </div>
                  <div className="text-xs text-slate-400 truncate">Enterprise Plan</div>
                </div>
                <button
                  onClick={handleLogout}
                  className="p-1.5 hover:bg-slate-700/50 rounded-lg transition-colors text-slate-400 hover:text-white"
                  title="Sign out"
                >
                  <LogOut size={16} />
                </button>
              </>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Premium Topbar */}
        <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-slate-200/60 shadow-sm">
          <div className="px-3 sm:px-4 lg:px-6 py-2.5 sm:py-3 flex items-center justify-between gap-2 sm:gap-4">
            {/* Left: Mobile menu + Page title */}
            <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1 lg:flex-none">
              <button
                onClick={() => setMobileOpen(!mobileOpen)}
                className="lg:hidden p-2 hover:bg-slate-100 rounded-lg transition-colors shrink-0"
                aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
              >
                {mobileOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
              <div className="min-w-0 hidden sm:block lg:hidden xl:block">
                <h1 className="text-base sm:text-lg lg:text-xl font-semibold text-slate-900 truncate">
                  {activeSection || 'Dashboard'}
                </h1>
                <div className="text-xs text-slate-500 mt-0.5 truncate hidden md:block">Dashboard / Overview</div>
              </div>
            </div>

            {/* Center: Global Search */}
            <div className="hidden xl:flex flex-1 max-w-md mx-4">
              <button className="w-full flex items-center gap-3 px-4 py-2 rounded-xl bg-slate-100/80 hover:bg-slate-100 border border-slate-200/60 transition-all text-left group">
                <Search size={16} className="text-slate-400" />
                <span className="text-sm text-slate-600 flex-1">Search...</span>
                <span className="text-xs text-slate-400 font-mono bg-slate-200/60 px-1.5 py-0.5 rounded">
                  ⌘K
                </span>
              </button>
            </div>

            {/* Right: Actions + User */}
            <div className="flex items-center gap-1 sm:gap-2 shrink-0">
              {/* SMS Credits Widget */}
              <SmsCreditsWidget />
              
              {/* Notifications */}
              <button className="p-2 hover:bg-slate-100 rounded-lg transition-colors relative">
                <Bell size={18} className="text-slate-600" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
              </button>
              
              {/* User Avatar */}
              <button className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-100 rounded-xl transition-colors">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#0F766E] to-[#115E59] flex items-center justify-center">
                  <User size={16} className="text-white" />
                </div>
                <ChevronDown size={14} className="text-slate-600 hidden md:block" />
              </button>
            </div>
          </div>
        </header>

        {/* Mobile Menu Overlay */}
        {mobileOpen && (
          <>
            <div
              className="lg:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
              onClick={() => setMobileOpen(false)}
              aria-hidden="true"
            />
            <div className="lg:hidden fixed inset-y-0 left-0 z-50 w-[min(100vw-3rem,320px)] bg-white shadow-2xl flex flex-col overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b border-slate-200">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#0F766E] to-[#115E59] flex items-center justify-center">
                    <span className="text-white font-bold text-sm">S</span>
                  </div>
                  <span className="font-bold text-slate-900">TXTLINK</span>
                </div>
                <button
                  onClick={() => setMobileOpen(false)}
                  className="p-2 hover:bg-slate-100 rounded-lg"
                  aria-label="Close menu"
                >
                  <X size={20} />
                </button>
              </div>
              <nav className="flex-1 overflow-y-auto p-4 space-y-4">
                {navGroups.map((group, groupIdx) => (
                  <div key={groupIdx}>
                    <div className="px-3 mb-2">
                      <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                        {group.title}
                      </span>
                    </div>
                    <div className="space-y-1">
                      {group.items.map((item) => {
                        const active = isActive(item.href)
                        const IconComponent = item.icon
                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                              active
                                ? 'bg-[#0F766E] text-white shadow-md'
                                : 'hover:bg-slate-100 text-slate-700'
                            }`}
                            onClick={() => setMobileOpen(false)}
                          >
                            <IconComponent size={18} />
                            <span className="text-sm font-medium">{item.label}</span>
                          </Link>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </nav>
              <div className="p-4 border-t border-slate-200 space-y-3">
                <Link href="/app/billing/top-up" onClick={() => setMobileOpen(false)}>
                  <Button className="w-full bg-[#0F766E] hover:bg-[#115E59] text-white">
                    <Plus size={14} className="mr-2" />
                    Top up credits
                  </Button>
                </Link>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  <LogOut size={18} />
                  <span className="text-sm font-medium">Sign out</span>
                </button>
              </div>
            </div>
          </>
        )}

        {/* Page Content */}
        <main className="flex-1 p-3 sm:p-4 md:p-6 lg:p-8 overflow-x-hidden overflow-y-auto bg-[#F9FAFB]">
          <div className="max-w-7xl mx-auto w-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}

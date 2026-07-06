'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  BookOpen, 
  Rocket, 
  Send, 
  BarChart3, 
  Lock, 
  Radio, 
  Webhook,
  Code,
  Terminal,
  FileText,
  HelpCircle,
  Search,
  Menu,
  X,
  ChevronRight
} from 'lucide-react'

interface DocsLayoutProps {
  children: React.ReactNode
}

interface NavItem {
  title: string
  href: string
  icon?: React.ComponentType<{ className?: string }>
  children?: NavItem[]
}

const navigation: NavItem[] = [
  {
    title: 'Getting Started',
    icon: Rocket,
    children: [
      { title: 'Introduction', href: '/developers' },
      { title: 'Quick Start', href: '/developers/quick-start' },
      { title: 'Authentication', href: '/developers/authentication' },
      { title: 'API Keys', href: '/developers/api-keys' },
    ],
  },
  {
    title: 'Guides',
    icon: BookOpen,
    children: [
      { title: 'Webhooks', href: '/developers/guides/webhooks' },
    ],
  },
  {
    title: 'APIs',
    icon: Code,
    children: [
      { title: 'REST API', href: '/developers/api/rest' },
    ],
  },
  {
    title: 'SDKs',
    icon: Terminal,
    children: [
      { title: 'Node.js', href: '/developers/sdks/nodejs' },
    ],
  },
  {
    title: 'Reference',
    icon: FileText,
    children: [
      { title: 'Errors', href: '/developers/reference/errors' },
    ],
  },
]

export function DocsLayout({ children }: DocsLayoutProps) {
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setSidebarOpen(false)
  }, [pathname])

  const isActive = (href: string) => {
    if (href === '/developers') {
      return pathname === '/developers'
    }
    return pathname?.startsWith(href)
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:sticky top-0 left-0 z-50
          w-64 h-screen bg-white border-r border-slate-200
          overflow-y-auto
          transform transition-transform duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0
        `}
      >
        <div className="p-4 border-b border-slate-200 lg:hidden">
          <div className="flex items-center justify-between">
            <Link href="/" className="text-xl font-bold text-teal-600">
              TXTLINK
            </Link>
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-2 hover:bg-slate-100 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-4">
          {/* Search Bar */}
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search docs (⌘K)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-slate-50"
            />
          </div>

          {/* Navigation */}
          <nav className="space-y-1">
            {navigation.map((section) => {
              const SectionIcon = section.icon
              return (
                <div key={section.title} className="mb-6">
                  <div className="flex items-center gap-2 px-3 py-2 mb-2">
                    {SectionIcon && (
                      <SectionIcon className="w-4 h-4 text-slate-500" />
                    )}
                    <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      {section.title}
                    </h3>
                  </div>
                  <ul className="space-y-0.5">
                    {section.children?.map((item) => {
                      const active = isActive(item.href)
                      return (
                        <li key={item.href}>
                          <Link
                            href={item.href}
                            className={`
                              flex items-center gap-2 px-3 py-2 rounded-lg text-sm
                              transition-colors
                              ${
                                active
                                  ? 'bg-teal-50 text-teal-700 font-medium'
                                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                              }
                            `}
                          >
                            <ChevronRight
                              className={`w-3 h-3 transition-transform ${
                                active ? 'opacity-100' : 'opacity-0'
                              }`}
                            />
                            <span>{item.title}</span>
                          </Link>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              )
            })}
          </nav>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-sm border-b border-slate-200">
          <div className="px-4 lg:px-8 py-4 flex items-center justify-between">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 hover:bg-slate-100 rounded-lg"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex-1" />
            <Link
              href="/"
              className="text-lg font-bold text-teal-600 hover:text-teal-700"
            >
              TXTLINK
            </Link>
            <div className="flex-1" />
            <Link
              href="/auth/login"
              className="hidden md:block px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900"
            >
              Sign In
            </Link>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto px-4 lg:px-8 py-8 lg:py-12">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}


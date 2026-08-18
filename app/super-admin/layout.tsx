'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  LayoutDashboard,
  Users,
  DollarSign,
  PiggyBank,
  UserCog,
  BarChart3,
  FileText,
  Shield,
  LogOut,
  Menu,
  X,
  Settings,
  CheckCircle2,
  Calendar,
  RefreshCw,
  Bell,
  ChevronDown,
  CreditCard,
  Activity,
  HeartPulse,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Separator } from '@/components/ui/separator'
import { setupFetchInterceptor } from '@/lib/utils/fetch-interceptor'

type NavItem = {
  href: string
  label: string
  icon: typeof LayoutDashboard
  id: string
}

type NavSection = {
  id: string
  label: string | null
  items: NavItem[]
}

const NAV_SECTIONS: NavSection[] = [
  {
    id: 'workspace',
    label: null,
    items: [
      { id: 'dashboard', href: '/super-admin', label: 'Dashboard', icon: LayoutDashboard },
      { id: 'accounts', href: '/super-admin/accounts', label: 'Accounts', icon: Users },
      { id: 'sender-apps', href: '/super-admin/sender-id-applications', label: 'Sender ID Applications', icon: FileText },
      { id: 'pricing', href: '/super-admin/pricing', label: 'Pricing', icon: DollarSign },
      { id: 'sender-id-ad', href: '/super-admin/sender-id-ad', label: 'Sender ID Ad', icon: CheckCircle2 },
    ],
  },
  {
    id: 'finances',
    label: 'Finances',
    items: [
      { id: 'profit', href: '/super-admin/profit', label: 'Profit', icon: PiggyBank },
      { id: 'mpesa', href: '/super-admin/mpesa-transactions', label: 'M-Pesa Payments', icon: CreditCard },
    ],
  },
  {
    id: 'operations',
    label: 'Operations',
    items: [
      { id: 'analytics', href: '/super-admin/analytics', label: 'Analytics', icon: BarChart3 },
      { id: 'queue', href: '/super-admin/queue-status', label: 'Queue Status', icon: Activity },
      { id: 'audit', href: '/super-admin/audit', label: 'Audit Logs', icon: FileText },
      { id: 'health', href: '/super-admin/queue-status?tab=health', label: 'System Health', icon: HeartPulse },
    ],
  },
  {
    id: 'settings',
    label: 'Settings',
    items: [
      { id: 'settings', href: '/super-admin/settings', label: 'Platform Settings', icon: Settings },
      { id: 'super-admins', href: '/super-admin/super-admins', label: 'Permissions', icon: UserCog },
    ],
  },
]

const NAV_ITEMS: NavItem[] = NAV_SECTIONS.flatMap((section) => section.items)

function isNavItemActive(item: NavItem, pathname: string, tab: string | null): boolean {
  if (item.id === 'health') {
    return (
      pathname === '/super-admin/system-health' ||
      (pathname === '/super-admin/queue-status' && tab === 'health')
    )
  }
  if (item.id === 'queue') {
    return pathname === '/super-admin/queue-status' && tab !== 'health'
  }
  if (item.href === '/super-admin') {
    return pathname === '/super-admin'
  }
  return pathname === item.href || pathname?.startsWith(`${item.href}/`)
}

function getBreadcrumb(pathname: string, tab: string | null): string {
  if (pathname === '/super-admin/system-health') return 'System Health'
  if (pathname === '/super-admin/queue-status' && tab === 'health') return 'System Health'
  if (pathname === '/super-admin/queue-status') return 'Queue Status'
  const item = NAV_ITEMS.find((nav) => nav.id !== 'health' && nav.id !== 'queue' && isNavItemActive(nav, pathname, tab))
  return item?.label ?? 'Dashboard / Overview'
}

function SuperAdminLayoutContent({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const tab = searchParams.get('tab')
  const [authorized, setAuthorized] = useState(false)
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setupFetchInterceptor()
    }
  }, [])

  useEffect(() => {
    const token = localStorage.getItem('token')
    const userStr = localStorage.getItem('user')

    if (!token || !userStr) {
      router.push('/auth/login')
      return
    }

    try {
      const parsedUser = JSON.parse(userStr)
      setUser(parsedUser)

      if (!parsedUser.isOwner) {
        if (parsedUser.role === 'admin') {
          router.push('/admin/users')
        } else {
          router.push('/app/dashboard')
        }
        return
      }

      fetch('/api/super-admin/dashboard', {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => {
          if (res.ok) {
            setAuthorized(true)
          } else if (parsedUser.role === 'admin') {
            router.push('/admin/users')
          } else {
            router.push('/app/dashboard')
          }
        })
        .catch(() => {
          router.push('/auth/login')
        })
        .finally(() => {
          setLoading(false)
        })
    } catch {
      router.push('/auth/login')
      setLoading(false)
    }
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <Shield className="w-12 h-12 text-emerald-600 mx-auto mb-4 animate-pulse" />
          <p className="text-slate-600">Verifying owner access...</p>
        </div>
      </div>
    )
  }

  if (!authorized) {
    return null
  }

  const renderNavLink = (item: NavItem, onNavigate?: () => void) => {
    const Icon = item.icon
    const isActive = isNavItemActive(item, pathname, tab)
    return (
      <Link
        key={item.id}
        href={item.href}
        onClick={onNavigate}
        className={`group flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
          isActive
            ? 'bg-emerald-50 text-emerald-700 font-medium border-l-4 border-emerald-600'
            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
        }`}
      >
        <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-emerald-600' : 'text-slate-500'}`} />
        {(!onNavigate ? sidebarOpen : true) && <span className="text-sm">{item.label}</span>}
      </Link>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-50 bg-white border-b border-slate-200/70 backdrop-blur-sm">
        <div className="h-16 flex items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-sm font-semibold text-slate-900">Super Admin</h1>
                <p className="text-xs text-slate-500">Owner Portal</p>
              </div>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-2 text-sm text-slate-600">
            <span className="font-medium">{getBreadcrumb(pathname, tab)}</span>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/super-admin/queue-status?tab=health"
              className="hidden md:inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:bg-emerald-50 hover:text-emerald-800 hover:border-emerald-200 transition-colors"
            >
              <HeartPulse className="w-4 h-4" />
              System Health
            </Link>

            <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-lg border border-slate-200/70">
              <Calendar className="w-4 h-4 text-slate-500" />
              <span className="text-sm text-slate-700">Last 7 days</span>
              <ChevronDown className="w-4 h-4 text-slate-400" />
            </div>

            <button
              onClick={() => window.location.reload()}
              className="hidden md:flex items-center justify-center px-4 py-2.5 bg-white border border-slate-200 rounded-xl shadow-sm text-slate-700 hover:bg-slate-100"
            >
              <RefreshCw className="w-4 h-4 text-slate-500" />
            </button>

            <Button variant="ghost" size="sm" className="relative">
              <Bell className="w-4 h-4" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-emerald-600 rounded-full" />
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="group flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-slate-100">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center ring-1 ring-slate-200">
                    <span className="text-xs font-semibold text-emerald-700">
                      {user?.name?.charAt(0).toUpperCase() || 'A'}
                    </span>
                  </div>
                  <ChevronDown className="w-4 h-4 text-slate-500" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[240px] bg-white border border-slate-200 rounded-xl shadow-xl p-2">
                <div className="px-3 py-3">
                  <p className="text-sm font-semibold text-slate-900">Super Admin</p>
                  <p className="text-xs text-slate-500 mt-0.5">{user?.email || 'admin@signalhub.com'}</p>
                </div>
                <div className="border-t border-slate-200 my-1" />
                <div className="space-y-1">
                  <DropdownMenuItem
                    className="flex items-center gap-3 px-4 py-2.5 rounded-lg cursor-pointer"
                    onClick={() => router.push('/super-admin/queue-status?tab=health')}
                  >
                    <HeartPulse className="w-4 h-4 text-slate-500" />
                    <span>System Health</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="flex items-center gap-3 px-4 py-2.5 rounded-lg cursor-pointer"
                    onClick={() => router.push('/super-admin/settings')}
                  >
                    <Settings className="w-4 h-4 text-slate-500" />
                    <span>Platform Settings</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="flex items-center gap-3 px-4 py-2.5 rounded-lg cursor-pointer"
                    onClick={() => router.push('/super-admin/super-admins')}
                  >
                    <UserCog className="w-4 h-4 text-slate-500" />
                    <span>Permissions</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      localStorage.removeItem('token')
                      localStorage.removeItem('user')
                      router.push('/auth/login')
                    }}
                    className="flex items-center gap-3 px-4 py-2.5 rounded-lg cursor-pointer text-red-600"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Logout</span>
                  </DropdownMenuItem>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <div className="flex">
        <aside
          className={`${
            sidebarOpen ? 'w-64' : 'w-20'
          } hidden lg:block bg-white border-r border-slate-200/70 min-h-[calc(100vh-4rem)] transition-all duration-300`}
        >
          <div className="h-full flex flex-col">
            <div className="p-4 border-b border-slate-200/70">
              <div className="flex items-center justify-between">
                {sidebarOpen && (
                  <div>
                    <p className="text-xs font-semibold text-slate-900 uppercase tracking-wider">Workspace</p>
                    <p className="text-sm text-slate-600 mt-0.5">Owner</p>
                  </div>
                )}
                <button
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  {sidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <nav className="flex-1 p-3 space-y-4 overflow-y-auto">
              {NAV_SECTIONS.map((section) => (
                <div key={section.id} className="space-y-1">
                  {section.label && sidebarOpen && (
                    <p className="px-3 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                      {section.label}
                    </p>
                  )}
                  {section.label && !sidebarOpen && <div className="mx-2 border-t border-slate-200" />}
                  {section.items.map((item) => renderNavLink(item))}
                </div>
              ))}
            </nav>

            {sidebarOpen && (
              <div className="p-4 border-t border-slate-200/70">
                <p className="text-xs text-slate-500 text-center">© TXTLINK</p>
              </div>
            )}
          </div>
        </aside>

        {mobileMenuOpen && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <div className="fixed inset-0 bg-black/50" onClick={() => setMobileMenuOpen(false)} />
            <div className="fixed left-0 top-16 bottom-0 w-64 bg-white border-r border-slate-200/70 overflow-y-auto">
              <div className="p-4 space-y-4">
                {NAV_SECTIONS.map((section) => (
                  <div key={section.id} className="space-y-1">
                    {section.label && (
                      <p className="px-3 pt-1 pb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                        {section.label}
                      </p>
                    )}
                    {section.items.map((item) => renderNavLink(item, () => setMobileMenuOpen(false)))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <main className="flex-1 min-h-[calc(100vh-4rem)]">{children}</main>
      </div>
    </div>
  )
}

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
          <Shield className="w-12 h-12 text-emerald-600 animate-pulse" />
        </div>
      }
    >
      <SuperAdminLayoutContent>{children}</SuperAdminLayoutContent>
    </Suspense>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import {
  LayoutDashboard,
  Users,
  DollarSign,
  BarChart3,
  FileText,
  Shield,
  LogOut,
  Menu,
  X,
  ChevronRight,
  Settings,
  CheckCircle2,
  Calendar,
  RefreshCw,
  Bell,
  ChevronDown,
  CreditCard,
  Activity,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { setupFetchInterceptor } from '@/lib/utils/fetch-interceptor'

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [authorized, setAuthorized] = useState(false)
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [user, setUser] = useState<any>(null)

  // Setup global fetch interceptor to handle 401 responses
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setupFetchInterceptor()
    }
  }, [])

  useEffect(() => {
    // Check if user is owner
    const token = localStorage.getItem('token')
    const userStr = localStorage.getItem('user')
    
    if (!token || !userStr) {
      router.push('/auth/login')
      return
    }

    try {
      const parsedUser = JSON.parse(userStr)
      setUser(parsedUser)
      
      // Check if user is owner from stored data
      if (!parsedUser.isOwner) {
        // Not owner - redirect to appropriate page
        if (parsedUser.role === 'admin') {
          router.push('/admin/users')
        } else {
          router.push('/app/dashboard')
        }
        return
      }

      // Verify owner access with API
      fetch('/api/super-admin/dashboard', {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => {
          if (res.ok) {
            setAuthorized(true)
          } else {
            // API says not owner - redirect
            if (parsedUser.role === 'admin') {
              router.push('/admin/users')
            } else {
              router.push('/app/dashboard')
            }
          }
        })
        .catch(() => {
          router.push('/auth/login')
        })
        .finally(() => {
          setLoading(false)
        })
    } catch (error) {
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

  const navItems = [
    { href: '/super-admin', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/super-admin/accounts', label: 'Accounts', icon: Users },
    { href: '/super-admin/pricing', label: 'Pricing', icon: DollarSign },
    { href: '/super-admin/mpesa-transactions', label: 'M-Pesa Transactions', icon: CreditCard },
    { href: '/super-admin/analytics', label: 'Analytics', icon: BarChart3 },
    { href: '/super-admin/queue-status', label: 'Queue Status', icon: Activity },
    { href: '/super-admin/audit', label: 'Audit Logs', icon: FileText },
    { href: '/super-admin/settings', label: 'Settings', icon: Settings },
  ]

  const getBreadcrumb = () => {
    const item = navItems.find((item) => pathname === item.href || pathname?.startsWith(item.href + '/'))
    if (item) {
      if (pathname === item.href) {
        return item.label
      }
      const subPath = pathname?.replace(item.href + '/', '')
      return `${item.label} / ${subPath.charAt(0).toUpperCase() + subPath.slice(1)}`
    }
    return 'Dashboard / Overview'
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top Navbar - Sticky */}
      <header className="sticky top-0 z-50 bg-white border-b border-slate-200/70 backdrop-blur-sm">
        <div className="h-16 flex items-center justify-between px-6">
          {/* Left: Brand + Mobile Menu */}
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

          {/* Middle: Breadcrumb */}
          <div className="hidden md:flex items-center gap-2 text-sm text-slate-600">
            <span className="font-medium">{getBreadcrumb()}</span>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-3">
            {/* Date Range Picker (Placeholder) */}
            <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-lg border border-slate-200/70">
              <Calendar className="w-4 h-4 text-slate-500" />
              <span className="text-sm text-slate-700">Last 7 days</span>
              <ChevronDown className="w-4 h-4 text-slate-400" />
            </div>

            {/* Refresh Button */}
            <button
              onClick={() => window.location.reload()}
              className="hidden md:flex items-center justify-center px-4 py-2.5 bg-white border border-slate-200 rounded-xl shadow-sm text-slate-700 hover:bg-slate-100 hover:text-slate-900 active:scale-95 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 transition-all duration-200"
            >
              <RefreshCw className="w-4 h-4 text-slate-500" />
            </button>

            {/* Notifications */}
            <Button variant="ghost" size="sm" className="relative">
              <Bell className="w-4 h-4" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-emerald-600 rounded-full"></span>
            </Button>

            {/* Profile Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="group flex items-center gap-2 px-3 py-2 rounded-xl transition-colors hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center ring-1 ring-slate-200">
                    <span className="text-xs font-semibold text-emerald-700">
                      {user?.name?.charAt(0).toUpperCase() || 'A'}
                    </span>
                  </div>
                  <ChevronDown className="w-4 h-4 text-slate-500 transition-colors group-hover:text-slate-700" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent 
                align="end" 
                className="w-[240px] bg-white border border-slate-200 rounded-xl shadow-xl p-2 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 duration-150"
              >
                {/* Header Section */}
                <div className="px-3 py-3">
                  <p className="text-sm font-semibold text-slate-900">Super Admin</p>
                  <p className="text-xs text-slate-500 mt-0.5">{user?.email || 'admin@signalhub.com'}</p>
                </div>
                <div className="border-t border-slate-200 my-1" />

                {/* Menu Items */}
                <div className="space-y-1">
                  <DropdownMenuItem
                    className="flex items-center gap-3 px-4 py-2.5 rounded-lg cursor-pointer text-slate-700 hover:bg-slate-100 hover:text-slate-900 focus:bg-slate-100 focus:text-slate-900 transition-colors group"
                    onClick={() => router.push('/super-admin/settings')}
                  >
                    <Settings className="w-4 h-4 text-slate-500 group-hover:text-slate-900 transition-colors" />
                    <span>Settings</span>
                  </DropdownMenuItem>
                  
                  <DropdownMenuItem
                    onClick={() => {
                      localStorage.removeItem('token')
                      localStorage.removeItem('user')
                      router.push('/auth/login')
                    }}
                    className="flex items-center gap-3 px-4 py-2.5 rounded-lg cursor-pointer text-slate-700 hover:bg-red-50 hover:text-red-600 focus:bg-red-50 focus:text-red-600 transition-colors group"
                  >
                    <LogOut className="w-4 h-4 text-slate-500 group-hover:text-red-600 transition-colors" />
                    <span>Logout</span>
                  </DropdownMenuItem>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside
          className={`${
            sidebarOpen ? 'w-64' : 'w-20'
          } hidden lg:block bg-white border-r border-slate-200/70 min-h-[calc(100vh-4rem)] transition-all duration-300`}
        >
          <div className="h-full flex flex-col">
            {/* Workspace Header */}
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

            {/* Navigation */}
            <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
              {navItems.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href || (item.href !== '/super-admin' && pathname?.startsWith(item.href))
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`group flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                      isActive
                        ? 'bg-emerald-50 text-emerald-700 font-medium border-l-4 border-emerald-600'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-emerald-600' : 'text-slate-500'}`} />
                    {sidebarOpen && <span className="text-sm">{item.label}</span>}
                  </Link>
                )
              })}
            </nav>

            {/* System Status Footer */}
            {sidebarOpen && (
              <div className="p-4 border-t border-slate-200/70 space-y-3">
                <div>
                  <p className="text-xs font-semibold text-slate-900 uppercase tracking-wider mb-2">System Status</p>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-600">API</span>
                      <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        OK
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-600">Webhook</span>
                      <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        OK
                      </Badge>
                    </div>
                  </div>
                </div>
                <Separator />
                <p className="text-xs text-slate-500 text-center">© TXTLINK</p>
              </div>
            )}
          </div>
        </aside>

        {/* Mobile Sidebar */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <div className="fixed inset-0 bg-black/50" onClick={() => setMobileMenuOpen(false)} />
            <div className="fixed left-0 top-16 bottom-0 w-64 bg-white border-r border-slate-200/70 overflow-y-auto">
              <div className="p-4 space-y-1">
                {navItems.map((item) => {
                  const Icon = item.icon
                  const isActive = pathname === item.href || (item.href !== '/super-admin' && pathname?.startsWith(item.href))
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                        isActive
                          ? 'bg-emerald-50 text-emerald-700 font-medium border-l-4 border-emerald-600'
                          : 'text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="text-sm">{item.label}</span>
                    </Link>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* Main Content */}
        <main className="flex-1 min-h-[calc(100vh-4rem)]">{children}</main>
      </div>
    </div>
  )
}

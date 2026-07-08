'use client'

import { PortalLayout } from '@/components/portal-layout'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  User,
  Bell,
  Shield,
  Globe,
  CreditCard,
  Key,
  ArrowRight,
  Eye,
  EyeOff,
} from 'lucide-react'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

const fieldClass =
  'w-full h-11 px-4 py-3 border border-[#CBD5E1] rounded-xl bg-white text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#2F9B73]/20 focus:border-[#2F9B73] disabled:bg-[#F1F5F9] disabled:text-[#94A3B8] disabled:border-[#E2E8F0] disabled:cursor-not-allowed'

const contentCardClass =
  'p-4 sm:p-6 bg-white border border-[#E2E8F0] shadow-sm rounded-[18px] w-full max-w-full min-w-0'

const notificationItems = [
  {
    title: 'Email notifications',
    description: 'Receive account updates by email',
  },
  {
    title: 'SMS alerts',
    description: 'Receive important SMS gateway alerts',
  },
  {
    title: 'Push notifications',
    description: 'Receive browser/device notifications',
  },
  {
    title: 'Weekly reports',
    description: 'Get a weekly performance summary',
  },
]

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('profile')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [userProfile, setUserProfile] = useState<any>(null)
  
  // Profile form state
  const [profileForm, setProfileForm] = useState({
    name: '',
    email: '',
    phone: '',
  })

  // Password form state
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })

  // Password visibility state
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  })

  // Fetch user profile
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true)
        const token = localStorage.getItem('token')
        const response = await fetch('/api/user/profile', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (response.ok) {
          const data = await response.json()
          setUserProfile(data.user)
          setProfileForm({
            name: data.user.name || '',
            email: data.user.email || '',
            phone: data.user.phone || '',
          })
        }
      } catch (error) {
        console.error('Failed to fetch profile:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchProfile()
  }, [])

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'billing', label: 'Billing', icon: CreditCard },
    { id: 'preferences', label: 'Preferences', icon: Globe },
  ]

  // Handle profile update
  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: profileForm.name,
          phone: profileForm.phone,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setUserProfile(data.user)
        alert('Profile updated successfully!')
      } else {
        alert(data.error || 'Failed to update profile')
      }
    } catch (error) {
      console.error('Failed to update profile:', error)
      alert('Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  // Handle password update
  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      alert('New passwords do not match')
      return
    }

    if (passwordForm.newPassword.length < 8) {
      alert('Password must be at least 8 characters long')
      return
    }

    setSaving(true)
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/user/password', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        alert('Password updated successfully!')
        setPasswordForm({
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        })
      } else {
        alert(data.error || 'Failed to update password')
      }
    } catch (error) {
      console.error('Failed to update password:', error)
      alert('Failed to update password')
    } finally {
      setSaving(false)
    }
  }

  return (
    <PortalLayout activeSection="Settings">
      <div className="space-y-4 md:space-y-6 w-full max-w-full min-w-0">
        {/* Header */}
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-semibold text-[#0F172A] mb-1 sm:mb-2">Settings</h1>
          <p className="text-sm text-[#64748B]">Manage your account settings and preferences</p>
        </div>

        {/* Mobile: 2-column settings category grid */}
        <div className="md:hidden grid grid-cols-2 gap-3 w-full min-w-0">
          {tabs.map((tab) => {
            const IconComponent = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex min-h-[48px] w-full min-w-0 items-center gap-2 rounded-[14px] border p-3 text-left transition-all',
                  isActive
                    ? 'border-[#2F9B73] bg-[#ECFDF5] text-[#047857]'
                    : 'border-[#E2E8F0] bg-white text-[#334155] hover:bg-[#F8FAFC]'
                )}
              >
                <IconComponent
                  size={18}
                  className={cn('shrink-0', isActive ? 'text-[#2F9B73]' : 'text-[#64748B]')}
                />
                <span className="text-sm font-medium leading-tight break-words">{tab.label}</span>
              </button>
            )
          })}
        </div>

        <div className="grid md:grid-cols-12 gap-4 md:gap-6 min-w-0">
          {/* Desktop: sidebar navigation */}
          <div className="hidden md:block md:col-span-3 min-w-0">
            <Card className="p-3 sm:p-4 bg-white border border-[#E2E8F0] shadow-sm rounded-2xl">
              <h3 className="text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-4 px-2">
                Settings
              </h3>
              <nav className="flex flex-col gap-1">
                {tabs.map((tab) => {
                  const IconComponent = tab.icon
                  const isActive = activeTab === tab.id
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id)}
                      className={cn(
                        'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all relative',
                        isActive
                          ? 'bg-[#ECFDF5] text-[#047857]'
                          : 'text-[#64748B] hover:bg-[#F8FAFC]'
                      )}
                    >
                      {isActive && (
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-[#2F9B73] rounded-r-full" />
                      )}
                      <IconComponent
                        size={18}
                        className={isActive ? 'text-[#2F9B73]' : 'text-[#64748B]'}
                      />
                      <span className="font-medium text-sm">{tab.label}</span>
                    </button>
                  )
                })}
              </nav>
            </Card>
          </div>

          {/* Settings content */}
          <div className="md:col-span-9 min-w-0 w-full">
            {activeTab === 'profile' && (
              <Card className={contentCardClass}>
                <div className="flex items-start gap-3 sm:gap-4 mb-5 sm:mb-6 min-w-0">
                  <div className="p-2.5 sm:p-3 rounded-xl bg-[#ECFDF5] text-[#2F9B73] shrink-0">
                    <User size={20} />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-lg font-semibold text-[#0F172A]">Profile</h2>
                    <p className="text-sm text-[#64748B]">Update your personal information</p>
                  </div>
                </div>
                {loading ? (
                  <div className="text-center py-8 text-[#64748B]">Loading profile...</div>
                ) : (
                  <form onSubmit={handleProfileUpdate} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-[#0F172A] mb-1.5">Full Name</label>
                      <input
                        type="text"
                        value={profileForm.name}
                        onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                        className={fieldClass}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#0F172A] mb-1.5">Email</label>
                      <input
                        type="email"
                        value={profileForm.email}
                        disabled
                        className={fieldClass}
                      />
                      <p className="text-xs text-[#64748B] mt-1">Email cannot be changed</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#0F172A] mb-1.5">Phone Number</label>
                      <input
                        type="tel"
                        value={profileForm.phone}
                        onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                        className={fieldClass}
                        placeholder="+254712345678"
                      />
                    </div>
                    <Button
                      type="submit"
                      disabled={saving}
                      className="w-full sm:w-auto h-11 bg-[#2F9B73] hover:bg-[#267D5E] text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {saving ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </form>
                )}
              </Card>
            )}

            {activeTab === 'notifications' && (
              <Card className={contentCardClass}>
                <div className="flex items-start gap-3 sm:gap-4 mb-5 sm:mb-6 min-w-0">
                  <div className="p-2.5 sm:p-3 rounded-xl bg-[#ECFDF5] text-[#2F9B73] shrink-0">
                    <Bell size={20} />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-lg font-semibold text-[#0F172A]">Notifications</h2>
                    <p className="text-sm text-[#64748B]">Configure how you receive notifications</p>
                  </div>
                </div>
                <div className="space-y-2.5">
                  {notificationItems.map((item) => (
                    <div
                      key={item.title}
                      className="flex items-start justify-between gap-3 p-3.5 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] min-w-0"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-[#0F172A] text-sm">{item.title}</p>
                        <p className="text-xs text-[#64748B] mt-0.5 leading-relaxed break-words">
                          {item.description}
                        </p>
                      </div>
                      <label className="relative inline-flex shrink-0 items-center cursor-pointer mt-0.5">
                        <input type="checkbox" className="sr-only peer" defaultChecked />
                        <div className="w-11 h-6 bg-[#CBD5E1] peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#2F9B73]/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-[#E2E8F0] after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#2F9B73]" />
                      </label>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {activeTab === 'security' && (
              <div className="space-y-4 md:space-y-6 min-w-0">
                <Card className={contentCardClass}>
                  <div className="flex items-start gap-3 sm:gap-4 mb-5 sm:mb-6 min-w-0">
                    <div className="p-2.5 sm:p-3 rounded-xl bg-[#ECFDF5] text-[#2F9B73] shrink-0">
                      <Shield size={20} />
                    </div>
                    <div className="min-w-0">
                      <h2 className="text-lg font-semibold text-[#0F172A]">Security</h2>
                      <p className="text-sm text-[#64748B]">Manage your account security</p>
                    </div>
                  </div>
                  <form onSubmit={handlePasswordUpdate} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-[#0F172A] mb-1.5">Current Password</label>
                      <div className="relative">
                        <input
                          type={showPasswords.current ? 'text' : 'password'}
                          value={passwordForm.currentPassword}
                          onChange={(e) =>
                            setPasswordForm({ ...passwordForm, currentPassword: e.target.value })
                          }
                          className={cn(fieldClass, 'pr-12')}
                          required
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setShowPasswords({ ...showPasswords, current: !showPasswords.current })
                          }
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-[#0F172A] transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center"
                          aria-label={showPasswords.current ? 'Hide password' : 'Show password'}
                        >
                          {showPasswords.current ? <EyeOff size={20} /> : <Eye size={20} />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#0F172A] mb-1.5">New Password</label>
                      <div className="relative">
                        <input
                          type={showPasswords.new ? 'text' : 'password'}
                          value={passwordForm.newPassword}
                          onChange={(e) =>
                            setPasswordForm({ ...passwordForm, newPassword: e.target.value })
                          }
                          className={cn(fieldClass, 'pr-12')}
                          required
                          minLength={8}
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setShowPasswords({ ...showPasswords, new: !showPasswords.new })
                          }
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-[#0F172A] transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center"
                          aria-label={showPasswords.new ? 'Hide password' : 'Show password'}
                        >
                          {showPasswords.new ? <EyeOff size={20} /> : <Eye size={20} />}
                        </button>
                      </div>
                      <p className="text-xs text-[#64748B] mt-1">Must be at least 8 characters long</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#0F172A] mb-1.5">
                        Confirm New Password
                      </label>
                      <div className="relative">
                        <input
                          type={showPasswords.confirm ? 'text' : 'password'}
                          value={passwordForm.confirmPassword}
                          onChange={(e) =>
                            setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })
                          }
                          className={cn(fieldClass, 'pr-12')}
                          required
                          minLength={8}
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })
                          }
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-[#0F172A] transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center"
                          aria-label={showPasswords.confirm ? 'Hide password' : 'Show password'}
                        >
                          {showPasswords.confirm ? <EyeOff size={20} /> : <Eye size={20} />}
                        </button>
                      </div>
                    </div>
                    <Button
                      type="submit"
                      disabled={saving}
                      className="w-full sm:w-auto h-11 bg-[#2F9B73] hover:bg-[#267D5E] text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {saving ? 'Updating...' : 'Update Password'}
                    </Button>
                  </form>
                </Card>

                <Card className={contentCardClass}>
                  <div className="flex flex-col gap-4 min-w-0">
                    <div className="flex items-start gap-3 sm:gap-4 min-w-0">
                      <div className="p-2.5 sm:p-3 rounded-xl bg-[#F8FAFC] text-[#64748B] shrink-0">
                        <Key size={20} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-semibold text-[#0F172A]">API Keys</h3>
                        <p className="text-sm text-[#64748B]">
                          Manage your API keys for programmatic access
                        </p>
                      </div>
                    </div>
                    <Link href="/app/api-keys" className="w-full">
                      <Button
                        variant="outline"
                        className="w-full h-11 border-[#E2E8F0] text-[#334155] hover:bg-[#ECFDF5] hover:border-[#2F9B73] hover:text-[#047857] rounded-xl"
                      >
                        Manage Keys
                        <ArrowRight size={16} className="ml-2" />
                      </Button>
                    </Link>
                  </div>
                </Card>
              </div>
            )}

            {activeTab === 'billing' && (
              <Card className={contentCardClass}>
                <div className="flex items-start gap-3 sm:gap-4 mb-5 sm:mb-6 min-w-0">
                  <div className="p-2.5 sm:p-3 rounded-xl bg-[#ECFDF5] text-[#2F9B73] shrink-0">
                    <CreditCard size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-lg font-semibold text-[#0F172A]">Billing</h2>
                    <p className="text-sm text-[#64748B]">
                      Manage your balance, invoices, and payment methods
                    </p>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 mt-2">
                  <Link href="/app/billing" className="w-full sm:w-auto">
                    <Button className="w-full sm:w-auto h-11 bg-[#2F9B73] hover:bg-[#267D5E] text-white rounded-xl">
                      Go to Billing
                      <ArrowRight size={16} className="ml-2" />
                    </Button>
                  </Link>
                  <Button
                    variant="outline"
                    className="w-full sm:w-auto h-11 border-[#E2E8F0] text-[#334155] hover:bg-[#F8FAFC] rounded-xl"
                  >
                    View Pricing
                  </Button>
                </div>
              </Card>
            )}

            {activeTab === 'preferences' && (
              <Card className={contentCardClass}>
                <div className="flex items-start gap-3 sm:gap-4 mb-5 sm:mb-6 min-w-0">
                  <div className="p-2.5 sm:p-3 rounded-xl bg-[#F8FAFC] text-[#64748B] shrink-0">
                    <Globe size={20} />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-lg font-semibold text-[#0F172A]">Preferences</h2>
                    <p className="text-sm text-[#64748B]">Customize your experience</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="rounded-xl border border-[#E2E8F0] p-4 sm:p-5 bg-[#F8FAFC]">
                    <h3 className="text-base font-semibold text-[#0F172A] mb-1">SMS History Retention</h3>
                    <p className="text-sm text-[#64748B] mb-4">
                      This controls how many SMS history records are kept in your account. When the
                      limit is exceeded, the oldest records are automatically removed.
                    </p>
                    <div className="space-y-3">
                      <label className="block text-sm font-medium text-[#0F172A]">
                        Maximum SMS history records to keep
                      </label>
                      <select
                        value={
                          userProfile?.smsHistoryRetentionLimit === null
                            ? 'unlimited'
                            : String(userProfile?.smsHistoryRetentionLimit ?? 10000)
                        }
                        onChange={(e) => {
                          const value = e.target.value
                          setUserProfile((prev: any) => ({
                            ...prev,
                            smsHistoryRetentionLimit:
                              value === 'unlimited' ? null : parseInt(value, 10),
                          }))
                        }}
                        className={fieldClass}
                      >
                        <option value="1000">1,000</option>
                        <option value="5000">5,000</option>
                        <option value="10000">10,000 (default)</option>
                        <option value="25000">25,000</option>
                        <option value="50000">50,000</option>
                        <option value="100000">100,000</option>
                        <option value="unlimited">Unlimited</option>
                      </select>
                      <div>
                        <label className="block text-sm font-medium text-[#0F172A] mb-1.5">
                          Custom limit (optional)
                        </label>
                        <input
                          type="number"
                          min={1000}
                          max={1000000}
                          placeholder="Enter custom number"
                          value={
                            userProfile?.smsHistoryRetentionLimit &&
                            ![1000, 5000, 10000, 25000, 50000, 100000].includes(
                              userProfile.smsHistoryRetentionLimit
                            )
                              ? userProfile.smsHistoryRetentionLimit
                              : ''
                          }
                          onChange={(e) => {
                            const raw = e.target.value
                            setUserProfile((prev: any) => ({
                              ...prev,
                              smsHistoryRetentionLimit: raw ? parseInt(raw, 10) : 10000,
                            }))
                          }}
                          className={fieldClass}
                        />
                      </div>
                      <p className="text-xs text-[#F59E0B] bg-[#FFFBEB] border border-[#FDE68A] rounded-lg px-3 py-2">
                        Deleting old SMS history is permanent unless you export CSV first.
                      </p>
                      <Button
                        type="button"
                        disabled={saving}
                        onClick={async () => {
                          setSaving(true)
                          try {
                            const token = localStorage.getItem('token')
                            const response = await fetch('/api/user/profile', {
                              method: 'PATCH',
                              headers: {
                                'Content-Type': 'application/json',
                                Authorization: `Bearer ${token}`,
                              },
                              body: JSON.stringify({
                                smsHistoryRetentionLimit:
                                  userProfile?.smsHistoryRetentionLimit === null
                                    ? 'unlimited'
                                    : userProfile?.smsHistoryRetentionLimit ?? 10000,
                              }),
                            })
                            const data = await response.json()
                            if (response.ok) {
                              setUserProfile(data.user)
                              alert('SMS history retention saved.')
                            } else {
                              alert(data.error || 'Failed to save retention setting')
                            }
                          } catch {
                            alert('Failed to save retention setting')
                          } finally {
                            setSaving(false)
                          }
                        }}
                        className="w-full sm:w-auto h-11 bg-[#2F9B73] hover:bg-[#267D5E] text-white rounded-xl"
                      >
                        {saving ? 'Saving…' : 'Save Retention Setting'}
                      </Button>
                    </div>
                  </div>

                  <div className="rounded-xl border border-[#E2E8F0] p-4 sm:p-5 bg-[#F8FAFC]">
                    <h3 className="text-base font-semibold text-[#0F172A] mb-1">
                      Phone Fallback Queue Retention
                    </h3>
                    <p className="text-sm text-[#64748B] mb-4">
                      Completed phone fallback jobs are automatically removed after this many days.
                      Maximum retention is 3 days.
                    </p>
                    <div className="space-y-3">
                      <label className="block text-sm font-medium text-[#0F172A]">
                        Auto-delete completed queue jobs after
                      </label>
                      <select
                        value={String(userProfile?.smsFallbackRetentionDays ?? 3)}
                        onChange={(e) => {
                          setUserProfile((prev: any) => ({
                            ...prev,
                            smsFallbackRetentionDays: parseInt(e.target.value, 10),
                          }))
                        }}
                        className={fieldClass}
                      >
                        <option value="1">1 day</option>
                        <option value="2">2 days</option>
                        <option value="3">3 days (maximum)</option>
                      </select>
                      <Button
                        type="button"
                        disabled={saving}
                        onClick={async () => {
                          setSaving(true)
                          try {
                            const token = localStorage.getItem('token')
                            const response = await fetch('/api/user/profile', {
                              method: 'PATCH',
                              headers: {
                                'Content-Type': 'application/json',
                                Authorization: `Bearer ${token}`,
                              },
                              body: JSON.stringify({
                                smsFallbackRetentionDays:
                                  userProfile?.smsFallbackRetentionDays ?? 3,
                              }),
                            })
                            const data = await response.json()
                            if (response.ok) {
                              setUserProfile(data.user)
                              alert('Phone fallback retention saved.')
                            } else {
                              alert(data.error || 'Failed to save fallback retention setting')
                            }
                          } catch {
                            alert('Failed to save fallback retention setting')
                          } finally {
                            setSaving(false)
                          }
                        }}
                        className="w-full sm:w-auto h-11 bg-[#2F9B73] hover:bg-[#267D5E] text-white rounded-xl"
                      >
                        {saving ? 'Saving…' : 'Save Fallback Retention'}
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </PortalLayout>
  )
}

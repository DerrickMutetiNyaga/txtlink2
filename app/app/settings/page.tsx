'use client'

import { PortalLayout } from '@/components/portal-layout'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Settings, 
  User, 
  Bell, 
  Shield, 
  Globe, 
  CreditCard,
  Key,
  CheckCircle2,
  ArrowRight,
  Trash2,
  Eye,
  EyeOff
} from 'lucide-react'
import { useState, useEffect } from 'react'
import Link from 'next/link'

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
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 mb-2">Settings</h1>
          <p className="text-sm text-slate-600">Manage your account settings and preferences</p>
        </div>

        <div className="grid md:grid-cols-12 gap-6">
          {/* Left: Settings Navigation Card */}
          <div className="md:col-span-3">
            <Card className="p-3 sm:p-4 bg-white border border-slate-200/70 shadow-sm rounded-2xl overflow-x-auto">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4 px-2 hidden md:block">
                Settings
              </h3>
              <nav className="flex md:flex-col gap-1 md:gap-1 min-w-max md:min-w-0">
                {tabs.map((tab) => {
                  const IconComponent = tab.icon
                  const isActive = activeTab === tab.id
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex-shrink-0 md:w-full flex items-center gap-2 sm:gap-3 px-3 py-2.5 rounded-xl transition-all relative whitespace-nowrap ${
                        isActive
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {isActive && (
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-emerald-600 rounded-r-full" />
                      )}
                      <IconComponent size={18} className={isActive ? 'text-emerald-600' : 'text-slate-500'} />
                      <span className="font-medium text-sm">{tab.label}</span>
                    </button>
                  )
                })}
              </nav>
            </Card>
          </div>

          {/* Right: Settings Content Area */}
          <div className="md:col-span-9">
            {activeTab === 'profile' && (
              <Card className="p-6 bg-white border border-slate-200/70 shadow-sm rounded-2xl">
                <div className="flex items-center gap-4 mb-6">
                  <div className="p-3 rounded-xl bg-emerald-100 text-emerald-600">
                    <User size={20} />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">Profile</h2>
                    <p className="text-sm text-slate-500">Update your personal information</p>
                  </div>
                </div>
                {loading ? (
                  <div className="text-center py-8 text-slate-500">Loading profile...</div>
                ) : (
                  <form onSubmit={handleProfileUpdate} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Full Name</label>
                      <input
                        type="text"
                        value={profileForm.name}
                        onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                        className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Email</label>
                      <input
                        type="email"
                        value={profileForm.email}
                        disabled
                        className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-slate-50 text-slate-500 cursor-not-allowed"
                      />
                      <p className="text-xs text-slate-400 mt-1">Email cannot be changed</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Phone Number</label>
                      <input
                        type="tel"
                        value={profileForm.phone}
                        onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                        className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        placeholder="+254712345678"
                      />
                    </div>
                    <Button 
                      type="submit"
                      disabled={saving}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {saving ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </form>
                )}
              </Card>
            )}

            {activeTab === 'notifications' && (
              <Card className="p-6 bg-white border border-slate-200/70 shadow-sm rounded-2xl">
                <div className="flex items-center gap-4 mb-6">
                  <div className="p-3 rounded-xl bg-blue-100 text-blue-600">
                    <Bell size={20} />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">Notifications</h2>
                    <p className="text-sm text-slate-500">Configure how you receive notifications</p>
                  </div>
                </div>
                <div className="space-y-3">
                  {['Email notifications', 'SMS alerts', 'Push notifications', 'Weekly reports'].map((item) => (
                    <div key={item} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200/70">
                      <span className="font-medium text-slate-900 text-sm">{item}</span>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" defaultChecked />
                        <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                      </label>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {activeTab === 'security' && (
              <div className="space-y-6">
                <Card className="p-6 bg-white border border-slate-200/70 shadow-sm rounded-2xl">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="p-3 rounded-xl bg-emerald-100 text-emerald-600">
                      <Shield size={20} />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-slate-900">Security</h2>
                      <p className="text-sm text-slate-500">Manage your account security</p>
                    </div>
                  </div>
                  <form onSubmit={handlePasswordUpdate} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Current Password</label>
                      <div className="relative">
                        <input
                          type={showPasswords.current ? "text" : "password"}
                          value={passwordForm.currentPassword}
                          onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                          className="w-full px-4 py-3 pr-12 border border-slate-200 rounded-xl bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPasswords({ ...showPasswords, current: !showPasswords.current })}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                          aria-label={showPasswords.current ? "Hide password" : "Show password"}
                        >
                          {showPasswords.current ? <EyeOff size={20} /> : <Eye size={20} />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">New Password</label>
                      <div className="relative">
                        <input
                          type={showPasswords.new ? "text" : "password"}
                          value={passwordForm.newPassword}
                          onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                          className="w-full px-4 py-3 pr-12 border border-slate-200 rounded-xl bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                          required
                          minLength={8}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                          aria-label={showPasswords.new ? "Hide password" : "Show password"}
                        >
                          {showPasswords.new ? <EyeOff size={20} /> : <Eye size={20} />}
                        </button>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">Must be at least 8 characters long</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Confirm New Password</label>
                      <div className="relative">
                        <input
                          type={showPasswords.confirm ? "text" : "password"}
                          value={passwordForm.confirmPassword}
                          onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                          className="w-full px-4 py-3 pr-12 border border-slate-200 rounded-xl bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                          required
                          minLength={8}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                          aria-label={showPasswords.confirm ? "Hide password" : "Show password"}
                        >
                          {showPasswords.confirm ? <EyeOff size={20} /> : <Eye size={20} />}
                        </button>
                      </div>
                    </div>
                    <Button 
                      type="submit"
                      disabled={saving}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {saving ? 'Updating...' : 'Update Password'}
                    </Button>
                  </form>
                </Card>

                {/* API Keys Section */}
                <Card className="p-6 bg-white border border-slate-200/70 shadow-sm rounded-2xl">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center mb-4">
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-xl bg-slate-100 text-slate-600">
                        <Key size={20} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-semibold text-slate-900">API Keys</h3>
                        <p className="text-sm text-slate-500">Manage your API keys for programmatic access</p>
                      </div>
                    </div>
                    <Link href="/app/api-keys" className="w-full sm:w-auto">
                      <Button variant="outline" className="w-full sm:w-auto border-slate-200 text-slate-700 hover:bg-emerald-50 hover:border-emerald-500 hover:text-emerald-700 rounded-xl">
                        Manage Keys
                        <ArrowRight size={16} className="ml-2" />
                      </Button>
                    </Link>
                  </div>
                </Card>
              </div>
            )}

            {activeTab === 'billing' && (
              <Card className="p-6 bg-white border border-slate-200/70 shadow-sm rounded-2xl">
                <div className="flex items-center gap-4 mb-4">
                  <div className="p-3 rounded-xl bg-emerald-100 text-emerald-600">
                    <CreditCard size={20} />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-lg font-semibold text-slate-900">Billing</h2>
                    <p className="text-sm text-slate-500">Manage your balance, invoices, and payment methods</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 mt-6">
                  <Link href="/app/billing">
                    <Button className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl">
                      Go to Billing
                      <ArrowRight size={16} className="ml-2" />
                    </Button>
                  </Link>
                  <Button variant="ghost" className="text-slate-500 hover:text-emerald-600 hover:underline rounded-xl">
                    View Pricing
                  </Button>
                </div>
              </Card>
            )}

            {activeTab === 'preferences' && (
              <Card className="p-6 bg-white border border-slate-200/70 shadow-sm rounded-2xl">
                <div className="flex items-center gap-4 mb-6">
                  <div className="p-3 rounded-xl bg-slate-100 text-slate-600">
                    <Globe size={20} />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">Preferences</h2>
                    <p className="text-sm text-slate-500">Customize your experience</p>
                  </div>
                </div>
                <div className="space-y-6">
                  <div className="rounded-xl border border-slate-200 p-5 bg-slate-50/50">
                    <h3 className="text-base font-semibold text-slate-900 mb-1">SMS History Retention</h3>
                    <p className="text-sm text-slate-600 mb-4">
                      This controls how many SMS history records are kept in your account. When the limit
                      is exceeded, the oldest records are automatically removed.
                    </p>
                    <div className="space-y-3">
                      <label className="block text-sm font-medium text-slate-700">
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
                        className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
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
                        <label className="block text-sm font-medium text-slate-700 mb-2">
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
                          className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        />
                      </div>
                      <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
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
                        className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl"
                      >
                        {saving ? 'Saving…' : 'Save Retention Setting'}
                      </Button>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 p-5 bg-slate-50/50">
                    <h3 className="text-base font-semibold text-slate-900 mb-1">
                      Phone Fallback Queue Retention
                    </h3>
                    <p className="text-sm text-slate-600 mb-4">
                      Completed phone fallback jobs are automatically removed after this many days.
                      Maximum retention is 3 days.
                    </p>
                    <div className="space-y-3">
                      <label className="block text-sm font-medium text-slate-700">
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
                        className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
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
                        className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl"
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

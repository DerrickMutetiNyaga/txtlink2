'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import {
  Sparkles,
  Save,
  Eye,
  MousePointerClick,
  Palette,
  Settings,
  CheckCircle2,
  XCircle,
  ArrowRight,
  TrendingUp,
} from 'lucide-react'

interface SenderIdAd {
  _id?: string
  title: string
  description: string
  senderIdName: string
  price: number
  priceUnit: string
  ctaText: string
  ctaLink: string
  isActive: boolean
  displayFrequency: 'low' | 'medium' | 'high'
  showOnPages: string[]
  backgroundColor: string
  textColor: string
  accentColor: string
  icon?: string
  views: number
  clicks: number
}

const AVAILABLE_PAGES = [
  { value: 'dashboard', label: 'Dashboard' },
  { value: 'send-sms', label: 'Send SMS' },
  { value: 'smshistory', label: 'SMS History' },
  { value: 'sender-ids', label: 'Sender IDs' },
  { value: 'analytics', label: 'Analytics' },
  { value: 'pricing', label: 'Pricing (Public)' },
]

export default function SenderIdAdPage() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [ad, setAd] = useState<SenderIdAd>({
    title: 'Upgrade to a Dedicated Sender ID',
    description: 'Boost trust, improve deliverability, and send with your own branded identity.',
    senderIdName: 'YOURBRAND',
    price: 5000,
    priceUnit: 'one-time setup',
    ctaText: 'Get Started',
    ctaLink: '/app/sender-ids',
    isActive: false,
    displayFrequency: 'medium',
    showOnPages: ['dashboard', 'send-sms'],
    backgroundColor: '#DDFBE6',
    textColor: '#052E2B',
    accentColor: '#0F766E',
    icon: '',
    views: 0,
    clicks: 0,
  })

  useEffect(() => {
    fetchAd()
  }, [])

  const fetchAd = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/sender-id-ad', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (response.ok) {
        const data = await response.json()
        if (data.ad) {
          setAd(data.ad)
        }
      }
    } catch (error) {
      console.error('Error fetching ad:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      const token = localStorage.getItem('token')
      const response = await fetch('/api/sender-id-ad', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(ad),
      })

      if (response.ok) {
        const data = await response.json()
        setAd(data.ad)
        toast({
          title: 'Success',
          description: 'Sender ID ad saved successfully',
        })
      } else {
        throw new Error('Failed to save')
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save sender ID ad',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const togglePage = (page: string) => {
    setAd((prev) => ({
      ...prev,
      showOnPages: prev.showOnPages.includes(page)
        ? prev.showOnPages.filter((p) => p !== page)
        : [...prev.showOnPages, page],
    }))
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-10 bg-slate-200 rounded w-1/3"></div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <div className="h-64 bg-white rounded-2xl"></div>
                <div className="h-64 bg-white rounded-2xl"></div>
              </div>
              <div className="h-96 bg-white rounded-2xl"></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const ctr = ad.views > 0 ? ((ad.clicks / ad.views) * 100).toFixed(2) : '0.00'

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-[32px] font-semibold text-[#0F172A] mb-2">
              Sender ID Advertisement
            </h1>
            <p className="text-sm text-[#475569]">
              Manage the promotional banner shown across the app
            </p>
          </div>
          <Badge
            variant={ad.isActive ? 'default' : 'secondary'}
            className={`${
              ad.isActive
                ? 'bg-[#0F766E] text-white border-[#0F766E]'
                : 'bg-[#FEF3C7] text-[#92400E] border-[#FDE68A]'
            } px-4 py-1.5 text-sm font-medium`}
          >
            {ad.isActive ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                Active
              </>
            ) : (
              <>
                <XCircle className="w-3.5 h-3.5 mr-1.5" />
                Inactive
              </>
            )}
          </Badge>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Content Section */}
            <Card className="bg-white border border-[#E5E7EB] rounded-2xl shadow-sm p-6">
              <div className="flex items-center gap-2 mb-6 pb-2">
                <Settings className="w-5 h-5 text-[#334155]" />
                <h2 className="text-[20px] font-semibold text-[#0F172A]">Content</h2>
              </div>
              <div className="space-y-5">
                <div>
                  <Label htmlFor="title" className="text-sm font-medium text-[#334155] mb-2 block">
                    Title
                  </Label>
                  <Input
                    id="title"
                    value={ad.title}
                    onChange={(e) => setAd({ ...ad, title: e.target.value })}
                    placeholder="Get Your Dedicated Sender ID"
                    className="bg-white border border-[#D7DEE7] text-[#0F172A] placeholder:text-[#94A3B8] rounded-xl h-11 px-[14px] focus:border-[#0F766E] focus:ring-4 focus:ring-[#0F766E]/12 focus:outline-none transition-all"
                  />
                </div>
                <div>
                  <Label htmlFor="description" className="text-sm font-medium text-[#334155] mb-2 block">
                    Description
                  </Label>
                  <Textarea
                    id="description"
                    value={ad.description}
                    onChange={(e) => setAd({ ...ad, description: e.target.value })}
                    placeholder="Build trust and increase deliverability..."
                    rows={4}
                    className="bg-white border border-[#D7DEE7] text-[#0F172A] placeholder:text-[#94A3B8] rounded-xl min-h-[110px] p-[14px] focus:border-[#0F766E] focus:ring-4 focus:ring-[#0F766E]/12 focus:outline-none resize-none transition-all"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <Label htmlFor="senderIdName" className="text-sm font-medium text-[#334155] mb-2 block">
                      Sender ID Name
                    </Label>
                    <Input
                      id="senderIdName"
                      value={ad.senderIdName}
                      onChange={(e) => setAd({ ...ad, senderIdName: e.target.value })}
                      placeholder="YOURBRAND"
                      className="bg-white border border-[#D7DEE7] text-[#0F172A] placeholder:text-[#94A3B8] rounded-xl h-11 px-[14px] focus:border-[#0F766E] focus:ring-4 focus:ring-[#0F766E]/12 focus:outline-none transition-all"
                    />
                  </div>
                  <div>
                    <Label htmlFor="price" className="text-sm font-medium text-[#334155] mb-2 block">
                      Price (KSh)
                    </Label>
                    <Input
                      id="price"
                      type="number"
                      value={ad.price}
                      onChange={(e) => setAd({ ...ad, price: parseFloat(e.target.value) || 0 })}
                      className="bg-white border border-[#D7DEE7] text-[#0F172A] placeholder:text-[#94A3B8] rounded-xl h-11 px-[14px] focus:border-[#0F766E] focus:ring-4 focus:ring-[#0F766E]/12 focus:outline-none transition-all"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <Label htmlFor="priceUnit" className="text-sm font-medium text-[#334155] mb-2 block">
                      Price Unit
                    </Label>
                    <Input
                      id="priceUnit"
                      value={ad.priceUnit}
                      onChange={(e) => setAd({ ...ad, priceUnit: e.target.value })}
                      placeholder="per month"
                      className="bg-white border border-[#D7DEE7] text-[#0F172A] placeholder:text-[#94A3B8] rounded-xl h-11 px-[14px] focus:border-[#0F766E] focus:ring-4 focus:ring-[#0F766E]/12 focus:outline-none transition-all"
                    />
                  </div>
                  <div>
                    <Label htmlFor="ctaText" className="text-sm font-medium text-[#334155] mb-2 block">
                      Button Text
                    </Label>
                    <Input
                      id="ctaText"
                      value={ad.ctaText}
                      onChange={(e) => setAd({ ...ad, ctaText: e.target.value })}
                      placeholder="Get Started"
                      className="bg-white border border-[#D7DEE7] text-[#0F172A] placeholder:text-[#94A3B8] rounded-xl h-11 px-[14px] focus:border-[#0F766E] focus:ring-4 focus:ring-[#0F766E]/12 focus:outline-none transition-all"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="ctaLink" className="text-sm font-medium text-[#334155] mb-2 block">
                    Button Link
                  </Label>
                  <Input
                    id="ctaLink"
                    value={ad.ctaLink}
                    onChange={(e) => setAd({ ...ad, ctaLink: e.target.value })}
                    placeholder="/app/sender-ids"
                    className="bg-white border border-[#D7DEE7] text-[#0F172A] placeholder:text-[#94A3B8] rounded-xl h-11 px-[14px] focus:border-[#0F766E] focus:ring-4 focus:ring-[#0F766E]/12 focus:outline-none transition-all"
                  />
                </div>
              </div>
            </Card>

            {/* Display Settings */}
            <Card className="bg-white border border-[#E5E7EB] rounded-2xl shadow-sm p-6">
              <div className="flex items-center gap-2 mb-6 pb-2">
                <Eye className="w-5 h-5 text-[#334155]" />
                <h2 className="text-[20px] font-semibold text-[#0F172A]">Display Settings</h2>
              </div>
              <div className="space-y-6">
                <div className="flex items-center justify-between py-2">
                  <div>
                    <Label htmlFor="isActive" className="text-sm font-medium text-[#334155]">
                      Active
                    </Label>
                    <p className="text-xs text-[#94A3B8] mt-0.5">
                      Show this ad across the app
                    </p>
                  </div>
                  <Switch
                    id="isActive"
                    checked={ad.isActive}
                    onCheckedChange={(checked) => setAd({ ...ad, isActive: checked })}
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium text-[#334155] mb-3 block">
                    Display Frequency
                  </Label>
                  <div className="flex gap-2">
                    {(['low', 'medium', 'high'] as const).map((freq) => (
                      <Button
                        key={freq}
                        variant={ad.displayFrequency === freq ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setAd({ ...ad, displayFrequency: freq })}
                        className={
                          ad.displayFrequency === freq
                            ? 'bg-[#0F766E] hover:bg-[#0B5E58] text-white border-[#0F766E]'
                            : 'bg-white text-[#475569] border-[#E5E7EB] hover:bg-[#F8FAFC]'
                        }
                      >
                        {freq.charAt(0).toUpperCase() + freq.slice(1)}
                      </Button>
                    ))}
                  </div>
                  <p className="text-xs text-[#94A3B8] mt-2">
                    Low: 2s delay, Medium: 1s delay, High: 0.5s delay
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-[#334155] mb-3 block">
                    Show on Pages
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {AVAILABLE_PAGES.map((page) => {
                      const isSelected = ad.showOnPages.includes(page.value)
                      return (
                        <button
                          key={page.value}
                          onClick={() => togglePage(page.value)}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                            isSelected
                              ? 'bg-[#ECFDF5] border-2 border-[#0F766E] text-[#0F766E]'
                              : 'bg-white border-2 border-[#E5E7EB] text-[#475569] hover:border-[#CBD5E1]'
                          }`}
                        >
                          {page.label}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>
            </Card>

            {/* Design */}
            <Card className="bg-white border border-[#E5E7EB] rounded-2xl shadow-sm p-6">
              <div className="flex items-center gap-2 mb-6 pb-2">
                <Palette className="w-5 h-5 text-[#334155]" />
                <h2 className="text-[20px] font-semibold text-[#0F172A]">Design</h2>
              </div>
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <Label htmlFor="backgroundColor" className="text-sm font-medium text-[#334155] mb-2 block">
                      Background Color
                    </Label>
                    <div className="flex items-center gap-2.5">
                      <label htmlFor="backgroundColor" className="cursor-pointer">
                        <div
                          className="w-11 h-11 rounded-[10px] border border-[#D7DEE7] shadow-sm"
                          style={{ backgroundColor: ad.backgroundColor }}
                        />
                        <Input
                          id="backgroundColor"
                          type="color"
                          value={ad.backgroundColor}
                          onChange={(e) => setAd({ ...ad, backgroundColor: e.target.value })}
                          className="sr-only"
                        />
                      </label>
                      <Input
                        value={ad.backgroundColor}
                        onChange={(e) => setAd({ ...ad, backgroundColor: e.target.value })}
                        placeholder="#ECFDF5"
                        className="flex-1 bg-white border border-[#D7DEE7] text-[#0F172A] placeholder:text-[#94A3B8] rounded-xl h-11 px-[14px] font-mono text-sm focus:border-[#0F766E] focus:ring-4 focus:ring-[#0F766E]/12 focus:outline-none transition-all"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="textColor" className="text-sm font-medium text-[#334155] mb-2 block">
                      Text Color
                    </Label>
                    <div className="flex items-center gap-2.5">
                      <label htmlFor="textColor" className="cursor-pointer">
                        <div
                          className="w-11 h-11 rounded-[10px] border border-[#D7DEE7] shadow-sm"
                          style={{ backgroundColor: ad.textColor }}
                        />
                        <Input
                          id="textColor"
                          type="color"
                          value={ad.textColor}
                          onChange={(e) => setAd({ ...ad, textColor: e.target.value })}
                          className="sr-only"
                        />
                      </label>
                      <Input
                        value={ad.textColor}
                        onChange={(e) => setAd({ ...ad, textColor: e.target.value })}
                        placeholder="#065F46"
                        className="flex-1 bg-white border border-[#D7DEE7] text-[#0F172A] placeholder:text-[#94A3B8] rounded-xl h-11 px-[14px] font-mono text-sm focus:border-[#0F766E] focus:ring-4 focus:ring-[#0F766E]/12 focus:outline-none transition-all"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="accentColor" className="text-sm font-medium text-[#334155] mb-2 block">
                      Accent Color
                    </Label>
                    <div className="flex items-center gap-2.5">
                      <label htmlFor="accentColor" className="cursor-pointer">
                        <div
                          className="w-11 h-11 rounded-[10px] border border-[#D7DEE7] shadow-sm"
                          style={{ backgroundColor: ad.accentColor }}
                        />
                        <Input
                          id="accentColor"
                          type="color"
                          value={ad.accentColor}
                          onChange={(e) => setAd({ ...ad, accentColor: e.target.value })}
                          className="sr-only"
                        />
                      </label>
                      <Input
                        value={ad.accentColor}
                        onChange={(e) => setAd({ ...ad, accentColor: e.target.value })}
                        placeholder="#0F766E"
                        className="flex-1 bg-white border border-[#D7DEE7] text-[#0F172A] placeholder:text-[#94A3B8] rounded-xl h-11 px-[14px] font-mono text-sm focus:border-[#0F766E] focus:ring-4 focus:ring-[#0F766E]/12 focus:outline-none transition-all"
                      />
                    </div>
                  </div>
                </div>
                <div>
                  <Label htmlFor="icon" className="text-sm font-medium text-[#334155] mb-2 block">
                    Icon (Emoji or Unicode)
                  </Label>
                  <Input
                    id="icon"
                    value={ad.icon || ''}
                    onChange={(e) => setAd({ ...ad, icon: e.target.value })}
                    placeholder="✨ or leave empty for default"
                    className="bg-white border border-[#D7DEE7] text-[#0F172A] placeholder:text-[#94A3B8] rounded-xl h-11 px-[14px] focus:border-[#0F766E] focus:ring-4 focus:ring-[#0F766E]/12 focus:outline-none transition-all"
                  />
                  <p className="text-xs text-[#64748B] mt-1.5">
                    Use an emoji or short unicode symbol
                  </p>
                </div>
              </div>
            </Card>
          </div>

          {/* Right Column - Sticky Sidebar */}
          <div className="lg:sticky lg:top-6 h-fit space-y-6">
            {/* Preview */}
            <Card className="bg-white border border-[#E5E7EB] rounded-2xl shadow-sm p-6">
              <h2 className="text-lg font-semibold text-[#0F172A] mb-4">Live Preview</h2>
              <div
                className="relative overflow-hidden rounded-3xl border border-[#E5E7EB]"
                style={{
                  backgroundColor: ad.backgroundColor === '#ECFDF5' || ad.backgroundColor === '#DDFBE6' ? '#DDFBE6' : ad.backgroundColor,
                  boxShadow: '0 12px 30px rgba(2, 44, 34, 0.08)',
                  padding: '32px 36px',
                }}
              >
                {/* Decorative shapes */}
                <div
                  className="absolute -bottom-12 -left-12 w-48 h-48 rounded-full opacity-15 blur-3xl"
                  style={{ backgroundColor: '#C8F5D4' }}
                />
                <div
                  className="absolute -top-8 -right-8 w-32 h-32 rounded-full opacity-10 blur-2xl"
                  style={{ backgroundColor: '#C8F5D4' }}
                />
                
                <div className="relative flex items-start gap-6">
                  <div
                    className="flex-shrink-0 w-14 h-14 rounded-[14px] flex items-center justify-center"
                    style={{ backgroundColor: `${ad.accentColor}15` }}
                  >
                    {ad.icon ? (
                      <span className="text-2xl">{ad.icon}</span>
                    ) : (
                      <Sparkles className="w-7 h-7" style={{ color: ad.accentColor }} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 
                      className="text-[40px] font-bold mb-3 leading-tight"
                      style={{ 
                        color: ad.textColor === '#065F46' || ad.textColor === '#052E2B' ? '#052E2B' : ad.textColor,
                        fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif',
                        fontWeight: 700,
                        letterSpacing: '-0.02em',
                      }}
                    >
                      {ad.title}
                    </h3>
                    <p 
                      className="text-base mb-6 leading-relaxed"
                      style={{ 
                        color: ad.textColor === '#065F46' || ad.textColor === '#052E2B' ? '#2D6A63' : ad.textColor,
                        fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif',
                        fontWeight: 400,
                        lineHeight: 1.5,
                      }}
                    >
                      {ad.description}
                    </p>
                    <div className="flex items-center gap-6 flex-wrap">
                      <div className="flex items-baseline gap-2">
                        <span 
                          className="text-[28px] font-extrabold"
                          style={{ 
                            color: ad.accentColor === '#0F766E' ? '#064E3B' : ad.accentColor,
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
                            color: ad.textColor === '#065F46' || ad.textColor === '#052E2B' ? '#2D6A63' : ad.textColor,
                            fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif',
                            fontWeight: 500,
                          }}
                        >
                          {ad.priceUnit}
                        </span>
                      </div>
                      <button
                        className="px-[22px] py-3 rounded-[14px] font-semibold text-white flex items-center gap-2 transition-all hover:scale-105 h-12"
                        style={{ 
                          backgroundColor: ad.accentColor,
                          fontSize: '15px',
                          fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif',
                          fontWeight: 600,
                        }}
                      >
                        {ad.ctaText}
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            {/* Stats */}
            <Card className="bg-white border border-[#E5E7EB] rounded-2xl shadow-sm p-6">
              <h2 className="text-lg font-semibold text-[#0F172A] mb-4">Statistics</h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-5 bg-[#F8FAFC] rounded-xl border border-[#E5E7EB]">
                  <div className="flex items-center gap-2 mb-2">
                    <Eye className="w-4 h-4 text-[#64748B]" />
                    <span className="text-xs font-medium text-[#475569] uppercase tracking-wide">
                      Views
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-[#0F172A]">
                    {ad.views.toLocaleString()}
                  </p>
                </div>
                <div className="p-5 bg-[#F8FAFC] rounded-xl border border-[#E5E7EB]">
                  <div className="flex items-center gap-2 mb-2">
                    <MousePointerClick className="w-4 h-4 text-[#64748B]" />
                    <span className="text-xs font-medium text-[#475569] uppercase tracking-wide">
                      Clicks
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-[#0F172A]">
                    {ad.clicks.toLocaleString()}
                  </p>
                </div>
              </div>
              {ad.views > 0 && (
                <div className="mt-4 pt-4 border-t border-[#E5E7EB]">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-[#64748B]" />
                      <span className="text-sm font-medium text-[#475569]">CTR</span>
                    </div>
                    <span className="text-lg font-semibold text-[#0F172A]">{ctr}%</span>
                  </div>
                </div>
              )}
            </Card>

            {/* Save Actions */}
            <Card className="bg-white border border-[#E5E7EB] rounded-2xl shadow-sm p-6">
              <div className="space-y-3">
                <Button
                  onClick={handleSave}
                  disabled={saving}
                  className="w-full bg-[#0F766E] hover:bg-[#0B5E58] text-white font-medium h-11"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
                <p className="text-xs text-center text-[#94A3B8]">
                  Changes will be applied immediately when saved
                </p>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

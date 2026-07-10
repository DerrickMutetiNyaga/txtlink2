'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DollarSign,
  Save,
  RefreshCw,
  Calculator,
  Globe,
  User,
  Info,
  Edit,
  Eye,
  Search,
  X,
  Plus,
  Calendar,
  ChevronDown,
  CheckCircle2,
  Store,
  Trash2,
  Radio,
} from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import {
  PricingRuleEditorDialog,
  formatRulePriceLabel,
  getDefaultPricingRule,
  copyGlobalRuleForOverride,
  type EditablePricingRule,
} from '@/components/super-admin/pricing-rule-form'
import {
  getModeLabel,
  getSampleBlockBreakdown,
  type PricingRuleConfig,
} from '@/lib/utils/pricing-calculations'

interface PricingRule extends EditablePricingRule {
  updatedAt?: string
  createdAt?: string
}

interface Account {
  id: string
  name: string
  email: string
  senderIds: Array<{ id: string; senderName: string; status: string; isDefault: boolean }>
  pricing: {
    mode: string
    pricePerSms?: number
    pricePerPart?: number
    pricePerBlock?: number
    charsPerBlock?: number
    pricePerCharacter?: number
  } | null
}

interface MarketingPricingTier {
  name: string
  price: string
  priceDecimal?: string
  unit: string
  description: string
  icon: string
  accentColor: 'teal' | 'indigo' | 'slate'
  features: Array<{
    text: string
    category: string
    highlight: boolean
  }>
  cta: string
  ctaSecondary: string
  highlighted: boolean
  highlightReason?: string
}

interface MarketingPricing {
  pageTitle: string
  pageSubtitle: string
  tiers: MarketingPricingTier[]
  volumeDiscounts: Array<{
    volume: string
    discount: string
    price: string
  }>
}

export default function SuperAdminPricing() {
  const [rules, setRules] = useState<PricingRule[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [editingRule, setEditingRule] = useState<PricingRule | null>(null)
  const [preview, setPreview] = useState<any>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterOverride, setFilterOverride] = useState<'all' | 'has_override' | 'using_global'>('all')
  const [dateRange, setDateRange] = useState('last_7_days')
  
  // Marketing pricing state
  const [marketingPricing, setMarketingPricing] = useState<MarketingPricing | null>(null)
  const [editingMarketingPricing, setEditingMarketingPricing] = useState<MarketingPricing | null>(null)
  const [showMarketingEditor, setShowMarketingEditor] = useState(false)

  // Sender ID pricing state
  const [senderIdPricing, setSenderIdPricing] = useState<{
    registrationFee: number
    approvalTimeline: string
    requiredDocuments: string[]
    description: string
  } | null>(null)
  const [editingSenderIdPricing, setEditingSenderIdPricing] = useState<{
    registrationFee: number
    approvalTimeline: string
    requiredDocuments: string[]
    description: string
  } | null>(null)
  const [showSenderIdEditor, setShowSenderIdEditor] = useState(false)

  useEffect(() => {
    fetchData()
    // Create default global rule if none exists
    const createDefault = async () => {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/super-admin/pricing', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (response.ok) {
        const result = await response.json()
        if (result.rules.filter((r: PricingRule) => r.scope === 'global').length === 0) {
          // Create default
          await fetch('/api/super-admin/pricing/default', {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
          })
          fetchData()
        }
      }
    }
    createDefault()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('token')
      
      // Fetch pricing rules
      const rulesResponse = await fetch('/api/super-admin/pricing', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (rulesResponse.ok) {
        const rulesResult = await rulesResponse.json()
        setRules(rulesResult.rules || [])
      }

      // Fetch accounts
      const accountsResponse = await fetch('/api/super-admin/accounts', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (accountsResponse.ok) {
        const accountsResult = await accountsResponse.json()
        setAccounts(accountsResult.accounts || [])
      }

      // Fetch marketing pricing
      const marketingResponse = await fetch('/api/marketing-pricing', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (marketingResponse.ok) {
        const marketingResult = await marketingResponse.json()
        setMarketingPricing(marketingResult.pricing)
      }

      // Fetch Sender ID pricing
      const senderIdResponse = await fetch('/api/sender-id-pricing', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (senderIdResponse.ok) {
        const senderIdResult = await senderIdResponse.json()
        setSenderIdPricing(senderIdResult.pricing)
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveMarketingPricing = async () => {
    if (!editingMarketingPricing) return

    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/marketing-pricing', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(editingMarketingPricing),
      })

      if (response.ok) {
        const result = await response.json()
        setMarketingPricing(result.pricing)
        setShowMarketingEditor(false)
        setEditingMarketingPricing(null)
        alert('Marketing pricing saved successfully')
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to save marketing pricing')
      }
    } catch (error) {
      alert('Failed to save marketing pricing')
    }
  }

  const handleSaveSenderIdPricing = async () => {
    if (!editingSenderIdPricing) return

    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/sender-id-pricing', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(editingSenderIdPricing),
      })

      if (response.ok) {
        const result = await response.json()
        setSenderIdPricing(result.pricing)
        setShowSenderIdEditor(false)
        setEditingSenderIdPricing(null)
        alert('Sender ID pricing saved successfully')
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to save Sender ID pricing')
      }
    } catch (error) {
      alert('Failed to save Sender ID pricing')
    }
  }

  const handleSave = async () => {
    if (!editingRule) return

    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/super-admin/pricing', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(editingRule),
      })

      if (response.ok) {
        await fetchData()
        setEditingRule(null)
        alert('Pricing rule saved successfully')
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to save')
      }
    } catch (error) {
      alert('Failed to save pricing rule')
    }
  }

  const calculatePreview = async () => {
    if (!preview?.message) return

    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/super-admin/pricing/calculate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          message: preview.message,
          userId: preview.selectedAccountId || undefined,
          encoding: preview.encoding === 'auto' ? undefined : preview.encoding,
        }),
      })

      if (response.ok) {
        const result = await response.json()
        const calculation = result.calculation
        
        // Get the pricing rule to know price per part
        const rule = preview.selectedAccountId
          ? rules.find((r) => {
              const userId = typeof r.userId === 'object' ? r.userId._id?.toString() : r.userId?.toString()
              return r.scope === 'user' && userId === preview.selectedAccountId
            })
          : globalRule
        
        const pricePerPart = rule?.pricePerPart || (calculation.chargedKes / calculation.parts)
        
        setPreview({ 
          ...preview, 
          calculation: {
            ...calculation,
            pricePerPart,
          }
        })
      }
    } catch (error) {
      console.error('Preview calculation error:', error)
    }
  }

  const globalRule = rules.find((r) => r.scope === 'global')
  const userOverrides = rules.filter((r) => r.scope === 'user')
  
  // Calculate counts
  const accountsWithOverrides = accounts.filter((acc) => acc.pricing !== null).length
  const accountsUsingGlobal = accounts.length - accountsWithOverrides

  // Filter accounts for table
  const filteredAccounts = accounts.filter((acc) => {
    const matchesSearch =
      (acc.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (acc.email || '').toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesFilter =
      filterOverride === 'all' ||
      (filterOverride === 'has_override' && acc.pricing !== null) ||
      (filterOverride === 'using_global' && acc.pricing === null)
    
    return matchesSearch && matchesFilter
  })

  // Get account details for override rules
  const getAccountForRule = (rule: PricingRule) => {
    if (rule.scope !== 'user' || !rule.userId) return null
    const userId = typeof rule.userId === 'object' ? rule.userId._id?.toString() : rule.userId.toString()
    return accounts.find((acc) => acc.id === userId)
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header Row */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-[#020617]">Pricing & Deductions Engine</h1>
            <p className="text-[#64748B] mt-1">Configure global pricing and account overrides</p>
          </div>
          <div className="flex items-center gap-3">
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-[160px] bg-white border-[#E5E7EB] text-[#020617]">
                <Calendar className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-white border-[#E5E7EB]">
                <SelectItem value="last_7_days">Last 7 days</SelectItem>
                <SelectItem value="last_30_days">Last 30 days</SelectItem>
                <SelectItem value="last_90_days">Last 90 days</SelectItem>
                <SelectItem value="all_time">All time</SelectItem>
              </SelectContent>
            </Select>
            <button
              onClick={fetchData}
              className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl shadow-sm text-slate-700 hover:bg-slate-100 hover:text-slate-900 active:scale-95 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 transition-all duration-200"
            >
              <RefreshCw className="w-4 h-4 text-slate-500" />
              Refresh
            </button>
          </div>
        </div>

        {/* Info Callout */}
        <Card className="bg-white border-[#E5E7EB] rounded-xl shadow-sm border-l-4 border-l-[#FACC15] p-4">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-[#64748B] mt-0.5 flex-shrink-0" />
            <p className="text-sm text-[#64748B]">
              <span className="font-medium text-[#020617]">Global rules apply to all accounts</span> unless an admin override exists. Accounts with overrides use their custom pricing instead of the global rule.
            </p>
          </div>
        </Card>

        {/* Two-Column Grid */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Global Pricing Rule Card */}
          <Card className="bg-white border-[#E5E7EB] rounded-xl shadow-sm border-l-4 border-l-[#FACC15] p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Globe className="w-5 h-5 text-[#64748B]" />
                <h2 className="text-xl font-semibold text-[#020617]">Global Pricing Rule</h2>
              </div>
              <Badge className="bg-[#FACC15] text-[#020617] border-0">Active</Badge>
            </div>

            {globalRule ? (
              <div className="space-y-6">
                {/* Pricing Breakdown */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center py-2 border-b border-[#E5E7EB]">
                    <span className="text-sm text-[#64748B]">Mode</span>
                    <span className="text-sm font-medium text-[#020617]">{getModeLabel(globalRule.mode as PricingRuleConfig['mode'])}</span>
                  </div>

                  {globalRule.mode === 'per_char_block' && (
                    <>
                      <div className="flex justify-between items-center py-2 border-b border-[#E5E7EB]">
                        <span className="text-sm text-[#64748B]">Billing unit</span>
                        <span className="text-sm font-medium text-[#020617]">{globalRule.charsPerBlock || 160} characters</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-[#E5E7EB]">
                        <span className="text-sm text-[#64748B]">Price per billing unit</span>
                        <span className="text-sm font-medium text-[#020617]">KSh {globalRule.pricePerBlock || 0}</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-[#E5E7EB]">
                        <span className="text-sm text-[#64748B]">Partial block billing</span>
                        <span className="text-sm font-medium text-[#020617]">{globalRule.roundPartialBlocks !== false ? 'Round up' : 'Exact'}</span>
                      </div>
                      <div className="bg-[#F8FAFC] rounded-lg p-4 border border-[#E5E7EB] space-y-2">
                        <p className="text-sm font-medium text-[#020617] mb-2">Example Breakdown</p>
                        {getSampleBlockBreakdown(
                          globalRule.charsPerBlock || 160,
                          globalRule.pricePerBlock || 0,
                          globalRule.roundPartialBlocks !== false,
                          3
                        ).map((sample) => (
                          <div key={sample.range} className="flex justify-between text-sm">
                            <span className="text-[#64748B]">{sample.range}</span>
                            <span className="font-medium text-[#020617]">KSh {sample.charge.toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}

                  {globalRule.mode === 'per_character' && (
                    <>
                      <div className="flex justify-between items-center py-2 border-b border-[#E5E7EB]">
                        <span className="text-sm text-[#64748B]">Price per character</span>
                        <span className="text-sm font-medium text-[#020617]">KSh {globalRule.pricePerCharacter || 0}</span>
                      </div>
                      {(globalRule.minimumChargePerMessage ?? 0) > 0 && (
                        <div className="flex justify-between items-center py-2 border-b border-[#E5E7EB]">
                          <span className="text-sm text-[#64748B]">Minimum charge per message</span>
                          <span className="text-sm font-medium text-[#020617]">KSh {globalRule.minimumChargePerMessage}</span>
                        </div>
                      )}
                    </>
                  )}

                  {globalRule.mode === 'per_part' && (
                    <>
                      <div className="flex justify-between items-center py-2 border-b border-[#E5E7EB]">
                        <span className="text-sm text-[#64748B]">Price per SMS segment</span>
                        <span className="text-sm font-medium text-[#020617]">
                          KSh {globalRule.pricePerPart || 0}
                        </span>
                      </div>
                      
                      {/* Pricing Breakdown */}
                      <div className="bg-[#F8FAFC] rounded-lg p-4 border border-[#E5E7EB] space-y-4">
                        <p className="text-sm font-medium text-[#020617] mb-3">Pricing Breakdown</p>
                        
                        {/* GSM-7 */}
                        <div className="space-y-2">
                          <p className="text-sm font-medium text-[#020617]">GSM-7 (standard text)</p>
                          <div className="space-y-1.5 pl-4">
                            <div className="flex justify-between text-sm">
                              <span className="text-[#64748B]">First {globalRule.gsm7Part1 || 160} chars:</span>
                              <span className="font-medium text-[#020617]">KSh {globalRule.pricePerPart || 0}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-[#64748B]">Each extra {globalRule.gsm7PartN || 153} chars:</span>
                              <span className="font-medium text-[#020617]">+KSh {globalRule.pricePerPart || 0}</span>
                            </div>
                            <p className="text-xs text-[#64748B] mt-2">
                              Example: 200 chars → 2 parts → KSh {((globalRule.pricePerPart || 0) * 2).toFixed(2)}
                            </p>
                          </div>
                        </div>
                        
                        <Separator className="bg-[#E5E7EB]" />
                        
                        {/* UCS-2 */}
                        <div className="space-y-2">
                          <p className="text-sm font-medium text-[#020617]">UCS-2 (unicode/emoji)</p>
                          <div className="space-y-1.5 pl-4">
                            <div className="flex justify-between text-sm">
                              <span className="text-[#64748B]">First {globalRule.ucs2Part1 || 70} chars:</span>
                              <span className="font-medium text-[#020617]">KSh {globalRule.pricePerPart || 0}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-[#64748B]">Each extra {globalRule.ucs2PartN || 67} chars:</span>
                              <span className="font-medium text-[#020617]">+KSh {globalRule.pricePerPart || 0}</span>
                            </div>
                            <p className="text-xs text-[#64748B] mt-2">
                              Example: 90 chars → 2 parts → KSh {((globalRule.pricePerPart || 0) * 2).toFixed(2)}
                            </p>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                  {globalRule.mode === 'per_sms' && (
                    <div className="flex justify-between items-center py-2 border-b border-[#E5E7EB]">
                      <span className="text-sm text-[#64748B]">Price per SMS</span>
                      <span className="text-sm font-medium text-[#020617]">
                        KSh {globalRule.pricePerSms || 0} per SMS
                      </span>
                    </div>
                  )}
                </div>

                <Separator className="bg-[#E5E7EB]" />

                {/* Applies To Section */}
                <div className="bg-[#F8FAFC] rounded-lg p-4 border border-[#E5E7EB]">
                  <p className="text-sm font-medium text-[#020617] mb-2">Applies to:</p>
                  <p className="text-sm text-[#64748B] mb-3">All accounts without overrides</p>
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-sm">
                      <span className="text-[#64748B]">Covered by global:</span>
                      <span className="font-medium text-[#020617]">{accountsUsingGlobal} accounts</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-[#64748B]">Overrides:</span>
                      <span className="font-medium text-[#020617]">{accountsWithOverrides} accounts</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  <Button
                    onClick={() => setEditingRule({ ...globalRule, scope: 'global' })}
                    className="flex-1 bg-[#FACC15] hover:bg-[#EAB308] text-[#020617] font-medium"
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Edit Global Rule
                  </Button>
                  <Button
                    variant="outline"
                    className="bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-200"
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    View Impact
                  </Button>
                </div>
              </div>
            ) : (
              <div>
                <p className="text-sm text-[#64748B] mb-4">No global rule configured</p>
                <Button
                  onClick={() => setEditingRule(getDefaultPricingRule('global'))}
                  className="bg-[#FACC15] hover:bg-[#EAB308] text-[#020617] font-medium"
                >
                  Create Global Rule
                </Button>
              </div>
            )}
          </Card>

          {/* Pricing Calculator Card */}
          <Card className="bg-white border-[#E5E7EB] rounded-xl shadow-sm p-6">
            <div className="flex items-center gap-2 mb-6">
              <Calculator className="w-5 h-5 text-[#64748B]" />
              <h2 className="text-xl font-semibold text-[#020617]">Pricing Calculator</h2>
            </div>

            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium text-[#020617] mb-2 block">Test Message</Label>
                <Textarea
                  value={preview?.message || ''}
                  onChange={(e) => setPreview({ ...preview, message: e.target.value })}
                  className="w-full border-[#E5E7EB] bg-white text-[#020617] placeholder:text-[#64748B] focus:border-[#FACC15] focus:ring-[#FACC15]"
                  rows={4}
                  placeholder="Enter message to calculate pricing..."
                />
              </div>
              
              <div>
                <Label className="text-sm font-medium text-[#020617] mb-2 block">Encoding</Label>
                <Select
                  value={preview?.encoding || 'auto'}
                  onValueChange={(value) => setPreview({ ...preview, encoding: value })}
                >
                  <SelectTrigger className="border-[#E5E7EB] bg-white text-[#020617]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-[#E5E7EB]">
                    <SelectItem value="auto">Auto-detect</SelectItem>
                    <SelectItem value="gsm7">GSM-7</SelectItem>
                    <SelectItem value="ucs2">UCS-2 (Unicode)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-sm font-medium text-[#020617] mb-2 block">Account (Optional)</Label>
                <Select
                  value={preview?.selectedAccountId || 'global'}
                  onValueChange={(value) => setPreview({ ...preview, selectedAccountId: value === 'global' ? undefined : value })}
                >
                  <SelectTrigger className="border-[#E5E7EB] bg-white text-[#020617]">
                    <SelectValue placeholder="Select account to test override" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-[#E5E7EB]">
                    <SelectItem value="global">Global pricing</SelectItem>
                    {accounts.map((acc) => (
                      <SelectItem key={acc.id} value={acc.id}>
                        {acc.name} ({acc.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                onClick={calculatePreview}
                className="w-full bg-slate-800 hover:bg-slate-900 text-white font-medium"
              >
                <Calculator className="w-4 h-4 mr-2" />
                Calculate
              </Button>

              {preview?.calculation && (() => {
                const encoding = preview.calculation.encoding
                const parts = preview.calculation.parts
                const totalCost = preview.calculation.chargedKes
                const charCount = preview.message?.length || 0
                const billingBlocks = preview.calculation.billingBlocks
                const calcMode = preview.calculation.mode

                const rule = preview.selectedAccountId
                  ? rules.find((r) => {
                      const userId = typeof r.userId === 'object' ? r.userId._id?.toString() : r.userId?.toString()
                      return r.scope === 'user' && userId === preview.selectedAccountId
                    })
                  : globalRule

                return (
                  <div className="bg-[#F8FAFC] border border-[#E5E7EB] rounded-lg p-4 space-y-3">
                    <p className="text-sm font-medium text-[#020617] mb-3">Result:</p>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-[#64748B]">Pricing mode:</span>
                        <span className="font-medium text-[#020617]">{getModeLabel((calcMode || rule?.mode || 'per_part') as PricingRuleConfig['mode'])}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#64748B]">Encoding detected:</span>
                        <span className="font-medium text-[#020617]">{encoding.toUpperCase()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#64748B]">Characters:</span>
                        <span className="font-medium text-[#020617]">{charCount}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#64748B]">Provider SMS parts:</span>
                        <span className="font-medium text-[#020617]">{parts}</span>
                      </div>
                      {billingBlocks != null && (
                        <div className="flex justify-between">
                          <span className="text-[#64748B]">Billing blocks:</span>
                          <span className="font-medium text-[#020617]">{billingBlocks}</span>
                        </div>
                      )}

                      <Separator className="bg-[#E5E7EB] my-2" />

                      <div className="space-y-1.5 bg-white rounded p-3 border border-[#E5E7EB]">
                        <p className="text-xs font-medium text-[#020617] mb-2">Cost Breakdown:</p>
                        {calcMode === 'per_char_block' && (
                          <div className="flex justify-between text-sm">
                            <span className="text-[#64748B]">
                              {billingBlocks} block{(billingBlocks ?? 0) !== 1 ? 's' : ''} × KSh {preview.calculation.pricePerBlock ?? rule?.pricePerBlock ?? 0}
                            </span>
                            <span className="font-medium text-[#020617]">KSh {totalCost.toFixed(2)}</span>
                          </div>
                        )}
                        {calcMode === 'per_character' && (
                          <div className="flex justify-between text-sm">
                            <span className="text-[#64748B]">
                              {charCount} chars × KSh {preview.calculation.pricePerCharacter ?? rule?.pricePerCharacter ?? 0}
                            </span>
                            <span className="font-medium text-[#020617]">KSh {totalCost.toFixed(2)}</span>
                          </div>
                        )}
                        {calcMode === 'per_part' && rule && (
                          <>
                            <div className="flex justify-between text-sm">
                              <span className="text-[#64748B]">{parts} SMS part{parts !== 1 ? 's' : ''} × KSh {rule.pricePerPart || 0}</span>
                              <span className="font-medium text-[#020617]">KSh {totalCost.toFixed(2)}</span>
                            </div>
                          </>
                        )}
                        {calcMode === 'per_sms' && (
                          <div className="flex justify-between text-sm">
                            <span className="text-[#64748B]">{parts} SMS × KSh {rule?.pricePerSms || 0}</span>
                            <span className="font-medium text-[#020617]">KSh {totalCost.toFixed(2)}</span>
                          </div>
                        )}
                      </div>

                      <Separator className="bg-[#E5E7EB] my-2" />

                      <div className="flex justify-between items-center">
                        <span className="text-[#64748B] font-medium">Total cost:</span>
                        <div className="text-right">
                          <span className="font-semibold text-lg text-[#020617]">
                            KSh {totalCost.toFixed(2)}
                          </span>
                          {preview.selectedAccountId && (
                            <Badge className="ml-2 bg-[#FACC15] text-[#020617] border-0 text-xs">
                              Override Applied
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })()}
            </div>
          </Card>
        </div>

        {/* User-Specific Overrides Section */}
        <Card className="bg-white border-[#E5E7EB] rounded-xl shadow-sm p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <div>
              <h2 className="text-xl font-semibold text-[#020617]">User-Specific Overrides</h2>
              <p className="text-sm text-[#64748B] mt-1">
                {userOverrides.length} override{userOverrides.length !== 1 ? 's' : ''} configured
              </p>
            </div>
            <Button
              onClick={() => {
                // Open create override dialog - for now just show message
                alert('Select an account from the table and use the Actions menu to create an override')
              }}
              className="bg-[#FACC15] hover:bg-[#EAB308] text-[#020617] font-medium"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Override
            </Button>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748B]" />
              <Input
                type="text"
                placeholder="Search by account name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 border-[#E5E7EB] bg-white text-[#020617] placeholder:text-[#64748B]"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant={filterOverride === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterOverride('all')}
                className={
                  filterOverride === 'all'
                    ? 'bg-[#FACC15] hover:bg-[#EAB308] text-[#020617]'
                    : 'bg-white border-[#E5E7EB] text-[#64748B] hover:bg-[#F8FAFC]'
                }
              >
                All
              </Button>
              <Button
                variant={filterOverride === 'has_override' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterOverride('has_override')}
                className={
                  filterOverride === 'has_override'
                    ? 'bg-[#FACC15] hover:bg-[#EAB308] text-[#020617]'
                    : 'bg-white border-[#E5E7EB] text-[#64748B] hover:bg-[#F8FAFC]'
                }
              >
                Has Overrides
              </Button>
              <Button
                variant={filterOverride === 'using_global' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterOverride('using_global')}
                className={
                  filterOverride === 'using_global'
                    ? 'bg-[#FACC15] hover:bg-[#EAB308] text-[#020617]'
                    : 'bg-white border-[#E5E7EB] text-[#64748B] hover:bg-[#F8FAFC]'
                }
              >
                Using Global
              </Button>
            </div>
          </div>

          {/* Table */}
          {loading ? (
            <div className="text-center py-12">
              <RefreshCw className="w-6 h-6 animate-spin text-[#64748B] mx-auto mb-2" />
              <p className="text-sm text-[#64748B]">Loading...</p>
            </div>
          ) : filteredAccounts.length === 0 ? (
            <div className="text-center py-12 border border-[#E5E7EB] rounded-lg bg-[#F8FAFC]">
              <User className="w-12 h-12 text-[#64748B] mx-auto mb-4" />
              <p className="text-[#64748B] font-medium mb-1">No overrides yet</p>
              <p className="text-sm text-[#64748B] mb-4">
                Global pricing is currently applied to all accounts.
              </p>
              <Button
                onClick={() => {
                  alert('Select an account from the table and use the Actions menu to create an override')
                }}
                className="bg-[#FACC15] hover:bg-[#EAB308] text-[#020617] font-medium"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Override
              </Button>
            </div>
          ) : (
            <div className="border border-[#E5E7EB] rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-[#F8FAFC] hover:bg-[#F8FAFC]">
                    <TableHead className="text-[#020617] font-semibold">Account</TableHead>
                    <TableHead className="text-[#020617] font-semibold">Email</TableHead>
                    <TableHead className="text-[#020617] font-semibold">Sender IDs</TableHead>
                    <TableHead className="text-[#020617] font-semibold">Override Mode</TableHead>
                    <TableHead className="text-[#020617] font-semibold">Price</TableHead>
                    <TableHead className="text-[#020617] font-semibold">Updated</TableHead>
                    <TableHead className="text-[#020617] font-semibold text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAccounts.map((account) => {
                    const overrideRule = userOverrides.find((r) => {
                      const userId = typeof r.userId === 'object' ? r.userId._id?.toString() : r.userId?.toString()
                      return userId === account.id
                    })
                    
                    return (
                      <TableRow key={account.id} className="hover:bg-[#F8FAFC]">
                        <TableCell className="font-medium text-[#020617]">{account.name}</TableCell>
                        <TableCell className="text-[#64748B]">{account.email}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {account.senderIds.length > 0 ? (
                              account.senderIds.slice(0, 2).map((sid) => (
                                <Badge
                                  key={sid.id}
                                  variant="outline"
                                  className="bg-white text-[#64748B] border-[#E5E7EB] text-xs"
                                >
                                  {sid.senderName}
                                </Badge>
                              ))
                            ) : (
                              <span className="text-sm text-[#94A3B8]">None</span>
                            )}
                            {account.senderIds.length > 2 && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger>
                                    <Badge variant="outline" className="bg-white text-[#64748B] border-[#E5E7EB] text-xs">
                                      +{account.senderIds.length - 2}
                                    </Badge>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    {account.senderIds.slice(2).map((sid) => sid.senderName).join(', ')}
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {account.pricing ? (
                            <Badge className="bg-[#FACC15] text-[#020617] border-0">
                              {getModeLabel(account.pricing.mode as PricingRuleConfig['mode'])}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-[#F8FAFC] text-[#64748B] border-[#E5E7EB]">
                              Global
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {account.pricing ? (
                            <div className="space-y-0.5">
                              <span className="text-sm font-medium text-[#020617]">
                                {formatRulePriceLabel(account.pricing as PricingRuleConfig)}
                              </span>
                            </div>
                          ) : (
                            <span className="text-sm text-[#64748B]">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-[#64748B] text-sm">
                          {overrideRule?.updatedAt
                            ? new Date(overrideRule.updatedAt).toLocaleDateString()
                            : '—'}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            {account.pricing ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  const rule = userOverrides.find((r) => {
                                    const userId = typeof r.userId === 'object' ? r.userId._id?.toString() : r.userId?.toString()
                                    return userId === account.id
                                  })
                                  if (rule) {
                                    setEditingRule(rule)
                                  }
                                }}
                                className="text-[#64748B] hover:text-[#020617] hover:bg-[#F8FAFC]"
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                            ) : (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  if (globalRule) {
                                    setEditingRule(copyGlobalRuleForOverride(globalRule, account.id))
                                  } else {
                                    setEditingRule(getDefaultPricingRule('user', account.id))
                                  }
                                }}
                                className="text-[#64748B] hover:text-[#020617] hover:bg-[#F8FAFC]"
                              >
                                <Plus className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </Card>

        {/* Sender ID Pricing Management Section */}
        <Card className="bg-white border-[#E5E7EB] rounded-xl shadow-sm border-l-4 border-l-emerald-500 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Radio className="w-5 h-5 text-emerald-600" />
              <h2 className="text-xl font-semibold text-[#020617]">Sender ID Pricing (Public Pages)</h2>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => {
                  setEditingSenderIdPricing(senderIdPricing || {
                    registrationFee: 5000,
                    approvalTimeline: '3-5 business days after document submission',
                    requiredDocuments: [
                      'Business registration certificate',
                      'Company letterhead',
                      'Authorized signatory ID',
                    ],
                    description: 'One-time setup fee for new Sender ID registration and approval processing. No annual renewal fees.',
                  })
                  setShowSenderIdEditor(true)
                }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-xl shadow-sm active:scale-95 focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 transition-all duration-150"
              >
                <Edit className="w-4 h-4 mr-2" />
                Edit Sender ID Pricing
              </Button>
            </div>
          </div>

          {senderIdPricing ? (
            <div className="space-y-4">
              <div className="bg-[#F8FAFC] rounded-lg p-4 border border-[#E5E7EB]">
                <p className="text-sm font-medium text-[#020617] mb-2">Registration Fee</p>
                <p className="text-lg font-bold text-[#020617]">KSh {senderIdPricing.registrationFee.toLocaleString()}</p>
              </div>
              <div className="bg-[#F8FAFC] rounded-lg p-4 border border-[#E5E7EB]">
                <p className="text-sm font-medium text-[#020617] mb-2">Approval Timeline</p>
                <p className="text-sm text-[#64748B]">{senderIdPricing.approvalTimeline}</p>
              </div>
              <div className="bg-[#F8FAFC] rounded-lg p-4 border border-[#E5E7EB]">
                <p className="text-sm font-medium text-[#020617] mb-2">Description</p>
                <p className="text-sm text-[#64748B]">{senderIdPricing.description}</p>
              </div>
              <div className="bg-[#F8FAFC] rounded-lg p-4 border border-[#E5E7EB]">
                <p className="text-sm font-medium text-[#020617] mb-3">Required Documents ({senderIdPricing.requiredDocuments.length})</p>
                <ul className="space-y-1">
                  {senderIdPricing.requiredDocuments.map((doc, idx) => (
                    <li key={idx} className="text-sm text-[#64748B] flex items-start gap-2">
                      <span className="text-emerald-600 mt-0.5">•</span>
                      <span>{doc}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            <p className="text-sm text-[#64748B]">No Sender ID pricing configured. Click "Edit Sender ID Pricing" to set it up.</p>
          )}
        </Card>

        {/* Marketing Pricing Management Section */}
        <Card className="bg-white border-[#E5E7EB] rounded-xl shadow-sm border-l-4 border-l-teal-500 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Store className="w-5 h-5 text-teal-600" />
              <h2 className="text-xl font-semibold text-[#020617]">Marketing Pricing (Public Pages)</h2>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => {
                  setEditingMarketingPricing(marketingPricing || {
                    pageTitle: 'Simple, Transparent Pricing',
                    pageSubtitle: 'Scale your messaging without hidden fees. Only pay for what you send.',
                    tiers: [
                      {
                        name: 'Starter',
                        price: 'KSh 0.3',
                        priceDecimal: '',
                        unit: 'per SMS',
                        description: 'For growing businesses starting their SMS journey',
                        icon: 'Rocket',
                        accentColor: 'teal',
                        features: [
                          { text: 'Up to 10,000 SMS/month', category: 'Sending', highlight: false },
                          { text: 'Basic sender ID', category: 'Sending', highlight: false },
                          { text: 'REST API access', category: 'API', highlight: true },
                          { text: 'Email support', category: 'Support', highlight: false },
                          { text: 'Standard routing', category: 'Sending', highlight: false },
                          { text: 'Web dashboard', category: 'Support', highlight: false },
                        ],
                        cta: 'Get Started',
                        ctaSecondary: 'See full API docs',
                        highlighted: false,
                      },
                      {
                        name: 'Professional',
                        price: 'KSh 0.25',
                        priceDecimal: '',
                        unit: 'per SMS',
                        description: 'For established businesses with high volume',
                        icon: 'ShieldCheck',
                        accentColor: 'indigo',
                        features: [
                          { text: 'Unlimited SMS volume', category: 'Sending', highlight: true },
                          { text: 'Dedicated sender ID', category: 'Sending', highlight: false },
                          { text: 'REST + SMPP APIs', category: 'API', highlight: true },
                          { text: 'Priority 24/7 support', category: 'Support', highlight: false },
                          { text: 'Advanced analytics', category: 'Support', highlight: false },
                          { text: 'Carrier optimization', category: 'Sending', highlight: false },
                          { text: 'Webhook integration', category: 'API', highlight: false },
                          { text: 'Custom templates', category: 'Sending', highlight: false },
                        ],
                        cta: 'Start Free Trial',
                        ctaSecondary: 'Compare plans',
                        highlighted: true,
                        highlightReason: 'Best balance of cost + deliverability',
                      },
                    ],
                    volumeDiscounts: [
                      { volume: '1M - 10M', discount: '10%', price: 'KSh 0.26' },
                      { volume: '10M - 50M', discount: '15%', price: 'KSh 0.21' },
                      { volume: '50M - 100M', discount: '20%', price: 'KSh 0.15' },
                      { volume: '100M+', discount: 'Custom', price: 'Contact' },
                    ],
                  })
                  setShowMarketingEditor(true)
                }}
                className="bg-teal-600 hover:bg-teal-700 text-white font-medium"
              >
                <Edit className="w-4 h-4 mr-2" />
                Edit Marketing Pricing
              </Button>
            </div>
          </div>

          {marketingPricing ? (
            <div className="space-y-4">
              <div className="bg-[#F8FAFC] rounded-lg p-4 border border-[#E5E7EB]">
                <p className="text-sm font-medium text-[#020617] mb-2">Page Title</p>
                <p className="text-sm text-[#64748B]">{marketingPricing.pageTitle}</p>
              </div>
              <div className="bg-[#F8FAFC] rounded-lg p-4 border border-[#E5E7EB]">
                <p className="text-sm font-medium text-[#020617] mb-2">Page Subtitle</p>
                <p className="text-sm text-[#64748B]">{marketingPricing.pageSubtitle}</p>
              </div>
              <div className="bg-[#F8FAFC] rounded-lg p-4 border border-[#E5E7EB]">
                <p className="text-sm font-medium text-[#020617] mb-3">Pricing Tiers ({marketingPricing.tiers.length})</p>
                <div className="space-y-2">
                  {marketingPricing.tiers.map((tier, idx) => (
                    <div key={idx} className="flex items-center justify-between text-sm">
                      <span className="text-[#64748B]">{tier.name}</span>
                      <span className="font-medium text-[#020617]">{tier.price} {tier.unit}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-[#F8FAFC] rounded-lg p-4 border border-[#E5E7EB]">
                <p className="text-sm font-medium text-[#020617] mb-3">Volume Discounts ({marketingPricing.volumeDiscounts.length})</p>
                <div className="space-y-2">
                  {marketingPricing.volumeDiscounts.map((discount, idx) => (
                    <div key={idx} className="flex items-center justify-between text-sm">
                      <span className="text-[#64748B]">{discount.volume}</span>
                      <span className="font-medium text-[#020617]">{discount.discount} - {discount.price}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-[#64748B]">No marketing pricing configured. Click "Edit Marketing Pricing" to set it up.</p>
          )}
        </Card>

        {/* Edit Marketing Pricing Modal */}
        {showMarketingEditor && editingMarketingPricing && (
          <Dialog open={showMarketingEditor} onOpenChange={setShowMarketingEditor}>
            <DialogContent 
              overlayClassName="bg-black/40 backdrop-blur-sm"
              className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white border border-slate-200 rounded-2xl shadow-xl p-8 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 duration-150 ease-out [&>button]:text-slate-400 [&>button]:hover:text-slate-700 [&>button]:transition-colors"
            >
              <DialogHeader className="pb-5 border-b border-slate-200">
                <DialogTitle className="text-xl font-semibold text-slate-900">
                  Edit Marketing Pricing
                </DialogTitle>
                <DialogDescription className="text-slate-500 text-sm mt-1.5">
                  Configure the pricing information displayed on public pricing pages
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-8 mt-6">
                {/* Page Settings */}
                <div className="bg-slate-50 rounded-xl border border-slate-200 p-6 space-y-4">
                  <h3 className="text-lg font-semibold text-slate-900">Page Settings</h3>
                  <div>
                    <Label className="text-sm font-medium text-slate-900 mb-2 block">Page Title</Label>
                    <Input
                      value={editingMarketingPricing.pageTitle}
                      onChange={(e) => setEditingMarketingPricing({ ...editingMarketingPricing, pageTitle: e.target.value })}
                      className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-slate-900 mb-2 block">Page Subtitle</Label>
                    <Input
                      value={editingMarketingPricing.pageSubtitle}
                      onChange={(e) => setEditingMarketingPricing({ ...editingMarketingPricing, pageSubtitle: e.target.value })}
                      className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition"
                    />
                  </div>
                </div>

                {/* Pricing Tiers */}
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-slate-900">Pricing Tiers</h3>
                    <Button
                      onClick={() => {
                        setEditingMarketingPricing({
                          ...editingMarketingPricing,
                          tiers: [
                            ...editingMarketingPricing.tiers,
                            {
                              name: 'New Tier',
                              price: 'KSh 0.00',
                              priceDecimal: '',
                              unit: 'per SMS',
                              description: '',
                              icon: 'Rocket',
                              accentColor: 'teal',
                              features: [],
                              cta: 'Get Started',
                              ctaSecondary: 'Learn more',
                              highlighted: false,
                            },
                          ],
                        })
                      }}
                      size="sm"
                      className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 rounded-xl"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Tier
                    </Button>
                  </div>
                  <div className="space-y-4">
                    {editingMarketingPricing.tiers.map((tier, tierIdx) => (
                      <div key={tierIdx} className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 space-y-4 relative">
                        {tier.highlighted && (
                          <div className="absolute top-4 right-4">
                            <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-medium">
                              Most Popular
                            </Badge>
                          </div>
                        )}
                        <div className="flex items-center justify-between">
                          <h4 className="font-semibold text-slate-900">Tier {tierIdx + 1}</h4>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const newTiers = editingMarketingPricing.tiers.filter((_, i) => i !== tierIdx)
                              setEditingMarketingPricing({ ...editingMarketingPricing, tiers: newTiers })
                            }}
                            className="text-slate-400 hover:text-red-600 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label className="text-sm font-medium text-slate-900 mb-2 block">Name</Label>
                            <Input
                              value={tier.name}
                              onChange={(e) => {
                                const newTiers = [...editingMarketingPricing.tiers]
                                newTiers[tierIdx].name = e.target.value
                                setEditingMarketingPricing({ ...editingMarketingPricing, tiers: newTiers })
                              }}
                              className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition"
                            />
                          </div>
                          <div>
                            <Label className="text-sm font-medium text-slate-900 mb-2 block">Price</Label>
                            <Input
                              value={tier.price}
                              onChange={(e) => {
                                const newTiers = [...editingMarketingPricing.tiers]
                                newTiers[tierIdx].price = e.target.value
                                setEditingMarketingPricing({ ...editingMarketingPricing, tiers: newTiers })
                              }}
                              className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition"
                              placeholder="KSh 2.50"
                            />
                          </div>
                          <div>
                            <Label className="text-sm font-medium text-slate-900 mb-2 block">Unit</Label>
                            <Input
                              value={tier.unit}
                              onChange={(e) => {
                                const newTiers = [...editingMarketingPricing.tiers]
                                newTiers[tierIdx].unit = e.target.value
                                setEditingMarketingPricing({ ...editingMarketingPricing, tiers: newTiers })
                              }}
                              className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition"
                              placeholder="per SMS"
                            />
                          </div>
                          <div>
                            <Label className="text-sm font-medium text-slate-900 mb-2 block">Description</Label>
                            <Input
                              value={tier.description}
                              onChange={(e) => {
                                const newTiers = [...editingMarketingPricing.tiers]
                                newTiers[tierIdx].description = e.target.value
                                setEditingMarketingPricing({ ...editingMarketingPricing, tiers: newTiers })
                              }}
                              className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition"
                            />
                          </div>
                          <div>
                            <Label className="text-sm font-medium text-slate-900 mb-2 block">Icon</Label>
                            <Select
                              value={tier.icon}
                              onValueChange={(value) => {
                                const newTiers = [...editingMarketingPricing.tiers]
                                newTiers[tierIdx].icon = value
                                setEditingMarketingPricing({ ...editingMarketingPricing, tiers: newTiers })
                              }}
                            >
                              <SelectTrigger className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-0 focus:border-emerald-500 transition [&_svg]:text-slate-400">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-white border border-slate-200 rounded-xl shadow-lg">
                                <SelectItem value="Rocket">Rocket</SelectItem>
                                <SelectItem value="ShieldCheck">ShieldCheck</SelectItem>
                                <SelectItem value="Building2">Building2</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label className="text-sm font-medium text-slate-900 mb-2 block">Accent Color</Label>
                            <Select
                              value={tier.accentColor}
                              onValueChange={(value: 'teal' | 'indigo' | 'slate') => {
                                const newTiers = [...editingMarketingPricing.tiers]
                                newTiers[tierIdx].accentColor = value
                                setEditingMarketingPricing({ ...editingMarketingPricing, tiers: newTiers })
                              }}
                            >
                              <SelectTrigger className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-0 focus:border-emerald-500 transition [&_svg]:text-slate-400">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-white border border-slate-200 rounded-xl shadow-lg">
                                <SelectItem value="teal">Teal</SelectItem>
                                <SelectItem value="indigo">Indigo</SelectItem>
                                <SelectItem value="slate">Slate</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label className="text-sm font-medium text-slate-900 mb-2 block">CTA Button Text</Label>
                            <Input
                              value={tier.cta}
                              onChange={(e) => {
                                const newTiers = [...editingMarketingPricing.tiers]
                                newTiers[tierIdx].cta = e.target.value
                                setEditingMarketingPricing({ ...editingMarketingPricing, tiers: newTiers })
                              }}
                              className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition"
                            />
                          </div>
                          <div>
                            <Label className="text-sm font-medium text-slate-900 mb-2 block">Secondary CTA</Label>
                            <Input
                              value={tier.ctaSecondary}
                              onChange={(e) => {
                                const newTiers = [...editingMarketingPricing.tiers]
                                newTiers[tierIdx].ctaSecondary = e.target.value
                                setEditingMarketingPricing({ ...editingMarketingPricing, tiers: newTiers })
                              }}
                              className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition"
                            />
                          </div>
                        </div>
                        <div className="flex items-center gap-4 pt-2 border-t border-slate-200">
                          <label className="flex items-center gap-2.5 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={tier.highlighted}
                              onChange={(e) => {
                                const newTiers = [...editingMarketingPricing.tiers]
                                newTiers[tierIdx].highlighted = e.target.checked
                                setEditingMarketingPricing({ ...editingMarketingPricing, tiers: newTiers })
                              }}
                              className="w-4 h-4 accent-emerald-600 border-slate-300 rounded focus:ring-2 focus:ring-emerald-500 focus:ring-offset-0 cursor-pointer transition-colors"
                            />
                            <span className="text-sm text-slate-900">Highlighted (Most Popular)</span>
                          </label>
                        </div>
                        {tier.highlighted && (
                          <div>
                            <Label className="text-sm font-medium text-slate-900 mb-2 block">Highlight Reason</Label>
                            <Input
                              value={tier.highlightReason || ''}
                              onChange={(e) => {
                                const newTiers = [...editingMarketingPricing.tiers]
                                newTiers[tierIdx].highlightReason = e.target.value
                                setEditingMarketingPricing({ ...editingMarketingPricing, tiers: newTiers })
                              }}
                              className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition"
                              placeholder="Best balance of cost + deliverability"
                            />
                          </div>
                        )}
                        <div className="pt-2 border-t border-slate-200">
                          <Label className="text-sm font-medium text-slate-900 mb-3 block">Features</Label>
                          <div className="space-y-2">
                            {tier.features.map((feature, featureIdx) => (
                              <div key={featureIdx} className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center gap-3">
                                <Input
                                  value={feature.text}
                                  onChange={(e) => {
                                    const newTiers = [...editingMarketingPricing.tiers]
                                    newTiers[tierIdx].features[featureIdx].text = e.target.value
                                    setEditingMarketingPricing({ ...editingMarketingPricing, tiers: newTiers })
                                  }}
                                  className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition"
                                  placeholder="Feature text"
                                />
                                <Input
                                  value={feature.category}
                                  onChange={(e) => {
                                    const newTiers = [...editingMarketingPricing.tiers]
                                    newTiers[tierIdx].features[featureIdx].category = e.target.value
                                    setEditingMarketingPricing({ ...editingMarketingPricing, tiers: newTiers })
                                  }}
                                  className="w-32 rounded-xl border border-slate-200 bg-white px-4 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition"
                                  placeholder="Category"
                                />
                                <label className="flex items-center gap-2 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={feature.highlight}
                                    onChange={(e) => {
                                      const newTiers = [...editingMarketingPricing.tiers]
                                      newTiers[tierIdx].features[featureIdx].highlight = e.target.checked
                                      setEditingMarketingPricing({ ...editingMarketingPricing, tiers: newTiers })
                                    }}
                                    className="w-4 h-4 accent-emerald-600 border-slate-300 rounded focus:ring-2 focus:ring-emerald-500 focus:ring-offset-0 cursor-pointer transition-colors"
                                  />
                                  <span className="text-xs text-slate-600">Highlight</span>
                                </label>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    const newTiers = [...editingMarketingPricing.tiers]
                                    newTiers[tierIdx].features = newTiers[tierIdx].features.filter((_, i) => i !== featureIdx)
                                    setEditingMarketingPricing({ ...editingMarketingPricing, tiers: newTiers })
                                  }}
                                  className="text-slate-400 hover:text-red-600 transition-colors"
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </div>
                            ))}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const newTiers = [...editingMarketingPricing.tiers]
                                newTiers[tierIdx].features.push({ text: '', category: 'Sending', highlight: false })
                                setEditingMarketingPricing({ ...editingMarketingPricing, tiers: newTiers })
                              }}
                              className="w-full bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 rounded-xl"
                            >
                              <Plus className="w-4 h-4 mr-2" />
                              Add Feature
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Volume Discounts */}
                <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-slate-900">Volume Discounts</h3>
                    <Button
                      onClick={() => {
                        setEditingMarketingPricing({
                          ...editingMarketingPricing,
                          volumeDiscounts: [
                            ...editingMarketingPricing.volumeDiscounts,
                            { volume: '', discount: '', price: '' },
                          ],
                        })
                      }}
                      size="sm"
                      className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 rounded-xl"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Discount
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {editingMarketingPricing.volumeDiscounts.map((discount, discountIdx) => (
                      <div key={discountIdx} className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex gap-2 items-center">
                        <Input
                          value={discount.volume}
                          onChange={(e) => {
                            const newDiscounts = [...editingMarketingPricing.volumeDiscounts]
                            newDiscounts[discountIdx].volume = e.target.value
                            setEditingMarketingPricing({ ...editingMarketingPricing, volumeDiscounts: newDiscounts })
                          }}
                          className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition"
                          placeholder="1M - 10M"
                        />
                        <Input
                          value={discount.discount}
                          onChange={(e) => {
                            const newDiscounts = [...editingMarketingPricing.volumeDiscounts]
                            newDiscounts[discountIdx].discount = e.target.value
                            setEditingMarketingPricing({ ...editingMarketingPricing, volumeDiscounts: newDiscounts })
                          }}
                          className="w-32 rounded-xl border border-slate-200 bg-white px-4 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition"
                          placeholder="10%"
                        />
                        <Input
                          value={discount.price}
                          onChange={(e) => {
                            const newDiscounts = [...editingMarketingPricing.volumeDiscounts]
                            newDiscounts[discountIdx].price = e.target.value
                            setEditingMarketingPricing({ ...editingMarketingPricing, volumeDiscounts: newDiscounts })
                          }}
                          className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition"
                          placeholder="KSh 2.25"
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const newDiscounts = editingMarketingPricing.volumeDiscounts.filter((_, i) => i !== discountIdx)
                            setEditingMarketingPricing({ ...editingMarketingPricing, volumeDiscounts: newDiscounts })
                          }}
                          className="text-slate-400 hover:text-red-600 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3 pt-4 border-t border-slate-200">
                  <Button
                    onClick={handleSaveMarketingPricing}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-xl shadow-sm active:scale-95 focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 transition-all duration-150"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Save Marketing Pricing
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowMarketingEditor(false)
                      setEditingMarketingPricing(null)
                    }}
                    className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 rounded-xl transition-all duration-150"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* Edit Sender ID Pricing Modal */}
        {showSenderIdEditor && editingSenderIdPricing && (
          <Dialog open={showSenderIdEditor} onOpenChange={setShowSenderIdEditor}>
            <DialogContent 
              overlayClassName="bg-black/40 backdrop-blur-sm"
              className="max-w-2xl bg-white border border-slate-200 rounded-2xl shadow-xl p-8 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 duration-150 ease-out [&>button]:text-slate-400 [&>button]:hover:text-slate-700 [&>button]:transition-colors"
            >
              <DialogHeader className="pb-5 border-b border-slate-200">
                <DialogTitle className="text-xl font-semibold text-slate-900">
                  Edit Sender ID Pricing
                </DialogTitle>
                <DialogDescription className="text-slate-500 text-sm mt-1.5">
                  Configure the Sender ID pricing information displayed on public pages
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-5 mt-6 max-h-[70vh] overflow-y-auto">
                {/* Registration Fee */}
                <div>
                  <Label className="text-sm font-medium text-slate-900 mb-2 block">Registration Fee (KSh)</Label>
                  <Input
                    type="number"
                    step="1"
                    value={editingSenderIdPricing.registrationFee || ''}
                    onChange={(e) =>
                      setEditingSenderIdPricing({
                        ...editingSenderIdPricing,
                        registrationFee: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="rounded-xl border border-slate-200 bg-white text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition"
                  />
                </div>

                {/* Approval Timeline */}
                <div>
                  <Label className="text-sm font-medium text-slate-900 mb-2 block">Approval Timeline</Label>
                  <Input
                    type="text"
                    value={editingSenderIdPricing.approvalTimeline || ''}
                    onChange={(e) =>
                      setEditingSenderIdPricing({
                        ...editingSenderIdPricing,
                        approvalTimeline: e.target.value,
                      })
                    }
                    className="rounded-xl border border-slate-200 bg-white text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition"
                    placeholder="3-5 business days after document submission"
                  />
                </div>

                {/* Description */}
                <div>
                  <Label className="text-sm font-medium text-slate-900 mb-2 block">Description</Label>
                  <Textarea
                    value={editingSenderIdPricing.description || ''}
                    onChange={(e) =>
                      setEditingSenderIdPricing({
                        ...editingSenderIdPricing,
                        description: e.target.value,
                      })
                    }
                    className="rounded-xl border border-slate-200 bg-white text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition min-h-[100px]"
                    placeholder="One-time setup fee for new Sender ID registration and approval processing. No annual renewal fees."
                  />
                </div>

                {/* Required Documents */}
                <div>
                  <Label className="text-sm font-medium text-slate-900 mb-2 block">Required Documents</Label>
                  <div className="space-y-2">
                    {editingSenderIdPricing.requiredDocuments.map((doc, idx) => (
                      <div key={idx} className="flex gap-2 items-center">
                        <Input
                          value={doc}
                          onChange={(e) => {
                            const newDocs = [...editingSenderIdPricing.requiredDocuments]
                            newDocs[idx] = e.target.value
                            setEditingSenderIdPricing({
                              ...editingSenderIdPricing,
                              requiredDocuments: newDocs,
                            })
                          }}
                          className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition"
                          placeholder="Document name"
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const newDocs = editingSenderIdPricing.requiredDocuments.filter((_, i) => i !== idx)
                            setEditingSenderIdPricing({
                              ...editingSenderIdPricing,
                              requiredDocuments: newDocs,
                            })
                          }}
                          className="text-slate-400 hover:text-red-600 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditingSenderIdPricing({
                          ...editingSenderIdPricing,
                          requiredDocuments: [
                            ...editingSenderIdPricing.requiredDocuments,
                            '',
                          ],
                        })
                      }}
                      className="w-full bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 rounded-xl"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Document
                    </Button>
                  </div>
                </div>

                <div className="flex gap-3 pt-4 border-t border-slate-200">
                  <Button
                    onClick={handleSaveSenderIdPricing}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-xl shadow-sm active:scale-95 focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 transition-all duration-150"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Save Sender ID Pricing
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowSenderIdEditor(false)
                      setEditingSenderIdPricing(null)
                    }}
                    className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 rounded-xl transition-all duration-150"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {editingRule && (
          <PricingRuleEditorDialog
            open={!!editingRule}
            onOpenChange={(open) => !open && setEditingRule(null)}
            rule={editingRule}
            title={editingRule.scope === 'global' ? 'Edit Global Rule' : 'Edit User Override'}
            description={
              editingRule.scope === 'user' && getAccountForRule(editingRule)
                ? `${getAccountForRule(editingRule)?.name} (${getAccountForRule(editingRule)?.email})`
                : 'Configure both the price charged and how many characters that price covers'
            }
            onChange={setEditingRule}
            onSave={handleSave}
          />
        )}
      </div>
    </div>
  )
}

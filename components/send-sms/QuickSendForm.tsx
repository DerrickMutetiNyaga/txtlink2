'use client'

import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import {
  Send,
  MessageSquare,
  Wallet,
  Phone,
  Clock,
  Zap,
  CheckCircle2,
  Plus,
} from 'lucide-react'
import Link from 'next/link'
import { useState, useCallback, useEffect } from 'react'
import { authFetch } from '@/lib/utils/auth'

interface QuickSendFormProps {
  balance: number
  // Optional pricing info for money-equivalent estimates
  pricePerCreditKes?: number
  onBalanceUpdate?: (newBalance: number) => void
}

interface SenderIdOption {
  id: string
  senderName: string
  status: 'pending' | 'active' | 'approved' | 'rejected'
  isDefault: boolean
}

export function QuickSendForm({
  balance,
  pricePerCreditKes,
  onBalanceUpdate,
}: QuickSendFormProps) {
  const [message, setMessage] = useState('')
  const [recipient, setRecipient] = useState('')
  const [senderIdId, setSenderIdId] = useState<string>('')
  const [schedule, setSchedule] = useState('now')
  const [priority, setPriority] = useState('normal')
  const [isSending, setIsSending] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [senderIds, setSenderIds] = useState<SenderIdOption[]>([])
  const [loadingSenderIds, setLoadingSenderIds] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [phoneError, setPhoneError] = useState<string | null>(null)

  // Auto-format phone number as user types
  const formatPhoneNumberInput = (value: string): string => {
    // Remove all non-digit characters except +
    const cleaned = value.replace(/[^\d+]/g, '')
    
    // If starts with +, keep it
    if (cleaned.startsWith('+')) {
      // If it's +254, format as +254XXXXXXXXX
      if (cleaned.startsWith('+254')) {
        const digits = cleaned.substring(4).replace(/\D/g, '').slice(0, 9)
        return `+254${digits}`
      }
      // If it's +7 (Russia), suggest +254
      if (cleaned.startsWith('+7') && cleaned.length > 2) {
        return cleaned // Keep as is, validation will catch it
      }
      return cleaned
    }
    
    // If starts with 0, convert to +254
    if (cleaned.startsWith('0')) {
      const digits = cleaned.substring(1).replace(/\D/g, '').slice(0, 9)
      return `+254${digits}`
    }
    
    // If starts with 7 or 1 (Kenya mobile without country code), add +254
    if (cleaned.startsWith('7') || cleaned.startsWith('1')) {
      const digits = cleaned.replace(/\D/g, '').slice(0, 9)
      if (digits.length === 9) {
        return `+254${digits}`
      }
      return `+254${digits}`
    }
    
    // If starts with 254, add +
    if (cleaned.startsWith('254')) {
      const digits = cleaned.replace(/\D/g, '').slice(0, 12) // +254 + 9 digits
      return `+${digits}`
    }
    
    // Otherwise, just return cleaned digits (will be validated)
    return cleaned
  }

  // Validate phone number format
  const validatePhoneNumber = (phone: string): { valid: boolean; error: string | null } => {
    if (!phone || phone.trim().length === 0) {
      return { valid: false, error: 'Phone number is required' }
    }
    
    const formatted = formatPhoneNumberInput(phone)
    
    if (!formatted.startsWith('+')) {
      return { valid: false, error: 'Must include country code (e.g., +254)' }
    }
    
    if (formatted.startsWith('+254')) {
      const digits = formatted.substring(4).replace(/\D/g, '')
      if (digits.length !== 9) {
        return { valid: false, error: 'Kenya number must be +254 followed by 9 digits' }
      }
      if (!digits.startsWith('7') && !digits.startsWith('1')) {
        return { valid: false, error: 'Kenya mobile numbers must start with 7 or 1' }
      }
      return { valid: true, error: null }
    }
    
    if (formatted.startsWith('+7')) {
      return { valid: false, error: 'Did you mean Kenya (+254)?' }
    }
    
    // For other countries, basic validation
    if (formatted.length < 10) {
      return { valid: false, error: 'Phone number too short' }
    }
    
    return { valid: true, error: null }
  }

  // Handle recipient input change with auto-formatting
  const handleRecipientChange = (value: string) => {
    const formatted = formatPhoneNumberInput(value)
    setRecipient(formatted)
    
    // Validate and show error
    const validation = validatePhoneNumber(formatted)
    setPhoneError(validation.error)
  }

  // Fetch sender IDs on mount
  useEffect(() => {
    const fetchSenderIds = async () => {
      try {
        setLoadingSenderIds(true)
        const token = localStorage.getItem('token')
        if (!token) {
          setLoadingSenderIds(false)
          return
        }

        // Use authFetch which automatically handles 401 and redirects to login
        const response = await authFetch('/api/senderids', {
          method: 'GET',
        })

        if (!response.ok) {
          throw new Error('Failed to fetch sender IDs')
        }

        const data = await response.json()
        if (data.success && data.senderIds) {
          // Accept both 'active' and 'approved' statuses (API converts 'active' to 'approved')
          const activeSenderIds = data.senderIds.filter((sid: SenderIdOption) => 
            sid.status === 'active' || sid.status === 'approved'
          )
          setSenderIds(activeSenderIds)
          
          // Set default sender ID - prioritize default, then first active
          if (activeSenderIds.length > 0) {
            const defaultId = activeSenderIds.find((sid: SenderIdOption) => sid.isDefault)
            if (defaultId) {
              setSenderIdId(defaultId.id)
            } else {
              setSenderIdId(activeSenderIds[0].id)
            }
          }
        }
      } catch (err) {
        // Only log if it's not a network error
        if (err instanceof TypeError && err.message.includes('fetch')) {
          // Network error, don't log
        } else {
          console.error('Failed to fetch sender IDs:', err)
        }
      } finally {
        setLoadingSenderIds(false)
      }
    }

    fetchSenderIds()
  }, [])

  // Calculations (credits-based)
  const charCount = message.length
  const smsSegments = Math.ceil(charCount / 153) || 0
  const estimatedCredits = smsSegments // single recipient
  const hasSufficientBalance = balance >= estimatedCredits
  const phoneValidation = validatePhoneNumber(recipient)
  const isValid = recipient.length > 0 && message.length > 0 && hasSufficientBalance && senderIdId.length > 0 && phoneValidation.valid

  const effectivePriceKes = pricePerCreditKes || 0
  const estimatedCostKes = effectivePriceKes * estimatedCredits

  const handleSend = useCallback(async () => {
    if (!isValid) return

    setIsSending(true)
    setError(null)

    // Optimistically calculate new balance (instant UI update)
    const segments = Math.ceil(message.length / 153) || 0
    const estimatedCreditsLocal = segments
    const optimisticBalance = balance - estimatedCreditsLocal

    // Update balance immediately (optimistic update)
    if (onBalanceUpdate) {
      onBalanceUpdate(optimisticBalance)
    }

    try {
      // Use authFetch which automatically handles 401 and redirects to login
      const response = await authFetch('/api/sms/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipient,
          message,
          senderIdId, // Use ID instead of name
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        // Revert optimistic update on error
        if (onBalanceUpdate) {
          onBalanceUpdate(balance)
        }
        
        // Check if it's a phone number validation error
        if (data.errorCode === 'INVALID_PHONE_NUMBER' || 
            (data.error && (
              data.error.toLowerCase().includes('invalid phone') ||
              data.error.toLowerCase().includes('invalid number') ||
              data.error.toLowerCase().includes('phone number format')
            ))) {
          setPhoneError(data.error || 'Invalid phone number format')
          throw new Error(data.error || 'Invalid phone number format')
        }
        
        throw new Error(data.error || data.details || 'Failed to send SMS')
      }

      // Update with real balance from server (more accurate)
      if (data.newBalance !== undefined && onBalanceUpdate) {
        onBalanceUpdate(data.newBalance)
      }

      // Dispatch custom event for header widget to update
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('balanceUpdated', { 
          detail: { newBalance: data.newBalance || optimisticBalance } 
        }))
      }

      setIsSuccess(true)
      // Reset form after 2 seconds
      setTimeout(() => {
        setIsSuccess(false)
        setMessage('')
        setRecipient('')
      }, 2000)
    } catch (err: any) {
      setError(err.message || 'Failed to send SMS. Please try again.')
      console.error('SMS send error:', err)
    } finally {
      setIsSending(false)
    }
  }, [recipient, message, senderIdId, isValid, balance, onBalanceUpdate])

  // Keyboard shortcut: ⌘+Enter to send
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && isValid && !isSending) {
        e.preventDefault()
        handleSend()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isValid, isSending, handleSend])

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      {/* Left: Message Composer (Primary) */}
      <div className="lg:col-span-2">
<<<<<<< HEAD
        <Card className="p-4 sm:p-8 bg-white border border-slate-200/80 rounded-2xl shadow-sm">
=======
        <Card className="p-8 bg-white border border-slate-200/80 rounded-2xl shadow-sm">
>>>>>>> 4a3d95970903f9fc28665c46227114641494cea8
          {/* Success Animation */}
          {isSuccess && (
            <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200/50 rounded-xl animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <div>
                  <p className="text-sm font-semibold text-emerald-900">Message sent successfully!</p>
                  <p className="text-xs text-emerald-700">Your SMS has been queued for delivery.</p>
                </div>
              </div>
            </div>
          )}

          {/* Insufficient Balance Warning */}
          {recipient.length > 0 && message.length > 0 && senderIdId.length > 0 && !hasSufficientBalance && (
            <div className="mb-6 p-4 bg-amber-50 border border-amber-200/50 rounded-xl animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-amber-600 flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-xs font-bold">!</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-amber-900">Insufficient Balance</p>
                  <p className="text-xs text-amber-700 mt-1">
                    You need {estimatedCredits.toLocaleString()} SMS credits to send this message, but you only have{' '}
                    {balance.toLocaleString()}.
                    <Link href="/app/billing" className="underline font-medium ml-1 hover:text-amber-900">
                      Add funds to continue
                    </Link>
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200/50 rounded-xl animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-red-600 flex items-center justify-center">
                  <span className="text-white text-xs font-bold">×</span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-red-900">Failed to send SMS</p>
                  <p className="text-xs text-red-700">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Sender ID + Recipient (Grouped) */}
          <div className="grid md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Sender ID</label>
              {loadingSenderIds ? (
                <div className="h-12 bg-slate-50 border border-slate-200/70 rounded-xl flex items-center justify-center">
                  <div className="flex items-center gap-2 text-slate-500">
                    <div className="w-4 h-4 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
                    <span className="text-sm">Loading sender IDs...</span>
                  </div>
                </div>
              ) : (() => {
                // Accept both 'active' and 'approved' statuses
                const activeSenderIds = senderIds.filter((sid) => 
                  sid.status === 'active' || sid.status === 'approved'
                )
                
                // If only one sender ID, show it directly
                if (activeSenderIds.length === 1) {
                  const singleSenderId = activeSenderIds[0]
                  return (
                    <div className="h-12 bg-slate-50 border border-slate-200/70 rounded-xl flex items-center justify-between px-4">
                      <div className="flex items-center gap-2">
                        <span className="text-base font-medium text-slate-900">{singleSenderId.senderName}</span>
                        {singleSenderId.isDefault && (
                          <span className="text-xs px-2 py-0.5 bg-teal-100 text-teal-700 rounded-full font-medium">
                            Default
                          </span>
                        )}
                      </div>
                    </div>
                  )
                }
                
                // If multiple sender IDs, show dropdown
                if (activeSenderIds.length > 1) {
                  return (
                    <>
                      <Select
                        value={senderIdId}
                        onValueChange={setSenderIdId}
                        disabled={loadingSenderIds}
                      >
                        <SelectTrigger className="h-12 bg-white border border-gray-200 focus:bg-white focus:outline-none focus:ring-0 focus:border-gray-400 rounded-xl [&>span]:text-slate-500 [&>span[data-placeholder]]:text-slate-400 transition-colors">
                          <SelectValue placeholder="Select sender ID" />
                        </SelectTrigger>
                        <SelectContent className="bg-white border-slate-200">
                          {activeSenderIds.map((sid) => (
                            <SelectItem key={sid.id} value={sid.id}>
                              <div className="flex items-center gap-2">
                                <span>{sid.senderName}</span>
                                {sid.isDefault && (
                                  <span className="text-xs text-teal-600">(Default)</span>
                                )}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </>
                  )
                }
                
                // No sender IDs
                return (
                  <>
                    <div className="h-12 bg-slate-50 border border-slate-200/70 rounded-xl flex items-center justify-center">
                      <span className="text-sm text-slate-500">No sender IDs available</span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1.5">
                      No sender IDs assigned. Contact admin to assign sender IDs.
                    </p>
                  </>
                )
              })()}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Recipient</label>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  type="tel"
                  value={recipient}
                  onChange={(e) => handleRecipientChange(e.target.value)}
                  placeholder="0796030992 or +254796030992"
                  className={`h-12 pl-11 bg-white border ${
                    phoneError ? 'border-red-300 focus:border-red-500' : 'border-gray-200 focus:border-gray-400'
                  } focus:bg-white focus:outline-none focus:ring-0 rounded-xl text-base text-slate-900 placeholder:text-slate-400 transition-colors`}
                />
              </div>
              {phoneError ? (
                <p className="text-xs text-red-600 mt-1.5">{phoneError}</p>
              ) : (
                <p className="text-xs text-slate-500 mt-1.5">
                  Enter number (auto-formats to +254): 0796030992 or +254796030992
                </p>
              )}
            </div>
          </div>

          {/* Message Composer (Hero) */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-700 mb-2">Message</label>
            <div className="relative">
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type your message here..."
                rows={10}
                maxLength={480}
                className="w-full px-4 py-4 pr-24 bg-white border border-gray-200 focus:bg-white focus:outline-none focus:ring-0 focus:border-gray-400 rounded-xl text-base text-slate-900 placeholder:text-slate-400 resize-none leading-relaxed transition-colors"
              />
              {/* Live Counter - Bottom Right */}
              <div className="absolute bottom-4 right-4 flex items-center gap-2">
                <span className="text-xs font-medium text-slate-500">
                  {charCount}/153
                </span>
                <span className="text-slate-300">•</span>
                <span className="text-xs font-medium text-slate-500">
                  {smsSegments} segment{smsSegments !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
          </div>

          {/* Delivery Options - Collapsed Accordion */}
          <Accordion type="single" collapsible className="mb-6">
            <AccordionItem value="delivery-options" className="border border-slate-200/60 rounded-xl px-4">
              <AccordionTrigger className="text-sm font-medium text-slate-700 hover:no-underline py-4">
                <div className="flex items-center gap-2">
                  <Clock size={16} />
                  <span>Delivery Options</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pb-4">
                <div className="grid md:grid-cols-2 gap-4 pt-2">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Schedule</label>
                    <Select value={schedule} onValueChange={setSchedule}>
                      <SelectTrigger className="h-11 bg-white border border-gray-200 focus:bg-white focus:outline-none focus:ring-0 focus:border-gray-400 rounded-xl transition-colors">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="now">Send Now</SelectItem>
                        <SelectItem value="later">Schedule Later</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Priority</label>
                    <Select value={priority} onValueChange={setPriority}>
                      <SelectTrigger className="h-11 bg-white border border-gray-200 focus:bg-white focus:outline-none focus:ring-0 focus:border-gray-400 rounded-xl transition-colors">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="normal">Normal</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          {/* Primary Action - Send Button */}
          <div className="space-y-2">
            <Button
              onClick={handleSend}
              disabled={!isValid || isSending}
              className="w-full h-12 bg-[#0F766E] hover:bg-[#115E59] text-white text-base font-semibold rounded-xl shadow-sm hover:shadow-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSending ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                  Sending...
                </>
              ) : (
                <>
                  <Send size={18} className="mr-2" />
                  Send Message
<<<<<<< HEAD
                  <span className="ml-2 text-xs opacity-70 hidden sm:inline">⌘+Enter</span>
=======
                  <span className="ml-2 text-xs opacity-70">⌘+Enter</span>
>>>>>>> 4a3d95970903f9fc28665c46227114641494cea8
                </>
              )}
            </Button>
            {!isValid && recipient.length > 0 && message.length > 0 && senderIdId.length > 0 && !hasSufficientBalance && (
              <p className="text-xs text-center text-amber-600 font-medium">
                ⚠️ Insufficient balance. Add {(estimatedCredits - balance).toLocaleString()} more credits to send this message
              </p>
            )}
            {!isValid && (!recipient.length || !message.length || !senderIdId.length) && (
              <p className="text-xs text-center text-slate-500">
                Please fill in all required fields to send
              </p>
            )}
          </div>
        </Card>
      </div>

      {/* Right: Smart Sidebar */}
      <div className="space-y-6">
        {/* Cost Estimate Card */}
        <Card className="p-6 bg-white border border-slate-200/80 rounded-2xl shadow-sm">
          <div className="flex items-center gap-3 mb-5">
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/60">
              <MessageSquare size={18} className="text-[#0F766E]" />
            </div>
            <h3 className="text-base font-semibold text-slate-900">Cost Estimate</h3>
          </div>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between text-slate-600">
              <span>SMS Segments:</span>
              <span className="font-medium text-slate-900">{smsSegments}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Cost:</span>
              <span className="font-medium text-slate-900">1 credit per 153 characters</span>
            </div>
            <div className="border-t border-slate-200 pt-3 mt-3">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-slate-900">Estimated usage:</span>
                <span className="text-xl font-bold text-[#0F766E]">
                  {estimatedCredits.toLocaleString()} credits
                </span>
              </div>
              {effectivePriceKes > 0 && (
                <p className="mt-1 text-xs text-slate-500 text-right">
                  ≈ KSh {estimatedCostKes.toFixed(2)} at KSh {effectivePriceKes.toFixed(2)} per credit
                </p>
              )}
            </div>
          </div>
        </Card>

        {/* Account Balance Card */}
        <Card className="p-6 bg-white border border-slate-200/80 rounded-2xl shadow-sm">
          <div className="flex items-center gap-3 mb-5">
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/60">
              <Wallet size={18} className="text-[#0F766E]" />
            </div>
            <h3 className="text-base font-semibold text-slate-900">Account Balance</h3>
          </div>
          <div className="text-3xl font-bold text-slate-900 mb-2">
            {balance.toLocaleString()} credits
          </div>
          <p
            className={`text-sm mb-4 ${
              hasSufficientBalance ? 'text-emerald-600' : 'text-red-600'
            }`}
          >
            {hasSufficientBalance ? '✓ Sufficient balance' : 'Insufficient balance'}
          </p>
          <Link href="/app/billing">
            <Button className="w-full h-11 bg-gradient-to-r from-emerald-600 to-emerald-500 text-white rounded-xl text-sm font-medium shadow-sm ring-1 ring-emerald-400/30 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200">
              <Plus size={14} className="mr-1.5" />
              Add Funds
            </Button>
          </Link>
        </Card>

        {/* Delivery Info Card */}
        <Card className="p-6 bg-white border border-slate-200/80 rounded-2xl shadow-sm">
          <div className="flex items-center gap-3 mb-5">
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/60">
              <Zap size={18} className="text-[#0F766E]" />
            </div>
            <h3 className="text-base font-semibold text-slate-900">Delivery Info</h3>
          </div>
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-2">
              <Clock size={14} className="text-slate-400 mt-0.5" />
              <div>
                <p className="font-medium text-slate-900">Estimated delivery</p>
                <p className="text-slate-500">2-5 seconds</p>
              </div>
            </div>
            <div className="flex items-start gap-2 pt-2 border-t border-slate-100">
              <CheckCircle2 size={14} className="text-slate-400 mt-0.5" />
              <div>
                <p className="font-medium text-slate-900">Compliance</p>
                <p className="text-slate-500">GDPR compliant, opt-out enabled</p>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}


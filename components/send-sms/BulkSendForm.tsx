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
import React, { useState, useEffect } from 'react'
import {
  Upload,
  Users,
  Check,
  ArrowRight,
  Send,
  Loader2,
  FileText,
  AlertCircle,
  Plus,
} from 'lucide-react'
import Link from 'next/link'
import { authFetch } from '@/lib/utils/auth'

interface BulkSendFormProps {
  balance: number
  pricePerCreditKes?: number
}

// Mock data
const csvPreview = [
  { phone: '+254712345678', name: 'John Doe' },
  { phone: '+254723456789', name: 'Jane Smith' },
  { phone: '+254734567890', name: 'Bob Johnson' },
]
const totalRows = 1250
const validNumbers = 1230
const invalidNumbers = 20
const duplicatesRemoved = 5


interface SenderIdOption {
  id: string
  senderName: string
  status: 'pending' | 'active' | 'approved' | 'rejected'
  isDefault: boolean
}

export function BulkSendForm({ balance, pricePerCreditKes }: BulkSendFormProps) {
  const [bulkStep, setBulkStep] = useState<1 | 2 | 3 | 4>(1)
  const [audienceMethod, setAudienceMethod] = useState<'csv' | 'manual'>('manual')
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [manualNumbers, setManualNumbers] = useState<string>('')
  const [bulkMessage, setBulkMessage] = useState('')
  const [bulkSenderId, setBulkSenderId] = useState<string>('')
  const [bulkSchedule, setBulkSchedule] = useState('now')
  const [scheduledDate, setScheduledDate] = useState('')
  const [scheduledTime, setScheduledTime] = useState('')
  const [excludeDuplicates, setExcludeDuplicates] = useState(true)
  const [excludeInvalid, setExcludeInvalid] = useState(true)
  const [excludeUnsubscribed, setExcludeUnsubscribed] = useState(true)
  const [confirmedOptIn, setConfirmedOptIn] = useState(false)
  const [isBulkSending, setIsBulkSending] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [priority, setPriority] = useState('normal')
  const [senderIds, setSenderIds] = useState<SenderIdOption[]>([])
  const [loadingSenderIds, setLoadingSenderIds] = useState(true)
  const [parsedRecipients, setParsedRecipients] = useState<string[]>([])
  const [sendError, setSendError] = useState<string | null>(null)

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
              setBulkSenderId(defaultId.id)
            } else {
              setBulkSenderId(activeSenderIds[0].id)
            }
          }
        }
      } catch (err) {
        // Only log if it's not a network error
        if (err instanceof TypeError && err.message.includes('fetch')) {
          // Network error - silently handle
        } else {
          console.error('Failed to fetch sender IDs:', err)
        }
      } finally {
        setLoadingSenderIds(false)
      }
    }

    fetchSenderIds()
  }, [])

  // Calculations
  const bulkCharCount = bulkMessage.length
  const bulkSegments = Math.ceil(bulkCharCount / 153) || 0
  const estimatedRecipients = parsedRecipients.length || validNumbers
  const totalSegments = bulkSegments * estimatedRecipients
  const bulkEstimatedCredits = totalSegments // 1 credit per 153 chars per recipient
  const bulkHasSufficientBalance = balance >= bulkEstimatedCredits

  const effectivePriceKes = pricePerCreditKes || 0
  const bulkEstimatedCostKes = effectivePriceKes * bulkEstimatedCredits

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      {/* Left: Main Step Content */}
      <div className="lg:col-span-2 space-y-6">
        {/* Step Indicator - Premium Stepper */}
        <Card className="p-6 bg-white border border-slate-200/80 rounded-2xl shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            {[
              { num: 1, label: 'Audience' },
              { num: 2, label: 'Message' },
              { num: 3, label: 'Schedule' },
              { num: 4, label: 'Review' },
            ].map((step, idx) => (
              <React.Fragment key={step.num}>
                <div className="flex items-center gap-3 flex-1">
                  <div className="flex flex-col items-center gap-2">
                    <div
                      className={`flex items-center justify-center w-11 h-11 rounded-xl border-2 transition-all duration-200 ${
                        bulkStep === step.num
                          ? 'bg-[#0F766E] border-[#0F766E] text-white shadow-md shadow-[#0F766E]/20'
                          : bulkStep > step.num
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                          : 'bg-white border-slate-200 text-slate-400'
                      }`}
                    >
                      {bulkStep > step.num ? (
                        <Check size={20} className="font-bold" />
                      ) : (
                        <span className="text-sm font-bold">{step.num}</span>
                      )}
                    </div>
                    <span
                      className={`text-xs font-medium transition-colors ${
                        bulkStep === step.num
                          ? 'text-[#0F766E]'
                          : bulkStep > step.num
                          ? 'text-emerald-700'
                          : 'text-slate-400'
                      }`}
                    >
                      {step.label}
                    </span>
                  </div>
                </div>
                {idx < 3 && (
                  <div
                    className={`h-0.5 flex-1 mx-2 transition-colors ${
                      bulkStep > step.num ? 'bg-emerald-200' : 'bg-slate-200'
                    }`}
                  />
                )}
              </React.Fragment>
            ))}
          </div>
        </Card>

        {/* Step 1: Audience */}
        {bulkStep === 1 && (
          <Card className="p-8 bg-white border border-slate-200/80 rounded-2xl shadow-sm">
            <h2 className="text-2xl font-semibold text-slate-900 mb-2">Select Audience</h2>
            <p className="text-base text-slate-500 mb-6">
              Choose how you want to select your recipients
            </p>

            {/* Method Selector */}
            <div className="flex gap-2 p-1 bg-slate-100 rounded-xl border border-slate-200/60 mb-6">
              {[
                { id: 'manual', label: 'Add Numbers', icon: Users },
                { id: 'csv', label: 'Upload CSV', icon: Upload },
              ].map((method) => {
                const IconComponent = method.icon
                return (
                  <button
                    key={method.id}
                    onClick={() => setAudienceMethod(method.id as any)}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                      audienceMethod === method.id
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <IconComponent size={16} />
                    {method.label}
                  </button>
                )
              })}
            </div>

            {/* Upload CSV */}
            {audienceMethod === 'csv' && (
              <div className="space-y-6">
                <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:border-[#0F766E]/30 transition-colors bg-slate-50/50">
                  <Upload size={40} className="mx-auto mb-4 text-slate-400" />
                  <h4 className="font-semibold text-base text-slate-900 mb-2">
                    Drag & drop CSV file or click to browse
                  </h4>
                  <p className="text-sm text-slate-500 mb-4">
                    Required: phone (optional: name)
                  </p>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={async (e) => {
                      const file = e.target.files?.[0]
                      if (file) {
                        setCsvFile(file)
                        // Parse CSV file
                        const text = await file.text()
                        const lines = text.split('\n').filter(line => line.trim())
                        const headers = lines[0]?.split(',').map(h => h.trim().toLowerCase()) || []
                        const phoneIndex = headers.findIndex(h => h === 'phone' || h === 'mobile' || h === 'number')
                        
                        if (phoneIndex === -1) {
                          setSendError('CSV must have a "phone" column')
                          return
                        }
                        
                        const phones: string[] = []
                        for (let i = 1; i < lines.length; i++) {
                          const values = lines[i].split(',').map(v => v.trim())
                          const phone = values[phoneIndex]
                          if (phone) {
                            phones.push(phone)
                          }
                        }
                        
                        // Remove duplicates if enabled
                        const uniquePhones = excludeDuplicates 
                          ? [...new Set(phones)]
                          : phones
                        
                        setParsedRecipients(uniquePhones)
                        setSendError(null)
                      }
                    }}
                    className="hidden"
                    id="csv-upload"
                  />
                  <label htmlFor="csv-upload">
                    <Button
                      variant="outline"
                      className="cursor-pointer border-slate-200 hover:bg-slate-100"
                    >
                      Choose File
                    </Button>
                  </label>
                </div>

                {csvFile && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-4">
                      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/60">
                        <p className="text-sm text-slate-500 mb-1">Total Rows</p>
                        <p className="text-2xl font-bold text-slate-900">{totalRows}</p>
                      </div>
                      <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200/50">
                        <p className="text-sm text-emerald-700 mb-1">Valid Numbers</p>
                        <p className="text-2xl font-bold text-emerald-700">{validNumbers}</p>
                      </div>
                      <div className="p-4 rounded-xl bg-red-50 border border-red-200/50">
                        <p className="text-sm text-red-700 mb-1">Invalid</p>
                        <p className="text-2xl font-bold text-red-700">{invalidNumbers}</p>
                      </div>
                    </div>

                    {invalidNumbers > 0 && (
                      <Button variant="outline" className="text-sm">
                        <Download size={14} className="mr-2" />
                        Download errors ({invalidNumbers})
                      </Button>
                    )}

                    {duplicatesRemoved > 0 && (
                      <div className="p-3 rounded-xl bg-amber-50 border border-amber-200/50">
                        <p className="text-sm text-amber-700">
                          {duplicatesRemoved} duplicate{duplicatesRemoved !== 1 ? 's' : ''}{' '}
                          removed
                        </p>
                      </div>
                    )}

                    <div className="border border-slate-200 rounded-xl overflow-hidden">
                      <div className="p-3 bg-slate-50 border-b border-slate-200">
                        <p className="text-sm font-medium text-slate-700">Preview (first 10 rows)</p>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-slate-50">
                            <tr>
                              <th className="px-4 py-2 text-left text-slate-600 font-medium">
                                Phone
                              </th>
                              <th className="px-4 py-2 text-left text-slate-600 font-medium">
                                Name
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {csvPreview.map((row, idx) => (
                              <tr
                                key={idx}
                                className="border-b border-slate-100 hover:bg-slate-50"
                              >
                                <td className="px-4 py-2 text-slate-900">{row.phone}</td>
                                <td className="px-4 py-2 text-slate-600">{row.name}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Manual Number Input */}
            {audienceMethod === 'manual' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-900 mb-2">
                    Phone Numbers
                  </label>
                  <p className="text-sm text-slate-700 mb-3">
                    Enter phone numbers, one per line or separated by commas.
                  </p>
                  <div className="mb-3 p-3 rounded-lg bg-slate-50 border border-slate-200">
                    <p className="text-xs font-medium text-slate-600 mb-1">Example format:</p>
                    <div className="font-mono text-sm text-slate-900 space-y-0.5">
                      <div>+254712345678</div>
                      <div>+254723456789</div>
                      <div>+254734567890</div>
                    </div>
                  </div>
                  <Textarea
                    value={manualNumbers}
                    onChange={(e) => {
                      setManualNumbers(e.target.value)
                      // Parse numbers from input
                      const input = e.target.value
                      // Split by newlines, commas, or semicolons, then filter and clean
                      const numbers = input
                        .split(/[\n,;]+/)
                        .map(num => num.trim())
                        .filter(num => num.length > 0)
                        .map(num => {
                          // Extract digits and + sign
                          const digits = num.replace(/[^\d+]/g, '')
                          
                          // Handle different formats:
                          // If starts with 0, assume Kenya (+254)
                          if (digits.startsWith('0')) {
                            return `+254${digits.substring(1)}`
                          }
                          
                          // If starts with 254, add +
                          if (digits.startsWith('254')) {
                            return `+${digits}`
                          }
                          
                          // If starts with +, keep it
                          if (digits.startsWith('+')) {
                            return digits
                          }
                          
                          // If 9 digits and starts with 7 or 1, assume Kenya
                          if (digits.length === 9 && (digits.startsWith('7') || digits.startsWith('1'))) {
                            return `+254${digits}`
                          }
                          
                          // Otherwise, add + prefix
                          return digits.length > 0 ? `+${digits}` : ''
                        })
                        .filter(num => num.length > 0)
                      
                      // Remove duplicates if enabled
                      const uniqueNumbers = excludeDuplicates 
                        ? [...new Set(numbers)]
                        : numbers
                      
                      setParsedRecipients(uniqueNumbers)
                      setSendError(null)
                    }}
                    placeholder="+254712345678&#10;+254723456789&#10;+254734567890"
                    rows={12}
                    className="w-full px-4 py-4 bg-white border-2 border-slate-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0F766E] focus:border-[#0F766E] rounded-xl text-base text-slate-900 resize-none leading-relaxed font-mono placeholder:text-slate-400"
                  />
                </div>
                
                <div className="p-4 rounded-xl bg-emerald-50 border-2 border-emerald-300">
                  <p className="text-sm font-semibold text-emerald-800 mb-1">
                    Valid Numbers
                  </p>
                  <p className="text-3xl font-bold text-emerald-700">
                    {parsedRecipients.length.toLocaleString()}
                  </p>
                  {excludeDuplicates && manualNumbers.split(/[\n,;]+/).filter(n => n.trim()).length > parsedRecipients.length && (
                    <p className="text-sm text-emerald-700 mt-2 font-medium">
                      {manualNumbers.split(/[\n,;]+/).filter(n => n.trim()).length - parsedRecipients.length} duplicate(s) removed
                    </p>
                  )}
                  {parsedRecipients.length === 0 && (
                    <p className="text-sm text-emerald-600 mt-2">
                      Enter phone numbers above to see count
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Audience Protections */}
            <div className="mt-6 pt-6 border-t-2 border-slate-300">
              <p className="text-sm font-semibold text-slate-900 mb-4">Audience Protections</p>
              <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer p-2 rounded-lg hover:bg-slate-50 transition-colors">
                  <input
                    type="checkbox"
                    checked={excludeDuplicates}
                    onChange={(e) => setExcludeDuplicates(e.target.checked)}
                    className="w-5 h-5 rounded border-2 border-slate-400 text-[#0F766E] focus:ring-2 focus:ring-[#0F766E] cursor-pointer"
                  />
                  <span className="text-sm font-medium text-slate-900">Exclude duplicates</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer p-2 rounded-lg hover:bg-slate-50 transition-colors">
                  <input
                    type="checkbox"
                    checked={excludeInvalid}
                    onChange={(e) => setExcludeInvalid(e.target.checked)}
                    className="w-5 h-5 rounded border-2 border-slate-400 text-[#0F766E] focus:ring-2 focus:ring-[#0F766E] cursor-pointer"
                  />
                  <span className="text-sm font-medium text-slate-900">Exclude invalid numbers</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer p-2 rounded-lg hover:bg-slate-50 transition-colors">
                  <input
                    type="checkbox"
                    checked={excludeUnsubscribed}
                    onChange={(e) => setExcludeUnsubscribed(e.target.checked)}
                    className="w-5 h-5 rounded border-2 border-slate-400 text-[#0F766E] focus:ring-2 focus:ring-[#0F766E] cursor-pointer"
                  />
                  <span className="text-sm font-medium text-slate-900">Exclude unsubscribed</span>
                </label>
              </div>
            </div>

            {/* Navigation */}
            <div className="flex justify-end mt-8">
              <Button
                onClick={() => setBulkStep(2)}
                disabled={parsedRecipients.length === 0 && !csvFile}
                className="bg-[#0F766E] hover:bg-[#115E59] text-white rounded-xl px-6"
              >
                Continue
                <ArrowRight size={16} className="ml-2" />
              </Button>
            </div>
          </Card>
        )}

        {/* Step 2: Message */}
        {bulkStep === 2 && (
          <Card className="p-8 bg-white border border-slate-200/80 rounded-2xl shadow-sm">
            <h2 className="text-2xl font-semibold text-slate-900 mb-2">Compose Message</h2>
            <p className="text-base text-slate-500 mb-6">
              Write your message with optional personalization
            </p>

            {/* Sender ID */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Sender ID
              </label>
              {loadingSenderIds ? (
                <div className="h-11 bg-slate-50 border border-slate-200/70 rounded-xl flex items-center justify-center">
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
                    <div className="h-11 bg-slate-50 border border-slate-200/70 rounded-xl flex items-center justify-between px-4">
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
                    <Select value={bulkSenderId} onValueChange={setBulkSenderId}>
                      <SelectTrigger className="h-11 bg-slate-50 border-slate-200/70 focus:bg-white focus:border-[#0F766E] focus:ring-4 focus:ring-[#0F766E]/10 rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
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
                  )
                }
                
                // No sender IDs
                return (
                  <div className="h-11 bg-slate-50 border border-slate-200/70 rounded-xl flex items-center justify-center">
                    <span className="text-sm text-slate-500">No sender IDs available</span>
                  </div>
                )
              })()}
            </div>

            {/* Message Composer */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-slate-700">Message</label>
                <Select defaultValue="name">
                  <SelectTrigger className="h-9 w-40 text-xs">
                    <SelectValue placeholder="Insert variable" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="name">{'{name}'}</SelectItem>
                    <SelectItem value="company">{'{company}'}</SelectItem>
                    <SelectItem value="code">{'{code}'}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="relative">
                  <Textarea
                    value={bulkMessage}
                    onChange={(e) => setBulkMessage(e.target.value)}
                    placeholder="Type your message here... Use {name}, {company}, {code} for personalization"
                    rows={10}
                    className="w-full px-4 py-4 pr-24 bg-white border border-gray-200 focus:bg-white focus:outline-none focus:ring-0 focus:border-gray-400 rounded-xl text-base resize-none leading-relaxed transition-colors"
                  />
                <div className="absolute bottom-4 right-4 flex items-center gap-2">
                  <span className="text-xs font-medium text-slate-500">
                    {bulkCharCount}/153
                  </span>
                  <span className="text-slate-300">•</span>
                  <span className="text-xs font-medium text-slate-500">
                    {bulkSegments} segment{bulkSegments !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>
            </div>

            {/* Preview */}
            {bulkMessage && (
              <div className="mb-6 p-4 rounded-xl bg-slate-50 border border-slate-200/60">
                <p className="text-sm font-medium text-slate-700 mb-2">Preview</p>
                <p className="text-sm text-slate-600 leading-relaxed">
                  {bulkMessage.replace('{name}', 'John Doe').replace('{company}', 'Acme Corp')}
                </p>
              </div>
            )}

            {/* Navigation */}
            <div className="flex justify-between mt-8">
              <Button
                variant="outline"
                onClick={() => setBulkStep(1)}
                className="border-slate-200 hover:bg-slate-50 rounded-xl"
              >
                Back
              </Button>
              <Button
                onClick={() => setBulkStep(3)}
                disabled={!bulkMessage}
                className="bg-[#0F766E] hover:bg-[#115E59] text-white rounded-xl px-6"
              >
                Continue
                <ArrowRight size={16} className="ml-2" />
              </Button>
            </div>
          </Card>
        )}

        {/* Step 3: Schedule */}
        {bulkStep === 3 && (
          <Card className="p-8 bg-white border border-slate-200/80 rounded-2xl shadow-sm">
            <h2 className="text-2xl font-semibold text-slate-900 mb-2">Schedule Campaign</h2>
            <p className="text-base text-slate-500 mb-6">
              Choose when to send your campaign
            </p>

            <div className="space-y-4 mb-6">
              <label className="flex items-center gap-3 p-4 rounded-xl border border-slate-200/60 cursor-pointer hover:bg-slate-50 transition-colors">
                <input
                  type="radio"
                  name="schedule"
                  value="now"
                  checked={bulkSchedule === 'now'}
                  onChange={(e) => setBulkSchedule(e.target.value)}
                  className="w-4 h-4 text-[#0F766E]"
                />
                <div className="flex-1">
                  <p className="font-medium text-slate-900">Send Now</p>
                  <p className="text-sm text-slate-500">Campaign will start immediately</p>
                </div>
              </label>

              <label className="flex items-center gap-3 p-4 rounded-xl border border-slate-200/60 cursor-pointer hover:bg-slate-50 transition-colors">
                <input
                  type="radio"
                  name="schedule"
                  value="later"
                  checked={bulkSchedule === 'later'}
                  onChange={(e) => setBulkSchedule(e.target.value)}
                  className="w-4 h-4 text-[#0F766E]"
                />
                <div className="flex-1">
                  <p className="font-medium text-slate-900">Schedule Later</p>
                  <p className="text-sm text-slate-500">Choose date and time</p>
                </div>
              </label>
            </div>

            {bulkSchedule === 'later' && (
              <div className="grid md:grid-cols-2 gap-4 mb-6 p-4 rounded-xl bg-slate-50 border border-slate-200/60">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Date</label>
                  <Input
                    type="date"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    className="h-11 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Time</label>
                  <Input
                    type="time"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                    className="h-11 bg-white"
                  />
                </div>
                <p className="text-xs text-slate-500 md:col-span-2">Timezone: EAT (East Africa Time)</p>
              </div>
            )}

            {/* Advanced Options */}
            <Accordion type="single" collapsible className="mb-6">
              <AccordionItem value="advanced" className="border border-slate-200/60 rounded-xl px-4">
                <AccordionTrigger className="text-sm font-medium text-slate-700 hover:no-underline py-4">
                  Advanced Options
                </AccordionTrigger>
                <AccordionContent className="pb-4 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Priority
                    </label>
                    <Select value={priority} onValueChange={setPriority}>
                      <SelectTrigger className="h-11 bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="normal">Normal</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Throttle Rate
                    </label>
                    <Input
                      type="number"
                      placeholder="Messages per minute"
                      defaultValue="1000"
                      className="h-11 bg-white"
                    />
                    <p className="text-xs text-slate-500 mt-1.5">
                      Limit sending speed for compliance
                    </p>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            {/* Navigation */}
            <div className="flex justify-between mt-8">
              <Button
                variant="outline"
                onClick={() => setBulkStep(2)}
                className="border-slate-200 hover:bg-slate-50 rounded-xl"
              >
                Back
              </Button>
              <Button
                onClick={() => setBulkStep(4)}
                className="bg-[#0F766E] hover:bg-[#115E59] text-white rounded-xl px-6"
              >
                Continue
                <ArrowRight size={16} className="ml-2" />
              </Button>
            </div>
          </Card>
        )}

        {/* Step 4: Review & Send */}
        {bulkStep === 4 && (
          <Card className="p-8 bg-white border border-slate-200/80 rounded-2xl shadow-sm">
            <h2 className="text-2xl font-semibold text-slate-900 mb-2">Review & Send</h2>
            <p className="text-base text-slate-500 mb-6">
              Review your campaign details before sending
            </p>

            <div className="space-y-6">
              {/* Audience Summary */}
              <div className="p-5 rounded-xl bg-slate-50 border border-slate-200/60">
                <p className="text-sm font-semibold text-slate-700 mb-3">Audience</p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Recipients:</span>
                    <span className="font-medium text-slate-900">
                      {estimatedRecipients.toLocaleString()}
                    </span>
                  </div>
                  {excludeInvalid && (
                    <div className="flex justify-between">
                      <span className="text-slate-600">Excluded (invalid):</span>
                      <span className="font-medium text-slate-900">{invalidNumbers}</span>
                    </div>
                  )}
                  {excludeDuplicates && (
                    <div className="flex justify-between">
                      <span className="text-slate-600">Excluded (duplicates):</span>
                      <span className="font-medium text-slate-900">{duplicatesRemoved}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Message Preview */}
              <div className="p-5 rounded-xl bg-slate-50 border border-slate-200/60">
                <p className="text-sm font-semibold text-slate-700 mb-3">Message</p>
                <p className="text-sm text-slate-600 leading-relaxed mb-2">{bulkMessage}</p>
                <p className="text-xs text-slate-500">
                  {bulkSegments} segment{bulkSegments !== 1 ? 's' : ''} per recipient
                </p>
              </div>

              {/* Sender ID & Schedule */}
              <div className="grid md:grid-cols-2 gap-4">
                <div className="p-5 rounded-xl bg-slate-50 border border-slate-200/60">
                  <p className="text-sm font-semibold text-slate-700 mb-2">Sender ID</p>
                  <p className="text-sm text-slate-600">
                    {senderIds.find(sid => sid.id === bulkSenderId)?.senderName || bulkSenderId || 'Not selected'}
                  </p>
                </div>
                <div className="p-5 rounded-xl bg-slate-50 border border-slate-200/60">
                  <p className="text-sm font-semibold text-slate-700 mb-2">Schedule</p>
                  <p className="text-sm text-slate-600">
                    {bulkSchedule === 'now'
                      ? 'Send Now'
                      : `${scheduledDate} at ${scheduledTime} (EAT)`}
                  </p>
                </div>
              </div>

              {/* Cost Estimate */}
              <div className="p-5 rounded-xl bg-slate-50 border border-slate-200/60">
                <p className="text-sm font-semibold text-slate-700 mb-3">Cost Estimate</p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Total segments:</span>
                    <span className="font-medium text-slate-900">
                      {totalSegments.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Credits required:</span>
                    <span className="font-medium text-slate-900">
                      {bulkEstimatedCredits.toLocaleString()} credits
                    </span>
                  </div>
                  <div className="border-t border-slate-200 pt-2 mt-2 flex justify-between">
                    <span className="font-semibold text-slate-900">Estimated usage:</span>
                    <span className="text-xl font-bold text-[#0F766E]">
                      {bulkEstimatedCredits.toLocaleString()} credits
                    </span>
                  </div>
                  {effectivePriceKes > 0 && (
                    <p className="mt-1 text-xs text-slate-500 text-right">
                      ≈ KSh {bulkEstimatedCostKes.toFixed(2)} at KSh {effectivePriceKes.toFixed(2)} per credit
                    </p>
                  )}
                </div>
              </div>

              {/* Error Message */}
              {sendError && (
                <div className="p-4 rounded-xl bg-red-50 border border-red-200/60">
                  <p className="text-sm font-medium text-red-900">Error</p>
                  <p className="text-sm text-red-700 mt-1">{sendError}</p>
                </div>
              )}

              {/* Success Message */}
              {isSuccess && (
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200/60">
                  <p className="text-sm font-medium text-emerald-900">Success!</p>
                  <p className="text-sm text-emerald-700 mt-1">
                    Bulk SMS campaign queued. Redirecting to SMS history...
                  </p>
                </div>
              )}

              {/* Confirmation Checkbox */}
              <label className="flex items-start gap-3 p-4 rounded-xl border border-slate-200/60 cursor-pointer hover:bg-slate-50 transition-colors">
                <input
                  type="checkbox"
                  checked={confirmedOptIn}
                  onChange={(e) => setConfirmedOptIn(e.target.checked)}
                  className="w-4 h-4 mt-0.5 rounded border-slate-300 text-[#0F766E] focus:ring-[#0F766E]"
                />
                <div>
                  <p className="text-sm font-medium text-slate-900">
                    I confirm the recipients have opted in
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Required for compliance with anti-spam regulations
                  </p>
                </div>
              </label>

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setBulkStep(3)}
                  className="flex-1 border-slate-200 hover:bg-slate-50 rounded-xl"
                >
                  Back
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 border-slate-200 hover:bg-slate-50 rounded-xl"
                >
                  Save as Draft
                </Button>
                <Button
                  onClick={async () => {
                    if (!bulkMessage || !bulkSenderId || parsedRecipients.length === 0) {
                      setSendError('Please complete all required fields')
                      return
                    }

                    setIsBulkSending(true)
                    setSendError(null)

                    try {
                      const token = localStorage.getItem('token')
                      const response = await authFetch('/api/sms/bulk-send', {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                          recipients: parsedRecipients,
                          message: bulkMessage,
                          senderIdId: bulkSenderId,
                        }),
                      })

                      if (!response.ok) {
                        const errorData = await response.json()
                        throw new Error(errorData.error || 'Failed to send bulk SMS')
                      }

                      const data = await response.json()
                      setIsSuccess(true)
                      
                      // Redirect to SMS history after 2 seconds
                      setTimeout(() => {
                        window.location.href = '/app/smshistory'
                      }, 2000)
                    } catch (error: any) {
                      setSendError(error.message || 'Failed to send bulk SMS')
                    } finally {
                      setIsBulkSending(false)
                    }
                  }}
                  disabled={!confirmedOptIn || !bulkHasSufficientBalance || isBulkSending || parsedRecipients.length === 0}
                  className="flex-1 bg-[#0F766E] hover:bg-[#115E59] text-white rounded-xl disabled:opacity-50"
                >
                  {isBulkSending ? (
                    <>
                      <Loader2 size={16} className="mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send size={16} className="mr-2" />
                      Send Campaign
                    </>
                  )}
                </Button>
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* Right: Sticky Campaign Summary */}
      <div className="lg:sticky lg:top-24 space-y-6 h-fit">
        <Card className="p-6 bg-white border border-slate-200/80 rounded-2xl shadow-sm sticky top-24">
          <div className="flex items-center gap-2 mb-5">
            <FileText size={18} className="text-[#0F766E]" />
            <h3 className="text-base font-semibold text-slate-900">Campaign Summary</h3>
          </div>
          <div className="space-y-4 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-600">Recipients:</span>
              <span className="font-semibold text-slate-900">
                {estimatedRecipients.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Segments per recipient:</span>
              <span className="font-semibold text-slate-900">{bulkSegments}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Total segments:</span>
              <span className="font-semibold text-slate-900">
                {totalSegments.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Credits required:</span>
              <span className="font-semibold text-slate-900">
                {bulkEstimatedCredits.toLocaleString()}
              </span>
            </div>
            <div className="border-t border-slate-200 pt-3 mt-3">
              <div className="flex justify-between mb-2">
                <span className="font-semibold text-slate-900">Estimated usage:</span>
                <span className="text-xl font-bold text-[#0F766E]">
                  {bulkEstimatedCredits.toLocaleString()} credits
                </span>
              </div>
            </div>
            <div className="border-t border-slate-200 pt-3 mt-3 space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-600">Current Balance:</span>
                <span className="font-semibold text-slate-900">
                  {balance.toLocaleString()} credits
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">After Send:</span>
                <span
                  className={`font-semibold ${
                    bulkHasSufficientBalance ? 'text-slate-900' : 'text-red-600'
                  }`}
                >
                  {(balance - bulkEstimatedCredits).toLocaleString()} credits
                </span>
              </div>
            </div>
            {!bulkHasSufficientBalance && (
              <div className="mt-4 p-3 rounded-xl bg-amber-50 border border-amber-200/50">
                <div className="flex items-start gap-2">
                  <AlertCircle size={16} className="text-amber-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-amber-900">Insufficient Balance</p>
                    <p className="text-xs text-amber-700 mt-1">
                      Add funds to send this campaign
                    </p>
                  </div>
                </div>
                <Link href="/app/billing" className="block mt-3">
                  <Button className="w-full h-9 bg-[#0F766E] hover:bg-[#115E59] text-white rounded-xl text-sm">
                    <Plus size={14} className="mr-1.5" />
                    Add Funds
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}


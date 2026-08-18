'use client'

import { useEffect, useRef, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FileText, Upload, RefreshCw, Download } from 'lucide-react'

interface Template {
  url: string
  fileName: string
  mimeType: string
  size: number
  hasTemplate: boolean
}

export default function SenderIdLetterTemplatePage() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [template, setTemplate] = useState<Template | null>(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState<{ type: 'ok' | 'error'; text: string } | null>(null)

  const token = () => localStorage.getItem('token')

  const load = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/super-admin/sender-id-authorization-template', {
        headers: { Authorization: `Bearer ${token()}` },
      })
      if (response.status === 401 || response.status === 403) {
        window.location.href = '/auth/login'
        return
      }
      if (!response.ok) throw new Error('Failed to load template')
      const result = await response.json()
      setTemplate(result.template)
    } catch (error) {
      console.error(error)
      setMessage({ type: 'error', text: 'Could not load the letter template.' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const upload = async (file: File | null) => {
    if (!file) return
    try {
      setUploading(true)
      setMessage(null)
      const formData = new FormData()
      formData.append('file', file)
      const response = await fetch('/api/super-admin/sender-id-authorization-template', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token()}` },
        body: formData,
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Upload failed')
      setTemplate(result.template)
      setMessage({
        type: 'ok',
        text: 'Template saved. Clients can download it on the Sender ID application page.',
      })
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Upload failed' })
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-slate-900">Sender ID Letter</h1>
            <p className="text-slate-600 mt-1">
              Upload the blank authorization letter. It will appear on{' '}
              <span className="font-medium">/app/sender-ids/request</span> for clients to download,
              fill the red items, stamp, and re-upload.
            </p>
          </div>
          <button
            onClick={load}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl shadow-sm text-slate-700 hover:bg-slate-100 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {message && (
          <p className={`text-sm ${message.type === 'ok' ? 'text-emerald-700' : 'text-rose-600'}`}>
            {message.text}
          </p>
        )}

        <Card className="p-6 border border-slate-200/70 rounded-2xl bg-white shadow-sm space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-slate-100 text-slate-700">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <p className="font-medium text-slate-900">
                {template?.hasTemplate ? template.fileName : 'No letter uploaded yet'}
              </p>
              <p className="text-xs text-slate-500">
                {template?.hasTemplate
                  ? 'This file is what customers download on the application form.'
                  : 'PDF, JPG, or PNG — max 5MB'}
              </p>
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
            className="hidden"
            onChange={(e) => upload(e.target.files?.[0] || null)}
          />

          <div className="flex flex-wrap gap-3">
            {template?.hasTemplate && template.url && (
              <a href={template.url} target="_blank" rel="noopener noreferrer">
                <Button type="button" variant="secondary">
                  <Download className="w-4 h-4 mr-2" />
                  Preview
                </Button>
              </a>
            )}
            <Button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <Upload className="w-4 h-4 mr-2" />
              {uploading ? 'Uploading...' : template?.hasTemplate ? 'Replace letter' : 'Upload letter'}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  )
}

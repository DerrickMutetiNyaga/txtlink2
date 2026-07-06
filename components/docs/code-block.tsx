'use client'

import React, { useState } from 'react'
import { Copy, Check } from 'lucide-react'

interface CodeBlockProps {
  code: string
  language?: string
  filename?: string
  showLineNumbers?: boolean
}

export function CodeBlock({ 
  code, 
  language = 'javascript', 
  filename,
  showLineNumbers = false 
}: CodeBlockProps) {
  const [copied, setCopied] = useState(false)

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="relative group">
      {filename && (
        <div className="px-4 py-2 bg-slate-800 text-slate-300 text-sm font-mono rounded-t-lg border-b border-slate-700">
          {filename}
        </div>
      )}
      <div className="relative bg-slate-900 rounded-lg overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2 bg-slate-800 border-b border-slate-700">
          <span className="text-xs text-slate-400 font-mono uppercase">
            {language}
          </span>
          <button
            onClick={copyToClipboard}
            className="flex items-center gap-2 px-3 py-1.5 text-xs text-slate-300 hover:text-white hover:bg-slate-700 rounded transition-colors"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                Copy
              </>
            )}
          </button>
        </div>
        <pre className="p-4 overflow-x-auto">
          <code className={`text-sm text-slate-100 font-mono ${showLineNumbers ? 'line-numbers' : ''}`}>
            {code}
          </code>
        </pre>
      </div>
    </div>
  )
}


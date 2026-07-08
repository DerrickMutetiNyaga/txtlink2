'use client'

import { PortalLayout } from '@/components/portal-layout'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useState, useEffect } from 'react'
import { Copy, Trash2, RefreshCw, Plus, Key, Eye, EyeOff, Check } from 'lucide-react'
import Link from 'next/link'
import { useToast } from '@/hooks/use-toast'

interface ApiKey {
  id: string
  name: string
  keyPrefix: string
  type: 'live' | 'test'
  status: 'active' | 'revoked'
  createdAt: string | Date
  lastUsedAt?: string | Date | null
  canReveal?: boolean
}

export default function APIKeysPage() {
  const { toast } = useToast()
  const [showModal, setShowModal] = useState(false)
  const [newKeyVisible, setNewKeyVisible] = useState(false)
  const [newKey, setNewKey] = useState('')
  const [newKeyName, setNewKeyName] = useState('')
  const [newKeyType, setNewKeyType] = useState<'live' | 'test'>('live')
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([])
  const [loading, setLoading] = useState(true)
  const [hasSenderIds, setHasSenderIds] = useState(false)
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set())
  const [revealedKeys, setRevealedKeys] = useState<Record<string, string>>({})
  const [revealingKey, setRevealingKey] = useState<string | null>(null)
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [revoking, setRevoking] = useState<string | null>(null)

  // Fetch API keys
  useEffect(() => {
    const fetchApiKeys = async () => {
      try {
        setLoading(true)
        const token = localStorage.getItem('token')
        const response = await fetch('/api/user/api-keys', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (response.ok) {
          const data = await response.json()
          setApiKeys(data.apiKeys || [])
          setHasSenderIds(data.hasSenderIds || false)
        }
      } catch (error) {
        console.error('Failed to fetch API keys:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchApiKeys()
  }, [])

  const handleCopy = async (text: string, keyId?: string) => {
    try {
      await navigator.clipboard.writeText(text)
      if (keyId) {
        setCopiedKeyId(keyId)
        setTimeout(() => setCopiedKeyId(null), 2000)
      }
      toast({
        title: 'Copied',
        description: 'API key copied to clipboard.',
      })
    } catch {
      toast({
        title: 'Copy failed',
        description: 'Could not copy to clipboard. Please copy manually.',
        variant: 'destructive',
      })
    }
  }

  const revealKey = async (id: string): Promise<string | null> => {
    if (revealedKeys[id]) {
      return revealedKeys[id]
    }

    setRevealingKey(id)
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/user/api-keys/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      const data = await response.json()

      if (response.ok) {
        setRevealedKeys((prev) => ({ ...prev, [id]: data.key }))
        return data.key
      }

      toast({
        title: 'Cannot reveal key',
        description: data.error || 'Failed to load API key.',
        variant: 'destructive',
      })
      return null
    } catch (error) {
      console.error('Failed to reveal API key:', error)
      toast({
        title: 'Error',
        description: 'Failed to load API key.',
        variant: 'destructive',
      })
      return null
    } finally {
      setRevealingKey(null)
    }
  }

  const toggleKeyVisibility = async (id: string) => {
    const newVisible = new Set(visibleKeys)
    if (newVisible.has(id)) {
      newVisible.delete(id)
      setVisibleKeys(newVisible)
      return
    }

    const key = await revealKey(id)
    if (key) {
      newVisible.add(id)
      setVisibleKeys(newVisible)
    }
  }

  const handleCopyKey = async (key: ApiKey) => {
    let fullKey = revealedKeys[key.id]
    if (!fullKey) {
      fullKey = (await revealKey(key.id)) || ''
    }
    if (fullKey) {
      await handleCopy(fullKey, key.id)
    }
  }

  const handleGenerateKey = async () => {
    if (!newKeyName.trim()) {
      alert('Please enter a key name')
      return
    }

    setCreating(true)
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/user/api-keys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: newKeyName,
          type: newKeyType,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        const generatedKey = data.apiKey.key
        const generatedId = data.apiKey.id
        setNewKey(generatedKey)
        setNewKeyVisible(true)
        setShowModal(false)
        setNewKeyName('')
        if (generatedId) {
          setRevealedKeys((prev) => ({ ...prev, [generatedId]: generatedKey }))
        }
        // Refresh the list
        const listResponse = await fetch('/api/user/api-keys', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })
        if (listResponse.ok) {
          const listData = await listResponse.json()
          setApiKeys(listData.apiKeys || [])
          setHasSenderIds(listData.hasSenderIds || false)
        }
      } else {
        alert(data.error || 'Failed to generate API key')
      }
    } catch (error) {
      console.error('Failed to generate API key:', error)
      alert('Failed to generate API key')
    } finally {
      setCreating(false)
    }
  }

  const handleRevokeKey = async (id: string) => {
    if (!confirm('Are you sure you want to revoke this API key? This action cannot be undone.')) {
      return
    }

    setRevoking(id)
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/user/api-keys/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        // Remove from list
        setApiKeys(apiKeys.filter((key) => key.id !== id))
      } else {
        const data = await response.json()
        alert(data.error || 'Failed to revoke API key')
      }
    } catch (error) {
      console.error('Failed to revoke API key:', error)
      alert('Failed to revoke API key')
    } finally {
      setRevoking(null)
    }
  }

  const formatDate = (date: string | Date | null | undefined) => {
    if (!date) return 'Never'
    const d = new Date(date)
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
  }

  const getTimeAgo = (date: string | Date | null | undefined) => {
    if (!date) return 'Never'
    const d = new Date(date)
    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - d.getTime()) / 1000)

    if (diffInSeconds < 60) {
      return 'Just now'
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60)
      return `${minutes}m ago`
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600)
      return `${hours}h ago`
    } else {
      const days = Math.floor(diffInSeconds / 86400)
      return `${days}d ago`
    }
  }

  const getKeyPreview = (keyPrefix: string) => {
    return `${keyPrefix}••••••••••••••••`
  }

  const getDisplayedKey = (key: ApiKey) => {
    if (visibleKeys.has(key.id) && revealedKeys[key.id]) {
      return revealedKeys[key.id]
    }
    return getKeyPreview(key.keyPrefix)
  }

  const renderStatusBadge = (status: ApiKey['status']) => (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
        status === 'active'
          ? 'bg-[#ECFDF5] text-[#047857]'
          : 'bg-slate-100 text-slate-600'
      }`}
    >
      {status === 'active' ? 'Active' : 'Revoked'}
    </span>
  )

  const renderTypeBadge = (type: ApiKey['type']) => (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${
        type === 'live' ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700'
      }`}
    >
      {type === 'live' ? 'Live' : 'Test'}
    </span>
  )

  const renderDesktopActions = (key: ApiKey) => (
    <div className="flex gap-2">
      <button
        onClick={() => toggleKeyVisibility(key.id)}
        disabled={revealingKey === key.id || key.canReveal === false}
        className="p-2 hover:bg-gray-100 hover:text-gray-900 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
        title={
          key.canReveal === false
            ? 'This key was created before re-view was supported. Generate a new key to view and copy it.'
            : visibleKeys.has(key.id)
              ? 'Hide key'
              : 'View key'
        }
      >
        {visibleKeys.has(key.id) ? (
          <EyeOff size={16} className="text-gray-600" />
        ) : (
          <Eye size={16} className="text-gray-600" />
        )}
      </button>
      <button
        onClick={() => handleCopyKey(key)}
        disabled={revealingKey === key.id || key.canReveal === false}
        className="p-2 hover:bg-gray-100 hover:text-gray-900 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
        title={
          key.canReveal === false
            ? 'This key was created before re-view was supported. Generate a new key to copy it.'
            : 'Copy API key'
        }
      >
        {copiedKeyId === key.id ? (
          <Check size={16} className="text-emerald-600" />
        ) : (
          <Copy size={16} className="text-gray-600" />
        )}
      </button>
      <button
        onClick={() => handleRevokeKey(key.id)}
        disabled={revoking === key.id}
        className="p-2 hover:bg-red-50 rounded-lg transition disabled:opacity-50"
        title="Revoke key"
      >
        <Trash2 size={16} className="text-red-600" />
      </button>
    </div>
  )

  const renderMobileActions = (key: ApiKey) => (
    <div className="grid grid-cols-3 gap-2 pt-4 border-t border-[#E2E8F0]">
      <button
        onClick={() => toggleKeyVisibility(key.id)}
        disabled={revealingKey === key.id || key.canReveal === false}
        className="flex items-center justify-center gap-1.5 min-h-[44px] rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {visibleKeys.has(key.id) ? <EyeOff size={16} /> : <Eye size={16} />}
        <span>View</span>
      </button>
      <button
        onClick={() => handleCopyKey(key)}
        disabled={revealingKey === key.id || key.canReveal === false}
        className="flex items-center justify-center gap-1.5 min-h-[44px] rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {copiedKeyId === key.id ? <Check size={16} className="text-emerald-600" /> : <Copy size={16} />}
        <span>Copy</span>
      </button>
      <button
        onClick={() => handleRevokeKey(key.id)}
        disabled={revoking === key.id}
        className="flex items-center justify-center gap-1.5 min-h-[44px] rounded-xl border border-red-200 bg-red-50 text-sm font-medium text-red-600 hover:bg-red-100 transition disabled:opacity-50"
      >
        <Trash2 size={16} />
        <span>Delete</span>
      </button>
    </div>
  )

  const renderMobileKeyCard = (key: ApiKey) => (
    <div
      key={key.id}
      className="w-full max-w-full min-w-0 rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-sm"
    >
      <div className="flex items-start justify-between gap-3 min-w-0">
        <h3 className="text-base font-semibold text-gray-900 break-words min-w-0 flex-1">
          {key.name}
        </h3>
        <div className="shrink-0">{renderStatusBadge(key.status)}</div>
      </div>

      <div className="mt-3 min-w-0 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
        <code className="block max-w-full overflow-hidden text-ellipsis whitespace-nowrap font-mono text-xs text-slate-700">
          {revealingKey === key.id ? 'Loading…' : getDisplayedKey(key)}
        </code>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
        <div className="min-w-0">
          <p className="text-xs text-slate-500 mb-0.5">Type</p>
          <div>{renderTypeBadge(key.type)}</div>
        </div>
        <div className="min-w-0">
          <p className="text-xs text-slate-500 mb-0.5">Created</p>
          <p className="text-slate-900 font-medium">{formatDate(key.createdAt)}</p>
        </div>
        <div className="min-w-0 col-span-2 sm:col-span-1">
          <p className="text-xs text-slate-500 mb-0.5">Last Used</p>
          <p className="text-slate-900 font-medium">{getTimeAgo(key.lastUsedAt)}</p>
        </div>
      </div>

      {renderMobileActions(key)}
    </div>
  )

  return (
    <PortalLayout activeSection="API Keys">
      <div className="space-y-4 md:space-y-6 w-full max-w-full min-w-0">
        {/* Header */}
        <div className="app-page-header">
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900 mb-1 sm:mb-2">API Keys</h1>
            <p className="text-sm sm:text-base text-gray-600">
              Manage your API credentials for authentication
            </p>
          </div>
          <Button
            className="w-full md:w-auto h-11 md:h-10 bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl"
            onClick={() => setShowModal(true)}
            disabled={!hasSenderIds}
            title={!hasSenderIds ? 'You need at least one approved sender ID to generate an API key' : ''}
          >
            <Plus size={18} className="mr-2" /> Generate New Key
          </Button>
        </div>

        {/* Keys list */}
        {loading ? (
          <Card className="p-12 bg-white border border-gray-100 shadow-sm text-center">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-gray-400" />
            <p className="text-gray-500">Loading API keys...</p>
          </Card>
        ) : apiKeys.length > 0 ? (
          <>
            {/* Desktop table */}
            <Card className="hidden md:block p-4 sm:p-6 bg-white border border-gray-100 shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-gray-200">
                    <tr className="text-left text-gray-600 font-semibold text-xs uppercase">
                      <th className="pb-4 pr-4">Name</th>
                      <th className="pb-4 pr-4">Key Preview</th>
                      <th className="pb-4 pr-4">Type</th>
                      <th className="pb-4 pr-4">Created</th>
                      <th className="pb-4 pr-4">Last Used</th>
                      <th className="pb-4 pr-4">Status</th>
                      <th className="pb-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {apiKeys.map((key) => (
                      <tr key={key.id} className="border-b border-gray-100 hover:bg-gray-50 transition">
                        <td className="py-4 pr-4 font-semibold text-gray-900">{key.name}</td>
                        <td className="py-4 pr-4 max-w-[220px]">
                          <code className="block font-mono text-xs text-gray-600 truncate max-w-full">
                            {revealingKey === key.id ? (
                              <span className="text-gray-400">Loading...</span>
                            ) : (
                              getDisplayedKey(key)
                            )}
                          </code>
                        </td>
                        <td className="py-4 pr-4">{renderTypeBadge(key.type)}</td>
                        <td className="py-4 pr-4 text-gray-600 whitespace-nowrap">{formatDate(key.createdAt)}</td>
                        <td className="py-4 pr-4 text-gray-600 whitespace-nowrap">{getTimeAgo(key.lastUsedAt)}</td>
                        <td className="py-4 pr-4">{renderStatusBadge(key.status)}</td>
                        <td className="py-4">{renderDesktopActions(key)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* Mobile cards */}
            <div className="md:hidden space-y-3 w-full max-w-full min-w-0">
              {apiKeys.map((key) => renderMobileKeyCard(key))}
            </div>
          </>
        ) : (
          <Card className="p-8 sm:p-16 bg-white border border-gray-100 shadow-sm">
            <div className="flex flex-col items-center justify-center text-center max-w-md mx-auto min-w-0">
              <div className="p-5 rounded-2xl bg-gradient-to-br from-teal-50 to-emerald-50 border border-teal-100 mb-6">
                <Key size={48} className="text-teal-600" />
              </div>
              <h3 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-3">No API keys yet</h3>
              {!hasSenderIds ? (
                <>
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl mb-6 w-full text-left">
                    <p className="text-sm text-amber-800 font-medium mb-2">Sender ID Required</p>
                    <p className="text-sm text-amber-700">
                      You need at least one approved sender ID before you can generate an API key. Request a sender ID to get started.
                    </p>
                  </div>
                  <Link href="/app/sender-ids/request" className="w-full">
                    <Button className="w-full h-11 bg-teal-600 text-white hover:bg-teal-700 rounded-xl font-medium shadow-sm hover:shadow-md transition-all">
                      <Plus size={18} className="mr-2" />
                      Request Sender ID
                    </Button>
                  </Link>
                </>
              ) : (
                <>
                  <p className="text-sm sm:text-base text-gray-600 mb-8 leading-relaxed">
                    Generate your first API key to connect external systems.
                  </p>
                  <Button
                    onClick={() => setShowModal(true)}
                    className="w-full h-11 bg-teal-600 text-white hover:bg-teal-700 rounded-xl font-medium shadow-sm hover:shadow-md transition-all"
                  >
                    <Plus size={18} className="mr-2" />
                    Generate New Key
                  </Button>
                </>
              )}
            </div>
          </Card>
        )}

        {/* New Key Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-md p-8 bg-white border border-gray-200 shadow-xl">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 rounded-xl bg-teal-100 text-teal-600">
                  <Key size={24} />
                </div>
                <h3 className="text-2xl font-semibold text-gray-900">Generate New API Key</h3>
              </div>

              {!hasSenderIds && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl mb-6">
                  <p className="text-sm font-semibold text-amber-900 mb-2">Sender ID Required</p>
                  <p className="text-sm text-amber-800 mb-3">
                    You must have at least one approved sender ID before generating an API key.
                  </p>
                  <Link href="/app/sender-ids/request">
                    <Button className="w-full bg-amber-600 text-white hover:bg-amber-700 text-sm">
                      Request Sender ID
                    </Button>
                  </Link>
                </div>
              )}

              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Key Name</label>
                  <input
                    type="text"
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    placeholder="e.g., Production API Key"
                    disabled={!hasSenderIds}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Key Type</label>
                  <select
                    value={newKeyType}
                    onChange={(e) => setNewKeyType(e.target.value as 'live' | 'test')}
                    disabled={!hasSenderIds}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed"
                  >
                    <option value="live">Live (Production)</option>
                    <option value="test">Test (Development)</option>
                  </select>
                </div>

                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-800">
                  You can view and copy this key anytime from your API Keys list.
                </div>
              </div>

              <div className="flex gap-4">
                <Button
                  variant="outline"
                  className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </Button>
                <Button 
                  className="flex-1 bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={handleGenerateKey}
                  disabled={creating || !newKeyName.trim() || !hasSenderIds}
                >
                  {creating ? 'Generating...' : 'Generate'}
                </Button>
              </div>
            </Card>
          </div>
        )}

        {/* Show Generated Key */}
        {newKeyVisible && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-md p-8 bg-white border border-gray-200 shadow-xl">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 rounded-xl bg-emerald-100 text-emerald-600">
                  <Key size={24} />
                </div>
                <h3 className="text-2xl font-semibold text-gray-900">API Key Generated</h3>
              </div>

              <div className="space-y-4 mb-6">
                <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                  <p className="text-xs font-semibold text-gray-600 mb-2">Your API Key:</p>
                  <code className="text-xs font-mono text-gray-900 break-all">{newKey}</code>
                </div>

                <Button
                  variant="outline"
                  className="w-full border-gray-300 text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                  onClick={() => handleCopy(newKey)}
                >
                  <Copy size={16} className="mr-2" /> Copy to Clipboard
                </Button>

                <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900">
                  Save this key in a secure location. You can view and copy it again from the API Keys page.
                </div>
              </div>

              <Button
                className="w-full bg-teal-600 text-white hover:bg-teal-700"
                onClick={() => {
                  setNewKeyVisible(false)
                  setNewKey('')
                }}
              >
                Done
              </Button>
            </Card>
          </div>
        )}
      </div>
    </PortalLayout>
  )
}

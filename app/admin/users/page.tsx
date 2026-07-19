'use client'

import { PortalLayout } from '@/components/portal-layout'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Users,
  Plus,
  X,
  CheckCircle2,
  Clock,
  XCircle,
  RefreshCw,
  Settings,
  Shield,
} from 'lucide-react'

interface User {
  id: string
  name: string
  email: string
  phone?: string
  role: string
  credits: number
  isActive: boolean
  hpUserLoginName?: string
  senderIds: Array<{
    id: string
    senderName: string
    status: string
    isDefault: boolean
  }>
  createdAt: string
}

interface HostPinnacleSenderId {
  senderName: string
  status: string
  hpSenderId?: string
}

interface SenderIdModalProps {
  user: User | null
  isOpen: boolean
  onClose: () => void
  onAssign: (senderName: string) => void
  onRemove: (senderId: string) => void
  onSetDefault: (senderId: string) => void
  onSync: () => void
  onAdjustCredits: (action: 'add' | 'remove', credits: number, reason?: string) => Promise<void>
  availableSenderIds: HostPinnacleSenderId[]
  loadingSenderIds: boolean
}

function SenderIdModal({
  user,
  isOpen,
  onClose,
  onAssign,
  onRemove,
  onSetDefault,
  onSync,
  onAdjustCredits,
  availableSenderIds,
  loadingSenderIds,
}: SenderIdModalProps) {
  const [senderName, setSenderName] = useState('')
  const [selectedSenderId, setSelectedSenderId] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [creditAction, setCreditAction] = useState<'add' | 'remove'>('add')
  const [creditAmount, setCreditAmount] = useState('')
  const [creditReason, setCreditReason] = useState('')
  const [creditSubmitting, setCreditSubmitting] = useState(false)

  if (!isOpen || !user) return null

  const handleAssign = async () => {
    const nameToAssign = selectedSenderId || senderName.trim().toUpperCase()
    if (!nameToAssign) return
    setIsSubmitting(true)
    try {
      await onAssign(nameToAssign)
      setSenderName('')
      setSelectedSenderId('')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Get already assigned sender IDs
  const assignedNames = user.senderIds.map(sid => sid.senderName.toLowerCase())
  const unassignedSenderIds = availableSenderIds.filter(
    sid => !assignedNames.includes(sid.senderName.toLowerCase())
  )

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 m-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-slate-900">
            Manage User — {user.name}
          </h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X size={20} />
          </Button>
        </div>

        {/* Manual credits */}
        <div className="mb-6 p-4 bg-emerald-50 rounded-xl border border-emerald-200">
          <h3 className="font-semibold text-slate-900 mb-1">SMS Credits</h3>
          <p className="text-sm text-slate-600 mb-3">
            Current balance: <strong>{user.credits.toLocaleString()}</strong> credits (this user&apos;s account wallet)
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <select
              value={creditAction}
              onChange={(e) => setCreditAction(e.target.value as 'add' | 'remove')}
              className="px-3 py-2 border border-slate-300 rounded-lg bg-white text-sm"
            >
              <option value="add">Add credits</option>
              <option value="remove">Remove credits</option>
            </select>
            <input
              type="number"
              min={1}
              step={1}
              value={creditAmount}
              onChange={(e) => setCreditAmount(e.target.value)}
              placeholder="Amount"
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
            />
          </div>
          <input
            type="text"
            value={creditReason}
            onChange={(e) => setCreditReason(e.target.value)}
            placeholder="Reason (optional)"
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm mb-3"
          />
          <Button
            onClick={async () => {
              const amount = Math.trunc(Number(creditAmount))
              if (!amount || amount <= 0) {
                alert('Enter a valid credit amount')
                return
              }
              setCreditSubmitting(true)
              try {
                await onAdjustCredits(creditAction, amount, creditReason.trim() || undefined)
                setCreditAmount('')
                setCreditReason('')
              } finally {
                setCreditSubmitting(false)
              }
            }}
            disabled={creditSubmitting || !creditAmount}
            className="w-full bg-emerald-600 text-white hover:bg-emerald-700"
          >
            {creditSubmitting ? 'Saving...' : creditAction === 'add' ? 'Add Credits' : 'Remove Credits'}
          </Button>
        </div>

        {/* Assign New Sender ID */}
        <div className="mb-6 p-4 bg-slate-50 rounded-xl border border-slate-200">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-slate-900">Assign Sender ID</h3>
            {availableSenderIds.length > 0 && (
              <span className="text-xs text-slate-500">
                {unassignedSenderIds.length} of {availableSenderIds.length} available
              </span>
            )}
          </div>
          
          {/* Dropdown for HostPinnacle Sender IDs */}
          {loadingSenderIds ? (
            <div className="py-4 text-center text-sm text-slate-500">
              <RefreshCw className="w-4 h-4 animate-spin inline-block mr-2" />
              Loading sender IDs from HostPinnacle...
            </div>
          ) : unassignedSenderIds.length > 0 ? (
            <div className="mb-3">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Select from HostPinnacle
              </label>
              <select
                value={selectedSenderId}
                onChange={(e) => {
                  setSelectedSenderId(e.target.value)
                  setSenderName('') // Clear manual input
                }}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
              >
                <option value="">-- Select a sender ID --</option>
                {unassignedSenderIds.map((sid) => (
                  <option key={sid.senderName} value={sid.senderName}>
                    {sid.senderName} ({sid.status})
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="mb-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                All available sender IDs are already assigned. You can manually enter a new one below.
              </p>
            </div>
          )}

          {/* Manual Input */}
          <div className="mb-3">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Or enter manually
            </label>
            <input
              type="text"
              value={senderName}
              onChange={(e) => {
                setSenderName(e.target.value.toUpperCase())
                setSelectedSenderId('') // Clear dropdown selection
              }}
              placeholder="Enter sender ID (e.g., ICONICFIBRE)"
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              maxLength={11}
            />
            <p className="text-xs text-slate-500 mt-2">
              Alphanumeric, uppercase, max 11 characters
            </p>
          </div>

          <Button
            onClick={handleAssign}
            disabled={(!selectedSenderId && !senderName.trim()) || isSubmitting}
            className="w-full bg-teal-600 text-white hover:bg-teal-700"
          >
            <Plus size={16} className="mr-2" />
            {isSubmitting ? 'Assigning...' : 'Assign Sender ID'}
          </Button>
        </div>

        {/* Sync from HostPinnacle */}
        {user.hpUserLoginName && (
          <div className="mb-6">
            <Button
              onClick={onSync}
              variant="outline"
              className="w-full border-teal-300 text-teal-700 hover:bg-teal-50"
            >
              <RefreshCw size={16} className="mr-2" />
              Sync Sender IDs from HostPinnacle
            </Button>
          </div>
        )}

        {/* Sender IDs List */}
        <div>
          <h3 className="font-semibold text-slate-900 mb-3">Linked Sender IDs</h3>
          {user.senderIds.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-8">
              No sender IDs assigned yet
            </p>
          ) : (
            <div className="space-y-2">
              {user.senderIds.map((sid) => (
                <div
                  key={sid.id}
                  className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-medium text-slate-900">{sid.senderName}</span>
                    {sid.isDefault && (
                      <span className="text-xs bg-teal-100 text-teal-700 px-2 py-1 rounded">
                        Default
                      </span>
                    )}
                    <span
                      className={`text-xs px-2 py-1 rounded ${
                        sid.status === 'active'
                          ? 'bg-emerald-100 text-emerald-700'
                          : sid.status === 'pending'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {sid.status}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    {!sid.isDefault && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onSetDefault(sid.id)}
                        className="text-xs"
                      >
                        Set Default
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onRemove(sid.id)}
                      className="text-xs text-red-600 hover:text-red-700"
                    >
                      <X size={14} />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}

export default function AdminUsersPage() {
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [availableSenderIds, setAvailableSenderIds] = useState<HostPinnacleSenderId[]>([])
  const [loadingSenderIds, setLoadingSenderIds] = useState(false)
  const [isOwner, setIsOwner] = useState<boolean | null>(null)

  // Check if user is owner - MUST RUN FIRST
  useEffect(() => {
    if (typeof window === 'undefined') return
    
    const userStr = localStorage.getItem('user')
    if (!userStr) {
      setIsOwner(false)
      return
    }

    try {
      const user = JSON.parse(userStr)
      const ownerStatus = !!user.isOwner
      setIsOwner(ownerStatus)
      
      // If user is owner, redirect to super-admin immediately using window.location
      if (ownerStatus) {
        console.log('AdminUsersPage: Redirecting owner to /super-admin', { 
          isOwner: ownerStatus, 
          email: user.email,
          userObject: user
        })
        // Use window.location for immediate, unblockable redirect
        window.location.href = '/super-admin'
        return
      }
    } catch (error) {
      console.error('Error parsing user from localStorage:', error)
      setIsOwner(false)
    }
  }, [])

  // Fetch data after owner check
  useEffect(() => {
    // Only fetch if not owner (owner will be redirected)
    if (isOwner === false) {
      fetchUsers()
      fetchAllSenderIds()
    }
  }, [isOwner])

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('token')
      
      if (!token) {
        console.error('No authentication token found')
        alert('Please log in to access this page')
        router.push('/auth/login')
        return
      }

      const response = await fetch('/api/admin/users', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        console.error('Failed to fetch users:', errorData)
        
        if (response.status === 401 || response.status === 403) {
          alert(`Access denied: ${errorData.error || 'You do not have permission to access this page'}`)
          router.push('/auth/login')
          return
        }
        
        throw new Error(errorData.error || `Failed to fetch users: ${response.status}`)
      }

      const data = await response.json()
      setUsers(data.users || [])
    } catch (error: any) {
      console.error('Error fetching users:', error)
      alert(`Error: ${error.message || 'Failed to fetch users. Please try again.'}`)
    } finally {
      setLoading(false)
    }
  }

  const fetchAllSenderIds = async () => {
    try {
      setLoadingSenderIds(true)
      const token = localStorage.getItem('token')
      
      if (!token) {
        console.error('No authentication token found')
        return
      }

      const response = await fetch('/api/admin/senderids', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        console.error('Failed to fetch sender IDs:', errorData)
        
        // Don't show alert for 401/403 - already handled in fetchUsers
        if (response.status === 401 || response.status === 403) {
          return
        }
        
        // For other errors, log but don't block the page
        console.warn(`Failed to fetch sender IDs: ${errorData.error || 'Unknown error'}. The page will still work, but sender ID dropdown may be empty.`)
        setAvailableSenderIds([])
        return
      }

      const data = await response.json()
      console.log('Fetched sender IDs:', data)
      setAvailableSenderIds(data.senderIds || [])
      
      if (data.senderIds && data.senderIds.length === 0) {
        console.warn('No sender IDs found in HostPinnacle response')
      }
    } catch (error: any) {
      console.error('Error fetching sender IDs:', error)
      // Don't show alert - this is a non-critical feature
      // The page can still function without the sender ID list
      setAvailableSenderIds([])
    } finally {
      setLoadingSenderIds(false)
    }
  }

  const handleAssignSenderId = async (userId: string, senderName: string) => {
    try {
      // Find the sender ID in available list to get its status
      const senderIdInfo = availableSenderIds.find(
        sid => sid.senderName.toLowerCase() === senderName.toLowerCase()
      )

      const response = await fetch(`/api/admin/users/${userId}/senderids`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ 
          senderName,
          status: senderIdInfo?.status 
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to assign sender ID')
      }

      await fetchUsers()
      if (selectedUser?.id === userId) {
        const updated = users.find((u) => u.id === userId)
        if (updated) setSelectedUser(updated)
      }
    } catch (error: any) {
      alert(error.message)
    }
  }

  const handleRemoveSenderId = async (userId: string, senderId: string) => {
    if (!confirm('Remove this sender ID from user?')) return

    try {
      const response = await fetch(`/api/admin/users/${userId}/senderids/${senderId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      })

      if (!response.ok) {
        throw new Error('Failed to remove sender ID')
      }

      await fetchUsers()
      if (selectedUser?.id === userId) {
        const updated = users.find((u) => u.id === userId)
        if (updated) setSelectedUser(updated)
      }
    } catch (error: any) {
      alert(error.message)
    }
  }

  const handleAdjustCredits = async (
    userId: string,
    action: 'add' | 'remove',
    credits: number,
    reason?: string
  ) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}/credits`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ action, credits, reason }),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to adjust credits')
      }

      await fetchUsers()
      if (selectedUser?.id === userId) {
        setSelectedUser((prev) =>
          prev ? { ...prev, credits: data.newBalance } : prev
        )
      }
      alert(
        action === 'add'
          ? `Added ${credits} credits. New balance: ${data.newBalance}`
          : `Removed ${credits} credits. New balance: ${data.newBalance}`
      )
    } catch (error: any) {
      alert(error.message)
      throw error
    }
  }

  const handleSetDefault = async (userId: string, senderId: string) => {
    try {
      const response = await fetch(
        `/api/admin/users/${userId}/senderids/${senderId}/default`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        }
      )

      if (!response.ok) {
        throw new Error('Failed to set default sender ID')
      }

      await fetchUsers()
      if (selectedUser?.id === userId) {
        const updated = users.find((u) => u.id === userId)
        if (updated) setSelectedUser(updated)
      }
    } catch (error: any) {
      alert(error.message)
    }
  }

  const handleSyncSenderIds = async (userId: string) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}/sync-senderids`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to sync sender IDs')
      }

      const data = await response.json()
      alert(`Synced ${data.count} sender IDs`)
      await fetchUsers()
      if (selectedUser?.id === userId) {
        const updated = users.find((u) => u.id === userId)
        if (updated) setSelectedUser(updated)
      }
    } catch (error: any) {
      alert(error.message)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle2 size={16} className="text-emerald-600" />
      case 'pending':
        return <Clock size={16} className="text-blue-600" />
      case 'rejected':
        return <XCircle size={16} className="text-red-600" />
      default:
        return null
    }
  }

  // Show loading/redirect message if owner (before rendering main content)
  if (isOwner === true) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-600">Redirecting to Super Admin...</p>
        </div>
      </div>
    )
  }

  return (
    <PortalLayout activeSection="Admin">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-slate-900 mb-2">User Management</h1>
            <p className="text-slate-600">
              Manage users and their sender IDs
              {availableSenderIds.length > 0 && (
                <span className="ml-2 text-sm text-teal-600 font-medium">
                  • {availableSenderIds.length} sender ID{availableSenderIds.length !== 1 ? 's' : ''} available from HostPinnacle
                </span>
              )}
            </p>
          </div>
          <Button
            onClick={fetchAllSenderIds}
            disabled={loadingSenderIds}
            variant="outline"
            className="border-teal-300 text-teal-700 hover:bg-teal-50"
          >
            <RefreshCw size={16} className={`mr-2 ${loadingSenderIds ? 'animate-spin' : ''}`} />
            Refresh Sender IDs
          </Button>
        </div>

        {loading ? (
          <Card className="p-12 text-center">
            <RefreshCw className="w-8 h-8 animate-spin text-teal-600 mx-auto mb-4" />
            <p className="text-slate-600">Loading users...</p>
          </Card>
        ) : (
          <Card className="p-6">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">
                      User
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">
                      HP Username
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">
                      Credits
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">
                      Sender IDs
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-4 px-4">
                        <div>
                          <div className="font-medium text-slate-900">{user.name}</div>
                          <div className="text-sm text-slate-500">{user.email}</div>
                          {user.phone && (
                            <div className="text-xs text-slate-400">{user.phone}</div>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <span className="text-sm text-slate-600">
                          {user.hpUserLoginName || '-'}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <span className="font-medium text-slate-900">
                          {user.credits.toLocaleString()} credits
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex flex-wrap gap-2">
                          {user.senderIds.length === 0 ? (
                            <span className="text-xs text-slate-400">None</span>
                          ) : (
                            user.senderIds.map((sid) => (
                              <span
                                key={sid.id}
                                className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-slate-100 text-slate-700"
                              >
                                {getStatusIcon(sid.status)}
                                {sid.senderName}
                                {sid.isDefault && (
                                  <span className="text-teal-600">★</span>
                                )}
                              </span>
                            ))
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedUser(user)
                            setIsModalOpen(true)
                          }}
                          className="border-teal-300 text-teal-700 hover:bg-teal-50"
                        >
                          <Settings size={14} className="mr-2" />
                          Manage
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        <SenderIdModal
          user={selectedUser}
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false)
            setSelectedUser(null)
          }}
          onAssign={(senderName) =>
            selectedUser && handleAssignSenderId(selectedUser.id, senderName)
          }
          onRemove={(senderId) =>
            selectedUser && handleRemoveSenderId(selectedUser.id, senderId)
          }
          onSetDefault={(senderId) =>
            selectedUser && handleSetDefault(selectedUser.id, senderId)
          }
          onSync={() => selectedUser && handleSyncSenderIds(selectedUser.id)}
          onAdjustCredits={(action, credits, reason) =>
            selectedUser
              ? handleAdjustCredits(selectedUser.id, action, credits, reason)
              : Promise.resolve()
          }
          availableSenderIds={availableSenderIds}
          loadingSenderIds={loadingSenderIds}
        />
      </div>
    </PortalLayout>
  )
}


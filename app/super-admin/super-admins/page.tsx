'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Shield, Search, RefreshCw, UserPlus, Trash2 } from 'lucide-react'

interface SuperAdminRow {
  id: string
  name: string
  email: string
  isActive: boolean
  isRootOwner: boolean
  isSuperAdmin: boolean
}

export default function SuperAdminsPage() {
  const [superAdmins, setSuperAdmins] = useState<SuperAdminRow[]>([])
  const [candidates, setCandidates] = useState<SuperAdminRow[]>([])
  const [currentUserId, setCurrentUserId] = useState('')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [searching, setSearching] = useState(false)
  const [message, setMessage] = useState<{ type: 'ok' | 'error'; text: string } | null>(null)
  const [pendingDelete, setPendingDelete] = useState<SuperAdminRow | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const token = () => localStorage.getItem('token')

  const loadAdmins = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/super-admin/super-admins', {
        headers: { Authorization: `Bearer ${token()}` },
      })
      if (response.status === 401 || response.status === 403) {
        window.location.href = '/auth/login'
        return
      }
      if (!response.ok) throw new Error('Failed to load super admins')
      const result = await response.json()
      setSuperAdmins(result.data.superAdmins || [])
      setCurrentUserId(result.data.currentUserId || '')
    } catch (error) {
      console.error(error)
      setMessage({ type: 'error', text: 'Could not load super admins.' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAdmins()
  }, [])

  useEffect(() => {
    const q = search.trim()
    if (q.length < 2) {
      setCandidates([])
      return
    }

    const handle = setTimeout(async () => {
      try {
        setSearching(true)
        const response = await fetch(`/api/super-admin/super-admins?q=${encodeURIComponent(q)}`, {
          headers: { Authorization: `Bearer ${token()}` },
        })
        if (!response.ok) return
        const result = await response.json()
        setCandidates(result.data.candidates || [])
      } catch (error) {
        console.error(error)
      } finally {
        setSearching(false)
      }
    }, 300)

    return () => clearTimeout(handle)
  }, [search])

  const approveUser = async (user: SuperAdminRow) => {
    try {
      setBusyId(user.id)
      setMessage(null)
      const response = await fetch('/api/super-admin/super-admins', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: user.id }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Failed to approve user')
      setSearch('')
      setCandidates([])
      setMessage({
        type: 'ok',
        text: `${user.name} is now a super admin. They need to log out and log back in to open this portal.`,
      })
      await loadAdmins()
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to approve user.' })
    } finally {
      setBusyId(null)
    }
  }

  const removeAdmin = async () => {
    if (!pendingDelete) return
    try {
      setBusyId(pendingDelete.id)
      setMessage(null)
      const response = await fetch(`/api/super-admin/super-admins/${pendingDelete.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token()}` },
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Failed to remove super admin')
      setMessage({ type: 'ok', text: `${pendingDelete.name} is no longer a super admin.` })
      setPendingDelete(null)
      await loadAdmins()
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to remove super admin.' })
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-slate-900">Super Admin Permissions</h1>
            <p className="text-slate-600 mt-1">
              Approve an existing user as a super admin, or remove another super admin.
            </p>
          </div>
          <button
            onClick={loadAdmins}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl shadow-sm text-slate-700 hover:bg-slate-100 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        <Card className="p-6 border border-slate-200/70 rounded-2xl bg-white shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-700">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Approve a user</h2>
              <p className="text-sm text-slate-500">Search by name or email, then approve them.</p>
            </div>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search users to approve..."
              className="pl-9"
            />
          </div>

          {search.trim().length > 0 && search.trim().length < 2 && (
            <p className="text-sm text-slate-500 mt-3">Type at least 2 characters to search.</p>
          )}

          {searching && <p className="text-sm text-slate-500 mt-3">Searching...</p>}

          {candidates.length > 0 && (
            <div className="mt-4 divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
              {candidates.map((user) => (
                <div key={user.id} className="flex items-center justify-between gap-4 px-4 py-3 bg-white">
                  <div>
                    <p className="font-medium text-slate-900">{user.name}</p>
                    <p className="text-sm text-slate-500">{user.email}</p>
                  </div>
                  <Button
                    onClick={() => approveUser(user)}
                    disabled={busyId === user.id}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    <UserPlus className="w-4 h-4 mr-2" />
                    Approve
                  </Button>
                </div>
              ))}
            </div>
          )}

          {search.trim().length >= 2 && !searching && candidates.length === 0 && (
            <p className="text-sm text-slate-500 mt-3">No matching users who are not already super admins.</p>
          )}
        </Card>

        {message && (
          <p className={`text-sm ${message.type === 'ok' ? 'text-emerald-700' : 'text-rose-600'}`}>
            {message.text}
          </p>
        )}

        <Card className="p-6 border border-slate-200/70 rounded-2xl bg-white shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-slate-100 text-slate-700">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Current super admins</h2>
              <p className="text-sm text-slate-500">The root owner cannot be removed.</p>
            </div>
          </div>

          {loading ? (
            <p className="text-slate-500">Loading...</p>
          ) : superAdmins.length === 0 ? (
            <p className="text-slate-500">No super admins found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wider text-slate-600">
                    <th className="py-3 pr-4">Name</th>
                    <th className="py-3 pr-4">Email</th>
                    <th className="py-3 pr-4">Status</th>
                    <th className="py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {superAdmins.map((admin) => {
                    const isSelf = admin.id === currentUserId
                    const canDelete = !admin.isRootOwner && !isSelf
                    return (
                      <tr key={admin.id}>
                        <td className="py-3 pr-4 font-medium text-slate-900">{admin.name}</td>
                        <td className="py-3 pr-4 text-slate-600">{admin.email}</td>
                        <td className="py-3 pr-4">
                          <div className="flex flex-wrap gap-2">
                            {admin.isRootOwner && (
                              <Badge className="bg-amber-50 text-amber-800 border-amber-200">
                                Root owner
                              </Badge>
                            )}
                            {isSelf && (
                              <Badge className="bg-emerald-50 text-emerald-800 border-emerald-200">You</Badge>
                            )}
                            {!admin.isActive && (
                              <Badge className="bg-rose-50 text-rose-700 border-rose-200">Inactive</Badge>
                            )}
                          </div>
                        </td>
                        <td className="py-3 text-right">
                          {canDelete ? (
                            <Button
                              variant="outline"
                              onClick={() => setPendingDelete(admin)}
                              disabled={busyId === admin.id}
                              className="text-rose-700 border-rose-200 hover:bg-rose-50"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
                            </Button>
                          ) : (
                            <span className="text-xs text-slate-400">
                              {admin.isRootOwner ? 'Cannot delete root owner' : 'Cannot delete yourself'}
                            </span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      <AlertDialog open={!!pendingDelete} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove super admin?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete
                ? `${pendingDelete.name} (${pendingDelete.email}) will lose super admin access. Their user account stays active.`
                : ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={removeAdmin}
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
              Delete super admin
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

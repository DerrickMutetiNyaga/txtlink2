'use client'

import { AdminLayout } from '@/components/admin-layout'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/status-badge'
import { useState } from 'react'
import { ChevronRight } from 'lucide-react'

export default function SenderIDApprovalsPage() {
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [showRejectModal, setShowRejectModal] = useState(false)

  const applications = [
    {
      id: 1,
      client: 'Tech Solutions Ltd',
      senderID: 'TECHSOL',
      useCase: 'Transactional',
      status: 'pending',
      submittedDate: '2024-02-05',
      companyReg: 'CR/123456/2024',
      message: 'We will use this sender ID for OTP and account notifications.',
    },
    {
      id: 2,
      client: 'Finance Bank',
      senderID: 'FBANK',
      useCase: 'Transactional',
      status: 'pending',
      submittedDate: '2024-02-04',
      companyReg: 'CR/234567/2024',
      message: 'For transactional alerts and account updates.',
    },
    {
      id: 3,
      client: 'E-Health Clinics',
      senderID: 'CLINIC',
      useCase: 'Mixed',
      status: 'approved',
      submittedDate: '2024-02-03',
      companyReg: 'CR/345678/2024',
      message: 'Appointment reminders and health notifications.',
    },
  ]

  const selectedApp = selectedId ? applications.find((a) => a.id === selectedId) : null

  return (
    <AdminLayout activeSection="Sender ID Approvals">
      <div className="grid md:grid-cols-3 gap-6">
        {/* List */}
        <div className="md:col-span-1">
          <h2 className="text-lg font-bold text-primary mb-4">
            Applications ({applications.filter((a) => a.status === 'pending').length} pending)
          </h2>
          <div className="space-y-3">
            {applications.map((app) => (
              <Card
                key={app.id}
                onClick={() => setSelectedId(app.id)}
                className={`p-4 border cursor-pointer transition-all ${
                  selectedId === app.id
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-semibold text-foreground text-sm">{app.senderID}</h4>
                    <p className="text-xs text-muted-foreground">{app.client}</p>
                  </div>
                  <ChevronRight size={16} className="text-muted-foreground" />
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Details */}
        <div className="md:col-span-2">
          {selectedApp ? (
            <div className="space-y-6">
              {/* Header */}
              <Card className="p-6 border-border">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="text-2xl font-bold text-primary">{selectedApp.senderID}</h2>
                    <p className="text-muted-foreground">{selectedApp.client}</p>
                  </div>
                  <StatusBadge status={selectedApp.status as 'pending' | 'approved'} />
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground mb-1">Submitted</p>
                    <p className="font-medium text-foreground">{selectedApp.submittedDate}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-1">Use Case</p>
                    <p className="font-medium text-foreground">{selectedApp.useCase}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-1">Company Registration</p>
                    <p className="font-medium text-foreground">{selectedApp.companyReg}</p>
                  </div>
                </div>
              </Card>

              {/* Details */}
              <Card className="p-6 border-border">
                <h3 className="font-semibold text-foreground mb-4">Application Details</h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Sample Message</label>
                    <p className="text-foreground mt-2 p-4 bg-muted rounded-lg text-sm">{selectedApp.message}</p>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Documents</label>
                    <div className="mt-3 space-y-2">
                      {['Certificate of Incorporation', 'Director ID', 'Tax PIN'].map((doc) => (
                        <div
                          key={doc}
                          className="flex items-center justify-between p-3 bg-muted rounded-lg text-sm"
                        >
                          <span className="text-foreground">{doc}</span>
                          <span className="text-xs font-semibold px-2 py-1 bg-green-50 text-green-700 rounded">
                            Verified
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </Card>

              {/* Actions */}
              {selectedApp.status === 'pending' && (
                <Card className="p-6 border-border flex gap-4">
                  <Button
                    variant="outline"
                    className="flex-1 border-red-200 text-red-600 hover:bg-red-50 bg-transparent"
                    onClick={() => setShowRejectModal(true)}
                  >
                    Reject
                  </Button>
                  <Button className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90">
                    Approve
                  </Button>
                </Card>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-96 text-muted-foreground">
              <p>Select an application to view details</p>
            </div>
          )}
        </div>
      </div>

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md p-8 border-border">
            <h3 className="text-xl font-bold text-primary mb-6">Reject Application</h3>
            <form className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Reason for Rejection</label>
                <textarea
                  placeholder="Provide a detailed reason for rejection..."
                  rows={4}
                  className="w-full px-4 py-3 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                />
              </div>

              <div className="flex gap-4">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 border-border text-foreground hover:bg-muted bg-transparent"
                  onClick={() => setShowRejectModal(false)}
                >
                  Cancel
                </Button>
                <Button className="flex-1 bg-red-600 text-white hover:bg-red-700" onClick={() => setShowRejectModal(false)}>
                  Reject
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </AdminLayout>
  )
}

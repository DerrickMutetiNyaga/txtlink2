'use client'

import { useState } from 'react'
import { OnboardingWizard, FileUpload, OnboardingStep } from '@/components/onboarding-wizard'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { StatusBadge } from '@/components/status-badge'
import { ArrowRight, ArrowLeft, CheckCircle, Clock } from 'lucide-react'

const steps: OnboardingStep[] = [
  { id: 1, title: 'Company Profile', description: 'Basic information', completed: true },
  { id: 2, title: 'KYC Documents', description: 'Upload documents', completed: false },
  { id: 3, title: 'Sender ID', description: 'Apply for Sender ID', completed: false },
  { id: 4, title: 'Review', description: 'Verify details', completed: false },
  { id: 5, title: 'Status', description: 'Track approval', completed: false },
]

export default function OnboardingPage() {
  const [currentStep, setCurrentStep] = useState(1)

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <Step1 />
      case 2:
        return <Step2 />
      case 3:
        return <Step3 />
      case 4:
        return <Step4 />
      case 5:
        return <Step5 />
      default:
        return null
    }
  }

  return (
    <OnboardingWizard
      currentStep={currentStep}
      onStepChange={setCurrentStep}
      steps={steps}
    >
      {renderStep()}
    </OnboardingWizard>
  )
}

function Step1() {
  const [formData, setFormData] = useState({
    businessName: '',
    regNumber: '',
    website: '',
    address: '',
    industry: '',
    contactPerson: '',
  })

  return (
    <Card className="p-8 border-border">
      <h2 className="text-2xl font-bold text-primary mb-6">Company Profile</h2>
      <form className="space-y-6">
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Business Name</label>
            <input
              type="text"
              placeholder="Your Company Ltd"
              className="w-full px-4 py-3 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Registration Number</label>
            <input
              type="text"
              placeholder="CR/123456/2024"
              className="w-full px-4 py-3 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Website</label>
          <input
            type="url"
            placeholder="https://example.com"
            className="w-full px-4 py-3 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Industry</label>
            <select className="w-full px-4 py-3 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50">
              <option>Select industry</option>
              <option>Banking</option>
              <option>Healthcare</option>
              <option>Logistics</option>
              <option>Education</option>
              <option>Government</option>
              <option>Other</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Contact Person</label>
            <input
              type="text"
              placeholder="John Doe"
              className="w-full px-4 py-3 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Office Address</label>
          <textarea
            placeholder="Street address"
            rows={3}
            className="w-full px-4 py-3 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>

        <div className="flex justify-end gap-4 pt-4">
          <Button variant="outline" className="border-border text-foreground hover:bg-muted bg-transparent">
            Cancel
          </Button>
          <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
            Continue <ArrowRight className="ml-2" size={18} />
          </Button>
        </div>
      </form>
    </Card>
  )
}

function Step2() {
  return (
    <Card className="p-8 border-border">
      <h2 className="text-2xl font-bold text-primary mb-6">KYC Documents</h2>
      <p className="text-muted-foreground mb-8">Upload the following documents for verification</p>

      <div className="space-y-6">
        <FileUpload
          label="Certificate of Incorporation"
          description="Upload your business registration certificate (PDF or image)"
          fileName="cert-of-incorporation.pdf"
          status="uploaded"
        />

        <FileUpload
          label="Director ID / Passport"
          description="Valid government-issued ID of the director"
          fileName="director-id.jpg"
          status="uploaded"
        />

        <FileUpload
          label="Tax PIN / KRA"
          description="Tax identification number certificate"
          status="pending"
        />

        <div className="flex justify-between gap-4 pt-4">
          <Button variant="outline" className="border-border text-foreground hover:bg-muted bg-transparent">
            <ArrowLeft className="mr-2" size={18} /> Previous
          </Button>
          <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
            Continue <ArrowRight className="ml-2" size={18} />
          </Button>
        </div>
      </div>
    </Card>
  )
}

function Step3() {
  return (
    <Card className="p-8 border-border">
      <h2 className="text-2xl font-bold text-primary mb-6">Sender ID Application</h2>
      <form className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Sender ID Name</label>
          <input
            type="text"
            placeholder="e.g., TXTLINK"
            maxLength={11}
            className="w-full px-4 py-3 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
          <p className="text-xs text-muted-foreground mt-2">Maximum 11 characters</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Use Case Category</label>
          <select className="w-full px-4 py-3 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50">
            <option>Select category</option>
            <option>Transactional</option>
            <option>Promotional</option>
            <option>OTP/Verification</option>
            <option>Mixed</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Sample Message Templates</label>
          <textarea
            placeholder="Enter 2-3 sample messages you plan to send"
            rows={4}
            className="w-full px-4 py-3 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Expected Monthly Volume</label>
            <select className="w-full px-4 py-3 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50">
              <option>Select volume</option>
              <option>0 - 100K</option>
              <option>100K - 1M</option>
              <option>1M - 10M</option>
              <option>10M+</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Target Networks</label>
            <select className="w-full px-4 py-3 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50">
              <option>All Networks</option>
              <option>Safaricom Only</option>
              <option>Airtel Only</option>
              <option>Multiple</option>
            </select>
          </div>
        </div>

        <div className="flex items-start gap-3 p-4 bg-primary/5 rounded-lg border border-primary/10">
          <input type="checkbox" id="consent" className="w-4 h-4 mt-1" />
          <label htmlFor="consent" className="text-sm text-foreground">
            I confirm that all messages sent will include proper opt-in consent and opt-out mechanisms as required by law.
          </label>
        </div>

        <div className="flex justify-between gap-4 pt-4">
          <Button variant="outline" className="border-border text-foreground hover:bg-muted bg-transparent">
            <ArrowLeft className="mr-2" size={18} /> Previous
          </Button>
          <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
            Continue <ArrowRight className="ml-2" size={18} />
          </Button>
        </div>
      </form>
    </Card>
  )
}

function Step4() {
  const reviewData = {
    company: 'Tech Solutions Ltd',
    regNumber: 'CR/123456/2024',
    senderID: 'TXTLINK',
    useCase: 'Transactional',
    volume: '1M - 10M',
  }

  return (
    <Card className="p-8 border-border">
      <h2 className="text-2xl font-bold text-primary mb-6">Review & Confirm</h2>
      <p className="text-muted-foreground mb-8">Please verify all details before submission</p>

      <div className="space-y-6 mb-8">
        <div className="p-6 bg-muted rounded-lg">
          <h3 className="font-semibold text-primary mb-4">Company Information</h3>
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Business Name</p>
              <p className="font-medium text-foreground">{reviewData.company}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Registration Number</p>
              <p className="font-medium text-foreground">{reviewData.regNumber}</p>
            </div>
          </div>
        </div>

        <div className="p-6 bg-muted rounded-lg">
          <h3 className="font-semibold text-primary mb-4">Sender ID Details</h3>
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Sender ID</p>
              <p className="font-medium text-foreground">{reviewData.senderID}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Use Case</p>
              <p className="font-medium text-foreground">{reviewData.useCase}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Expected Volume</p>
              <p className="font-medium text-foreground">{reviewData.volume}</p>
            </div>
          </div>
        </div>

        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-900">
            By submitting, you confirm that all information is accurate and you comply with applicable telecommunications regulations.
          </p>
        </div>
      </div>

      <div className="flex justify-between gap-4">
        <Button variant="outline" className="border-border text-foreground hover:bg-muted bg-transparent">
          <ArrowLeft className="mr-2" size={18} /> Previous
        </Button>
        <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
          Submit Application <ArrowRight className="ml-2" size={18} />
        </Button>
      </div>
    </Card>
  )
}

function Step5() {
  return (
    <Card className="p-8 border-border">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-50 mb-6">
          <Clock size={32} className="text-blue-600" />
        </div>
        <h2 className="text-2xl font-bold text-primary mb-2">Application Submitted</h2>
        <p className="text-muted-foreground">Your Sender ID application is under review</p>
      </div>

      <div className="space-y-6">
        <div className="space-y-3">
          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
            <span className="font-medium text-foreground">Application Received</span>
            <StatusBadge status="approved" label="Complete" />
          </div>
          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
            <span className="font-medium text-foreground">Under Review</span>
            <StatusBadge status="pending" label="In Progress" />
          </div>
          <div className="flex items-center justify-between p-4 bg-muted rounded-lg opacity-50">
            <span className="font-medium text-foreground">Approval</span>
            <StatusBadge status="pending" label="Pending" />
          </div>
        </div>

        <div className="p-6 bg-primary/5 border border-primary/10 rounded-lg">
          <p className="text-sm text-foreground mb-2">
            <strong>Reference Number:</strong> APP-2024-001234
          </p>
          <p className="text-sm text-muted-foreground">
            Typical approval time is 3-5 business days. You'll receive email notifications at each stage.
          </p>
        </div>

        <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
          Go to Dashboard
        </Button>
      </div>
    </Card>
  )
}

'use client'

import React from "react"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { StatusBadge } from '@/components/status-badge'
import { ChevronRight, Upload, CheckCircle, XCircle, Clock } from 'lucide-react'

export interface OnboardingStep {
  id: number
  title: string
  description: string
  completed: boolean
}

interface OnboardingWizardProps {
  currentStep: number
  onStepChange: (step: number) => void
  steps: OnboardingStep[]
  children: React.ReactNode
}

export function OnboardingWizard({
  currentStep,
  onStepChange,
  steps,
  children,
}: OnboardingWizardProps) {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-primary text-primary-foreground py-12 px-6">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">Onboarding</h1>
          <p className="opacity-90">Step {currentStep} of {steps.length}</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-12 grid md:grid-cols-4 gap-6">
        {/* Sidebar with steps */}
        <div className="md:col-span-1">
          <div className="space-y-4 sticky top-20">
            {steps.map((step) => (
              <div
                key={step.id}
                onClick={() => currentStep > step.id && onStepChange(step.id)}
                className={`cursor-pointer p-4 rounded-lg border-2 transition-all ${
                  currentStep === step.id
                    ? 'border-primary bg-primary/5'
                    : step.completed
                      ? 'border-green-500 bg-green-50'
                      : 'border-border hover:border-primary/50'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm ${
                      currentStep === step.id
                        ? 'bg-primary text-primary-foreground'
                        : step.completed
                          ? 'bg-green-500 text-white'
                          : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {step.completed ? '✓' : step.id}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-sm text-foreground">{step.title}</h3>
                    <p className="text-xs text-muted-foreground mt-1">{step.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Main content */}
        <div className="md:col-span-3">{children}</div>
      </div>
    </div>
  )
}

export function FileUpload({
  label,
  description,
  fileName,
  status,
}: {
  label: string
  description: string
  fileName?: string
  status?: 'uploaded' | 'pending' | 'rejected'
}) {
  const statusConfig = {
    uploaded: { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50' },
    pending: { icon: Clock, color: 'text-blue-600', bg: 'bg-blue-50' },
    rejected: { icon: XCircle, color: 'text-red-600', bg: 'bg-red-50' },
  }

  const config = status ? statusConfig[status] : null
  const Icon = config?.icon

  return (
    <div className="p-6 border-2 border-dashed border-border rounded-lg hover:border-primary/50 transition-colors cursor-pointer group">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h4 className="font-semibold text-foreground mb-1">{label}</h4>
          <p className="text-sm text-muted-foreground mb-3">{description}</p>
          {fileName && (
            <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg ${config?.bg}`}>
              {Icon && <Icon size={16} className={config?.color} />}
              <span className="text-sm font-medium text-foreground">{fileName}</span>
            </div>
          )}
        </div>
        <Upload size={24} className="text-muted-foreground group-hover:text-primary transition-colors" />
      </div>
    </div>
  )
}

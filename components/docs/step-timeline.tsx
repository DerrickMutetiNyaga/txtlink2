'use client'

import React from 'react'
import { CheckCircle2, Circle } from 'lucide-react'

interface Step {
  title: string
  description: string
  time?: string
}

interface StepTimelineProps {
  steps: Step[]
  currentStep?: number
}

export function StepTimeline({ steps, currentStep }: StepTimelineProps) {
  return (
    <div className="space-y-6">
      {steps.map((step, index) => {
        const isComplete = currentStep ? index < currentStep : false
        const isCurrent = currentStep === index

        return (
          <div key={index} className="flex gap-4">
            <div className="flex-shrink-0">
              {isComplete ? (
                <div className="w-8 h-8 rounded-full bg-teal-600 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-white" />
                </div>
              ) : (
                <div
                  className={`w-8 h-8 rounded-full border-2 flex items-center justify-center ${
                    isCurrent
                      ? 'border-teal-600 bg-teal-50'
                      : 'border-slate-300 bg-white'
                  }`}
                >
                  <span
                    className={`text-sm font-semibold ${
                      isCurrent ? 'text-teal-600' : 'text-slate-400'
                    }`}
                  >
                    {index + 1}
                  </span>
                </div>
              )}
            </div>
            <div className="flex-1 pb-8 border-l border-slate-200 pl-6">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-slate-900">{step.title}</h3>
                {step.time && (
                  <span className="text-xs text-slate-500">({step.time})</span>
                )}
              </div>
              <p className="text-sm text-slate-600">{step.description}</p>
            </div>
          </div>
        )
      })}
    </div>
  )
}


'use client'

import React, { useState } from 'react'

interface TabsProps {
  children: React.ReactNode
  defaultTab?: string
}

interface TabProps {
  id: string
  label: string
  children: React.ReactNode
}

export function Tabs({ children, defaultTab }: TabsProps) {
  const tabs = React.Children.toArray(children) as React.ReactElement<TabProps>[]
  const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.props.id || '')

  return (
    <div>
      <div className="flex gap-1 border-b border-slate-200 mb-4">
        {tabs.map((tab) => (
          <button
            key={tab.props.id}
            onClick={() => setActiveTab(tab.props.id)}
            className={`
              px-4 py-2 text-sm font-medium border-b-2 transition-colors
              ${
                activeTab === tab.props.id
                  ? 'border-teal-600 text-teal-600'
                  : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
              }
            `}
          >
            {tab.props.label}
          </button>
        ))}
      </div>
      <div>
        {tabs.find((tab) => tab.props.id === activeTab)?.props.children}
      </div>
    </div>
  )
}

export function Tab({ children }: TabProps) {
  return <>{children}</>
}


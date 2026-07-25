'use client'

import { SystemHealthPanel } from '@/components/super-admin/SystemHealthPanel'

export default function SystemHealthPage() {
  return (
    <div className="p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <SystemHealthPanel />
      </div>
    </div>
  )
}

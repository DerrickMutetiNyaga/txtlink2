import { Suspense } from 'react'
import QueueStatusPage from './QueueStatusPage'

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-slate-600">Loading queue & health…</div>
      }
    >
      <QueueStatusPage />
    </Suspense>
  )
}

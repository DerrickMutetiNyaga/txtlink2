export function TableSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="flex gap-4 animate-pulse">
          <div className="flex-1 h-12 bg-muted rounded" />
          <div className="flex-1 h-12 bg-muted rounded" />
          <div className="flex-1 h-12 bg-muted rounded" />
          <div className="w-24 h-12 bg-muted rounded" />
        </div>
      ))}
    </div>
  )
}

export function CardSkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      <div className="h-6 bg-muted rounded w-1/2" />
      <div className="h-4 bg-muted rounded w-full" />
      <div className="h-4 bg-muted rounded w-3/4" />
      <div className="h-10 bg-muted rounded w-1/3 mt-4" />
    </div>
  )
}

export function GridSkeleton({ cols = 3 }: { cols?: number }) {
  return (
    <div className={`grid grid-cols-1 md:grid-cols-${cols} gap-6`}>
      {[1, 2, 3].map((i) => (
        <div key={i} className="p-6 border border-border rounded-lg animate-pulse">
          <div className="h-8 bg-muted rounded mb-4" />
          <div className="h-4 bg-muted rounded mb-2" />
          <div className="h-4 bg-muted rounded w-3/4" />
        </div>
      ))}
    </div>
  )
}

import { cn } from '@/lib/utils'

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'rounded-md bg-slate-200 relative overflow-hidden',
        className
      )}
      {...props}
    >
      <div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/60 to-transparent animate-[shimmer_2s_ease-in-out_infinite]"
        style={{
          backgroundSize: '200% 100%',
        }}
      />
    </div>
  )
}

export { Skeleton }

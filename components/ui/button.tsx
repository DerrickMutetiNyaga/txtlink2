import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-semibold transition-all focus-visible:outline-none disabled:pointer-events-none disabled:opacity-60 disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg]:w-4 [&_svg]:h-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default: 'bg-emerald-600 text-white hover:bg-emerald-700 rounded-xl px-4 py-2.5 shadow-sm focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2',
        primary: 'bg-emerald-600 text-white hover:bg-emerald-700 rounded-xl px-4 py-2.5 shadow-sm focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2',
        secondary:
          'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 rounded-xl px-4 py-2.5 shadow-sm focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2',
        destructive:
          'bg-white border border-red-200 text-red-700 hover:bg-red-50 hover:border-red-300 rounded-xl px-4 py-2.5 focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2',
        destructivePrimary:
          'bg-red-600 text-white hover:bg-red-700 rounded-xl px-4 py-2.5 shadow-sm focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2',
        outline:
          'border border-input bg-background hover:bg-accent hover:text-accent-foreground rounded-xl',
        ghost: 'bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900 rounded-xl px-3 py-2 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-10 px-4 py-2.5',
        sm: 'h-9 rounded-xl px-3 py-2',
        lg: 'h-11 rounded-xl px-8 py-2.5',
        icon: 'h-10 w-10 rounded-xl',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

export interface ButtonProps
  extends
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  },
)
Button.displayName = 'Button'

export { Button, buttonVariants }

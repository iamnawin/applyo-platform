'use client'

import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:translate-y-[1px]',
  {
    variants: {
      variant: {
        default: 'border border-primary/40 bg-[linear-gradient(180deg,hsl(214_100%_69%),hsl(214_100%_56%))] text-primary-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.28),inset_0_-1px_0_rgba(13,24,48,0.45),0_10px_24px_rgba(37,110,255,0.35)] hover:-translate-y-0.5 hover:brightness-105',
        destructive: 'border border-destructive/40 bg-[linear-gradient(180deg,hsl(0_82%_63%),hsl(0_72%_52%))] text-destructive-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.22),inset_0_-1px_0_rgba(56,10,10,0.5),0_10px_22px_rgba(220,38,38,0.28)] hover:-translate-y-0.5 hover:brightness-105',
        outline: 'border border-input/90 bg-[linear-gradient(180deg,hsl(224_28%_17%),hsl(223_25%_13%))] text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.05),inset_0_-1px_0_rgba(7,10,19,0.75),0_10px_20px_rgba(0,0,0,0.22)] hover:-translate-y-0.5 hover:border-primary/35 hover:bg-accent/70',
        secondary: 'border border-white/5 bg-[linear-gradient(180deg,hsl(221_25%_20%),hsl(221_23%_16%))] text-secondary-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.05),inset_0_-1px_0_rgba(7,10,19,0.72),0_10px_20px_rgba(0,0,0,0.18)] hover:-translate-y-0.5 hover:bg-secondary/90',
        ghost: 'text-muted-foreground hover:bg-accent/75 hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-lg px-3',
        lg: 'h-11 rounded-xl px-8',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
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
  }
)
Button.displayName = 'Button'

export { Button, buttonVariants }

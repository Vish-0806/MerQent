import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'border-border bg-surface-elevated text-foreground',
        primary: 'border-blue-500/30 bg-blue-500/10 text-blue-400',
        success: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400',
        warning: 'border-amber-500/30 bg-amber-500/10 text-amber-400',
        destructive: 'border-red-500/30 bg-red-500/10 text-red-400',
        outline: 'border-border text-muted-foreground',
        verified: 'border-blue-500/40 bg-blue-900/30 text-blue-300 font-medium gap-1',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {
  isVerified?: boolean;
}

export function Badge({ className, variant, isVerified, children, ...props }: BadgeProps) {
  return (
    <div
      className={cn(badgeVariants({ variant: isVerified ? 'verified' : variant }), className)}
      {...props}
    >
      {isVerified && <CheckCircle2 className="h-3 w-3 text-blue-400" />}
      {children}
    </div>
  );
}

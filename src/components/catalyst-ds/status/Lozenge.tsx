import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const lozengeVariants = cva(
  'inline-flex items-center rounded-[3px] px-1.5 py-0 text-[11px] font-bold uppercase leading-[20px] tracking-[0.03em] whitespace-nowrap',
  {
    variants: {
      appearance: {
        default: 'bg-[var(--ds-border,var(--cp-lozenge-grey-bg, var(--cp-border-neutral)))] text-[var(--ds-text)] dark:bg-[var(--ds-border-bold)] dark:text-[var(--ds-text,var(--cp-bg-neutral))]',
        info: 'bg-[var(--ds-background-information)] text-[var(--ds-link-pressed)] dark:bg-[var(--ds-background-information)] dark:text-[var(--ds-background-information)]',
        success: 'bg-[var(--ds-background-success)] text-[var(--ds-text-success)] dark:bg-[#1C3D2E] dark:text-[var(--ds-background-success)]',
        warning: 'bg-[var(--ds-background-warning)] text-[var(--ds-text,var(--cp-text-primary, var(--cp-text-inverse)))] dark:bg-[#4A3B1A] dark:text-[var(--ds-background-warning)]',
        danger: 'bg-[var(--ds-background-danger)] text-[var(--ds-text-danger)] dark:bg-[#4A1A1A] dark:text-[var(--ds-background-danger)]',
        inprogress: 'bg-[var(--ds-background-information)] text-[var(--ds-link-pressed)] dark:bg-[var(--ds-background-information)] dark:text-[var(--ds-background-information)]',
        new: 'bg-[var(--ds-background-success)] text-[var(--ds-text-success)] dark:bg-[#1C3D2E] dark:text-[var(--ds-background-success)]',
        moved: 'bg-[var(--ds-background-warning)] text-[var(--ds-text,var(--cp-text-primary, var(--cp-text-inverse)))] dark:bg-[#4A3B1A] dark:text-[var(--ds-background-warning)]',
        removed: 'bg-[var(--ds-background-danger)] text-[var(--ds-text-danger)] dark:bg-[#4A1A1A] dark:text-[var(--ds-background-danger)]',
      },
      isBold: {
        true: '',
        false: '',
      },
    },
    compoundVariants: [
      { appearance: 'default', isBold: true, className: 'bg-[var(--ds-text)] text-[var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated, var(--ds-surface))))] dark:bg-[var(--ds-text-subtlest)] dark:text-[var(--ds-surface)]' },
      { appearance: 'info', isBold: true, className: 'bg-[var(--ds-link-pressed)] text-[var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated, var(--ds-surface))))] dark:bg-[var(--ds-background-information-bold)] dark:text-[var(--ds-surface)]' },
      { appearance: 'success', isBold: true, className: 'bg-[var(--ds-text-success)] text-[var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated, var(--ds-surface))))] dark:bg-[var(--ds-background-success-bold)] dark:text-[var(--ds-surface)]' },
      { appearance: 'warning', isBold: true, className: 'bg-[var(--ds-background-warning-bold)] text-[var(--ds-text,var(--cp-text-primary, var(--cp-text-inverse)))] dark:bg-[var(--ds-background-warning-bold)] dark:text-[var(--ds-surface)]' },
      { appearance: 'danger', isBold: true, className: 'bg-[var(--ds-text-danger)] text-[var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated, var(--ds-surface))))] dark:bg-[var(--ds-background-danger-bold)] dark:text-[var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated, var(--ds-surface))))]' },
      { appearance: 'inprogress', isBold: true, className: 'bg-[var(--ds-link-pressed)] text-[var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated, var(--ds-surface))))] dark:bg-[var(--ds-background-information-bold)] dark:text-[var(--ds-surface)]' },
      { appearance: 'new', isBold: true, className: 'bg-[var(--ds-text-success)] text-[var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated, var(--ds-surface))))] dark:bg-[var(--ds-background-success-bold)] dark:text-[var(--ds-surface)]' },
      { appearance: 'moved', isBold: true, className: 'bg-[var(--ds-background-warning-bold)] text-[var(--ds-text,var(--cp-text-primary, var(--cp-text-inverse)))] dark:bg-[var(--ds-background-warning-bold)] dark:text-[var(--ds-surface)]' },
      { appearance: 'removed', isBold: true, className: 'bg-[var(--ds-text-danger)] text-[var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated, var(--ds-surface))))] dark:bg-[var(--ds-background-danger-bold)] dark:text-[var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated, var(--ds-surface))))]' },
    ],
    defaultVariants: {
      appearance: 'default',
      isBold: false,
    },
  }
);

export interface LozengeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof lozengeVariants> {
  maxWidth?: number;
}

const Lozenge = React.forwardRef<HTMLSpanElement, LozengeProps>(
  ({ className, appearance, isBold, maxWidth = 200, children, style, ...props }, ref) => (
    <span
      ref={ref}
      className={cn(lozengeVariants({ appearance, isBold }), className)}
      style={{ maxWidth, ...style }}
      {...props}
    >
      <span className="truncate">{children}</span>
    </span>
  )
);
Lozenge.displayName = 'Lozenge';

export { Lozenge, lozengeVariants };

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const lozengeVariants = cva(
  'inline-flex items-center rounded-[3px] px-1.5 py-0 text-[11px] font-bold uppercase leading-[20px] tracking-[0.03em] whitespace-nowrap',
  {
    variants: {
      appearance: {
        default: 'bg-[var(--ds-border,var(--cp-lozenge-grey-bg, var(--cp-border-neutral, #DFE1E6)))] text-[var(--ds-text,#253858)] dark:bg-[var(--ds-border-bold,#454545)] dark:text-[var(--ds-text,var(--cp-bg-neutral, #EDEDED))]',
        info: 'bg-[var(--ds-background-information, #E9F2FF)] text-[var(--ds-link-pressed, #0747A6)] dark:bg-[#1C3A5C] dark:text-[var(--ds-background-information, #E9F2FF)]',
        success: 'bg-[var(--ds-background-success, #DFFCF0)] text-[var(--ds-text-success, #006644)] dark:bg-[#1C3D2E] dark:text-[var(--ds-background-success, #DFFCF0)]',
        warning: 'bg-[var(--ds-background-warning, #FFF7D6)] text-[var(--ds-text,var(--cp-text-primary, var(--cp-text-inverse, #172B4D)))] dark:bg-[#4A3B1A] dark:text-[var(--ds-background-warning, #FFF7D6)]',
        danger: 'bg-[var(--ds-background-danger, #FFECEB)] text-[var(--ds-text-danger, #AE2A19)] dark:bg-[#4A1A1A] dark:text-[var(--ds-background-danger, #FFECEB)]',
        inprogress: 'bg-[var(--ds-background-information, #E9F2FF)] text-[var(--ds-link-pressed, #0747A6)] dark:bg-[#1C3A5C] dark:text-[var(--ds-background-information, #E9F2FF)]',
        new: 'bg-[var(--ds-background-success, #DFFCF0)] text-[var(--ds-text-success, #006644)] dark:bg-[#1C3D2E] dark:text-[var(--ds-background-success, #DFFCF0)]',
        moved: 'bg-[var(--ds-background-warning, #FFF7D6)] text-[var(--ds-text,var(--cp-text-primary, var(--cp-text-inverse, #172B4D)))] dark:bg-[#4A3B1A] dark:text-[var(--ds-background-warning, #FFF7D6)]',
        removed: 'bg-[var(--ds-background-danger, #FFECEB)] text-[var(--ds-text-danger, #AE2A19)] dark:bg-[#4A1A1A] dark:text-[var(--ds-background-danger, #FFECEB)]',
      },
      isBold: {
        true: '',
        false: '',
      },
    },
    compoundVariants: [
      { appearance: 'default', isBold: true, className: 'bg-[var(--ds-text,#253858)] text-[var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated, var(--ds-surface, #FFFFFF))))] dark:bg-[var(--ds-text-subtlest,#A1A1A1)] dark:text-[var(--ds-surface,#0A0A0A)]' },
      { appearance: 'info', isBold: true, className: 'bg-[var(--ds-link-pressed, #0747A6)] text-[var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated, var(--ds-surface, #FFFFFF))))] dark:bg-[var(--ds-background-information-bold, #0C66E4)] dark:text-[var(--ds-surface,#0A0A0A)]' },
      { appearance: 'success', isBold: true, className: 'bg-[var(--ds-text-success, #006644)] text-[var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated, var(--ds-surface, #FFFFFF))))] dark:bg-[#57D9A3] dark:text-[var(--ds-surface,#0A0A0A)]' },
      { appearance: 'warning', isBold: true, className: 'bg-[var(--ds-background-warning-bold, #E2B203)] text-[var(--ds-text,var(--cp-text-primary, var(--cp-text-inverse, #172B4D)))] dark:bg-[var(--ds-background-warning-bold, #E2B203)] dark:text-[var(--ds-surface,#0A0A0A)]' },
      { appearance: 'danger', isBold: true, className: 'bg-[var(--ds-text-danger, #AE2A19)] text-[var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated, var(--ds-surface, #FFFFFF))))] dark:bg-[var(--ds-background-danger-bold, #C9372C)] dark:text-[var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated, var(--ds-surface, #FFFFFF))))]' },
      { appearance: 'inprogress', isBold: true, className: 'bg-[var(--ds-link-pressed, #0747A6)] text-[var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated, var(--ds-surface, #FFFFFF))))] dark:bg-[var(--ds-background-information-bold, #0C66E4)] dark:text-[var(--ds-surface,#0A0A0A)]' },
      { appearance: 'new', isBold: true, className: 'bg-[var(--ds-text-success, #006644)] text-[var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated, var(--ds-surface, #FFFFFF))))] dark:bg-[#57D9A3] dark:text-[var(--ds-surface,#0A0A0A)]' },
      { appearance: 'moved', isBold: true, className: 'bg-[var(--ds-background-warning-bold, #E2B203)] text-[var(--ds-text,var(--cp-text-primary, var(--cp-text-inverse, #172B4D)))] dark:bg-[var(--ds-background-warning-bold, #E2B203)] dark:text-[var(--ds-surface,#0A0A0A)]' },
      { appearance: 'removed', isBold: true, className: 'bg-[var(--ds-text-danger, #AE2A19)] text-[var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated, var(--ds-surface, #FFFFFF))))] dark:bg-[var(--ds-background-danger-bold, #C9372C)] dark:text-[var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated, var(--ds-surface, #FFFFFF))))]' },
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

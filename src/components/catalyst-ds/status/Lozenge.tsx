import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const lozengeVariants = cva(
  'inline-flex items-center rounded-[3px] px-1.5 py-0 text-[11px] font-bold uppercase leading-[20px] tracking-[0.03em] whitespace-nowrap',
  {
    variants: {
      appearance: {
        default: 'bg-[var(--ds-border,#DFE1E6)] text-[var(--ds-text,#253858)] dark:bg-[var(--ds-border-bold,#454545)] dark:text-[var(--ds-text,#EDEDED)]',
        info: 'bg-[#DEEBFF] text-[#0747A6] dark:bg-[#1C3A5C] dark:text-[#DEEBFF]',
        success: 'bg-[#E3FCEF] text-[#006644] dark:bg-[#1C3D2E] dark:text-[#E3FCEF]',
        warning: 'bg-[#FFF0B3] text-[var(--ds-text,#172B4D)] dark:bg-[#4A3B1A] dark:text-[#FFF0B3]',
        danger: 'bg-[#FFEBE6] text-[#BF2600] dark:bg-[#4A1A1A] dark:text-[#FFEBE6]',
        inprogress: 'bg-[#DEEBFF] text-[#0747A6] dark:bg-[#1C3A5C] dark:text-[#DEEBFF]',
        new: 'bg-[#E3FCEF] text-[#006644] dark:bg-[#1C3D2E] dark:text-[#E3FCEF]',
        moved: 'bg-[#FFF0B3] text-[var(--ds-text,#172B4D)] dark:bg-[#4A3B1A] dark:text-[#FFF0B3]',
        removed: 'bg-[#FFEBE6] text-[#BF2600] dark:bg-[#4A1A1A] dark:text-[#FFEBE6]',
      },
      isBold: {
        true: '',
        false: '',
      },
    },
    compoundVariants: [
      { appearance: 'default', isBold: true, className: 'bg-[var(--ds-text,#253858)] text-[var(--ds-surface,#FFFFFF)] dark:bg-[var(--ds-text-subtlest,#A1A1A1)] dark:text-[var(--ds-surface,#0A0A0A)]' },
      { appearance: 'info', isBold: true, className: 'bg-[#0747A6] text-[var(--ds-surface,#FFFFFF)] dark:bg-[#4C9AFF] dark:text-[var(--ds-surface,#0A0A0A)]' },
      { appearance: 'success', isBold: true, className: 'bg-[#006644] text-[var(--ds-surface,#FFFFFF)] dark:bg-[#57D9A3] dark:text-[var(--ds-surface,#0A0A0A)]' },
      { appearance: 'warning', isBold: true, className: 'bg-[#FF8B00] text-[var(--ds-text,#172B4D)] dark:bg-[#FF8B00] dark:text-[var(--ds-surface,#0A0A0A)]' },
      { appearance: 'danger', isBold: true, className: 'bg-[#BF2600] text-[var(--ds-surface,#FFFFFF)] dark:bg-[#FF5630] dark:text-[var(--ds-surface,#FFFFFF)]' },
      { appearance: 'inprogress', isBold: true, className: 'bg-[#0747A6] text-[var(--ds-surface,#FFFFFF)] dark:bg-[#4C9AFF] dark:text-[var(--ds-surface,#0A0A0A)]' },
      { appearance: 'new', isBold: true, className: 'bg-[#006644] text-[var(--ds-surface,#FFFFFF)] dark:bg-[#57D9A3] dark:text-[var(--ds-surface,#0A0A0A)]' },
      { appearance: 'moved', isBold: true, className: 'bg-[#FF8B00] text-[var(--ds-text,#172B4D)] dark:bg-[#FF8B00] dark:text-[var(--ds-surface,#0A0A0A)]' },
      { appearance: 'removed', isBold: true, className: 'bg-[#BF2600] text-[var(--ds-surface,#FFFFFF)] dark:bg-[#FF5630] dark:text-[var(--ds-surface,#FFFFFF)]' },
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

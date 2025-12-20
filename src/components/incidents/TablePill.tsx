/**
 * TablePill — Standardized enterprise table chip/pill component
 * 
 * Design specs:
 * - Fixed height: 24px
 * - Horizontal padding: 10-12px
 * - Font size: 12-13px
 * - Border radius: pill (full)
 * - Line-height vertically centers text
 * - Consistent across all status-like content
 */

import { cn } from '@/lib/utils';
import { ReactNode } from 'react';

export interface TablePillProps {
  children: ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'muted' | 'accent';
  dot?: boolean;
  dotColor?: string;
  className?: string;
}

// Variant styling using theme tokens - no hard-coded colors
const variantStyles: Record<string, string> = {
  default: 'bg-muted text-foreground',
  success: 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400',
  warning: 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400',
  danger: 'bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400',
  info: 'bg-sky-50 dark:bg-sky-950/30 text-sky-700 dark:text-sky-400',
  muted: 'bg-muted text-muted-foreground',
  accent: 'bg-violet-50 dark:bg-violet-950/30 text-violet-700 dark:text-violet-400',
};

const dotStyles: Record<string, string> = {
  default: 'bg-foreground/50',
  success: 'bg-emerald-500',
  warning: 'bg-amber-500',
  danger: 'bg-rose-500',
  info: 'bg-sky-500',
  muted: 'bg-muted-foreground/50',
  accent: 'bg-violet-500',
};

export function TablePill({ 
  children, 
  variant = 'default', 
  dot = false,
  dotColor,
  className 
}: TablePillProps) {
  return (
    <span
      className={cn(
        // Fixed height and alignment
        'inline-flex items-center justify-center',
        'h-6 min-h-6 max-h-6', // 24px fixed height
        'px-2.5', // 10px horizontal padding
        'rounded-full', // Pill shape
        // Typography
        'text-xs font-medium', // 12px font size
        'leading-none', // Ensure text is vertically centered
        'whitespace-nowrap',
        // Variant styling
        variantStyles[variant] || variantStyles.default,
        className
      )}
    >
      {dot && (
        <span 
          className={cn(
            'w-1.5 h-1.5 rounded-full mr-1.5 shrink-0',
            dotColor || dotStyles[variant] || dotStyles.default
          )} 
        />
      )}
      {children}
    </span>
  );
}

// Pre-configured pills for common incident statuses
export function StatusPill({ status }: { status: string }) {
  const statusConfig: Record<string, { label: string; variant: TablePillProps['variant']; dot?: boolean }> = {
    open: { label: 'Open', variant: 'muted' },
    triage: { label: 'Triage', variant: 'warning', dot: true },
    to_committee: { label: 'Committee', variant: 'accent', dot: true },
    in_progress: { label: 'In Progress', variant: 'info', dot: true },
    resolved: { label: 'Resolved', variant: 'success', dot: true },
    converted: { label: 'Converted', variant: 'muted' },
    closed: { label: 'Closed', variant: 'muted' },
  };

  const config = statusConfig[status] || { label: status, variant: 'muted' as const };
  
  return (
    <TablePill variant={config.variant} dot={config.dot}>
      {config.label}
    </TablePill>
  );
}

export function SeverityPill({ severity }: { severity: string }) {
  const severityConfig: Record<string, { label: string; variant: TablePillProps['variant'] }> = {
    SEV1: { label: 'SEV1', variant: 'danger' },
    SEV2: { label: 'SEV2', variant: 'warning' },
    SEV3: { label: 'SEV3', variant: 'muted' },
    SEV4: { label: 'SEV4', variant: 'muted' },
  };

  const config = severityConfig[severity] || { label: severity, variant: 'muted' as const };
  
  return (
    <TablePill variant={config.variant}>
      {config.label}
    </TablePill>
  );
}

export function SlaPill({ status }: { status: 'breached' | 'at_risk' | 'on_track' }) {
  const slaConfig: Record<string, { label: string; variant: TablePillProps['variant'] }> = {
    breached: { label: 'Breached', variant: 'danger' },
    at_risk: { label: 'At Risk', variant: 'warning' },
    on_track: { label: 'On Track', variant: 'success' },
  };

  const config = slaConfig[status];
  
  return (
    <TablePill variant={config.variant}>
      {config.label}
    </TablePill>
  );
}

export function MajorPill({ isMajor }: { isMajor: boolean }) {
  if (!isMajor) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }
  
  return (
    <TablePill variant="warning">
      Major
    </TablePill>
  );
}

export function CommitteePill({ status, label }: { status: string; label: string }) {
  const committeeConfig: Record<string, TablePillProps['variant']> = {
    not_applicable: 'muted',
    in_progress: 'warning',
    approved: 'success',
    rejected: 'danger',
  };

  const variant = committeeConfig[status] || 'muted';
  
  return (
    <TablePill variant={variant}>
      {label}
    </TablePill>
  );
}

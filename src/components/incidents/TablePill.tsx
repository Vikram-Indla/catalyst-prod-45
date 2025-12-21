/**
 * TablePill — Enterprise-grade table pill/badge component
 * 
 * Design specs (Jira-quality):
 * - Fixed height: 20px (strict compact density)
 * - Horizontal padding: 8px (px-2)
 * - Font size: 11px
 * - Line height: 20px (leading-5)
 * - Border radius: full pill
 * - Consistent vertical centering in 36px row
 * - Low saturation colors for calm enterprise feel
 * - Truncates content if column is too narrow
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

// Low-saturation variant styles for enterprise calm aesthetic
const variantStyles: Record<string, string> = {
  default: 'bg-muted/60 text-foreground',
  success: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400',
  warning: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400',
  danger: 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400',
  info: 'bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-400',
  muted: 'bg-muted/50 text-muted-foreground',
  // NOTE: "accent" must stay within approved neutral palette (no purple/violet).
  accent: 'bg-slate-100 dark:bg-slate-900/40 text-slate-700 dark:text-slate-300',
};

const dotStyles: Record<string, string> = {
  default: 'bg-foreground/40',
  success: 'bg-emerald-500',
  warning: 'bg-amber-500',
  danger: 'bg-rose-500',
  info: 'bg-sky-500',
  muted: 'bg-muted-foreground/40',
  accent: 'bg-slate-400',
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
        // Fixed 20px height for strict compact density
        'inline-flex items-center',
        'h-5', // 20px height
        'px-2', // 8px horizontal padding
        'rounded-full', // Pill shape
        // Typography - 11px, line-height for perfect centering
        'text-[11px] font-medium leading-5',
        // CRITICAL: Prevent pill from exceeding column width
        'max-w-full overflow-hidden whitespace-nowrap',
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
      <span className="truncate">{children}</span>
    </span>
  );
}

// Status pill - compact with colored dot indicator
export function StatusPill({ status }: { status: string }) {
  const statusConfig: Record<string, { label: string; variant: TablePillProps['variant']; dot?: boolean }> = {
    open: { label: 'Open', variant: 'muted' },
    triage: { label: 'Triage', variant: 'warning', dot: true },
    to_committee: { label: 'Committee', variant: 'warning', dot: true },
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

// Severity - small neutral pill with colored dot only (not full background)
export function SeverityPill({ severity }: { severity: string }) {
  const severityConfig: Record<string, { label: string; dotColor: string }> = {
    SEV1: { label: 'SEV1', dotColor: 'bg-rose-500' },
    SEV2: { label: 'SEV2', dotColor: 'bg-amber-500' },
    SEV3: { label: 'SEV3', dotColor: 'bg-sky-400' },
    SEV4: { label: 'SEV4', dotColor: 'bg-muted-foreground/50' },
  };

  const config = severityConfig[severity] || { label: severity, dotColor: 'bg-muted-foreground/50' };
  
  return (
    <TablePill variant="muted" dot dotColor={config.dotColor}>
      {config.label}
    </TablePill>
  );
}

// SLA - subtle text coloring, no heavy badges
export function SlaPill({ status }: { status: 'breached' | 'at_risk' | 'on_track' }) {
  const slaConfig: Record<string, { label: string; className: string }> = {
    breached: { label: 'Breached', className: 'text-rose-600 dark:text-rose-400' },
    at_risk: { label: 'At Risk', className: 'text-amber-600 dark:text-amber-400' },
    on_track: { label: 'On Track', className: 'text-emerald-600 dark:text-emerald-400' },
  };

  const config = slaConfig[status];
  
  // Return plain text with subtle color - 11px font, no pill
  return (
    <span className={cn('text-[11px] font-medium whitespace-nowrap leading-5 truncate', config.className)}>
      {config.label}
    </span>
  );
}

// Major - small neutral badge only when applicable, otherwise "—"
export function MajorPill({ isMajor }: { isMajor: boolean }) {
  if (!isMajor) {
    return <span className="text-[11px] text-muted-foreground leading-5">—</span>;
  }
  
  return (
    <TablePill variant="muted">
      Major
    </TablePill>
  );
}

// Committee - text only, no icons, no pills
export function CommitteePill({ status, label }: { status: string; label: string }) {
  // Plain text only as per spec
  const colorClass = status === 'approved' 
    ? 'text-emerald-600 dark:text-emerald-400'
    : status === 'rejected'
    ? 'text-rose-600 dark:text-rose-400'
    : 'text-muted-foreground';
  
  return (
    <span className={cn('text-[11px] font-medium whitespace-nowrap leading-5 truncate', colorClass)}>
      {label}
    </span>
  );
}

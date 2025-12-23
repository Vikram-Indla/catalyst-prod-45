/**
 * TablePill — Enterprise-grade table pill/badge component
 * 
 * Proper severity-based colors with visual hierarchy:
 * - SEV1: RED - Critical, demands immediate attention
 * - SEV2: ORANGE - High priority
 * - SEV3: YELLOW - Medium priority
 * - SEV4: GRAY - Low priority
 */

import { cn } from '@/lib/utils';
import { ReactNode } from 'react';
import { AlertTriangle, Clock, CheckCircle } from 'lucide-react';

export interface TablePillProps {
  children: ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'muted' | 'accent' | 'orange' | 'yellow' | 'purple';
  dot?: boolean;
  dotColor?: string;
  className?: string;
}

// Variant styles - proper color coding
const variantStyles: Record<string, string> = {
  default: 'bg-muted/60 text-foreground',
  success: 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400',
  warning: 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400',
  danger: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400',
  info: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400',
  muted: 'bg-gray-100 dark:bg-gray-800/40 text-gray-600 dark:text-gray-400',
  accent: 'bg-gray-100 dark:bg-gray-900/40 text-gray-700 dark:text-gray-300',
  orange: 'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-400',
  yellow: 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-400',
  purple: 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-400',
};

const dotStyles: Record<string, string> = {
  default: 'bg-foreground/40',
  success: 'bg-green-500',
  warning: 'bg-amber-500',
  danger: 'bg-red-500',
  info: 'bg-blue-500',
  muted: 'bg-gray-400',
  accent: 'bg-gray-400',
  orange: 'bg-orange-500',
  yellow: 'bg-yellow-500',
  purple: 'bg-purple-500',
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
        'text-[11px] font-semibold leading-5',
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

/**
 * Severity Pill - proper RED for SEV1 (Critical)
 * SEV1 = RED - Critical, demands immediate attention
 * SEV2 = ORANGE - High priority
 * SEV3 = YELLOW - Medium priority
 * SEV4 = GRAY - Low priority
 */
export function SeverityPill({ severity }: { severity: string }) {
  const severityConfig: Record<string, { label: string; variant: TablePillProps['variant']; dotColor: string }> = {
    SEV1: { label: 'SEV1', variant: 'danger', dotColor: 'bg-red-500' },
    SEV2: { label: 'SEV2', variant: 'orange', dotColor: 'bg-orange-500' },
    SEV3: { label: 'SEV3', variant: 'yellow', dotColor: 'bg-yellow-600' },
    SEV4: { label: 'SEV4', variant: 'muted', dotColor: 'bg-gray-400' },
  };

  const config = severityConfig[severity] || { label: severity, variant: 'muted' as TablePillProps['variant'], dotColor: 'bg-gray-400' };
  
  return (
    <TablePill variant={config.variant} dot dotColor={config.dotColor}>
      {config.label}
    </TablePill>
  );
}

/**
 * Status Pill - distinct colors for each status
 */
export function StatusPill({ status }: { status: string }) {
  const statusConfig: Record<string, { label: string; variant: TablePillProps['variant']; dot?: boolean }> = {
    open: { label: 'Open', variant: 'info', dot: true },
    triage: { label: 'Triaging', variant: 'warning', dot: true },
    triaging: { label: 'Triaging', variant: 'warning', dot: true },
    to_committee: { label: 'Committee', variant: 'purple', dot: true },
    under_review: { label: 'Under Review', variant: 'purple', dot: true },
    committee: { label: 'Committee', variant: 'purple', dot: true },
    in_progress: { label: 'In Progress', variant: 'info', dot: true },
    resolved: { label: 'Resolved', variant: 'success', dot: true },
    converted: { label: 'Converted', variant: 'muted' },
    closed: { label: 'Closed', variant: 'muted' },
  };

  const normalizedStatus = status?.toLowerCase().replace(/[\s-]/g, '_');
  const config = statusConfig[normalizedStatus] || statusConfig[status] || { label: status, variant: 'muted' as const };
  
  return (
    <TablePill variant={config.variant} dot={config.dot}>
      {config.label}
    </TablePill>
  );
}

/**
 * SLA Pill - visual urgency with icons
 * - Breached: Red with alert icon
 * - At Risk: Amber with clock icon  
 * - On Track: Green with check icon
 */
export function SlaPill({ status }: { status: string }) {
  if (status === 'breached') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400 rounded-full text-[11px] font-semibold h-5">
        <AlertTriangle className="w-3 h-3 shrink-0" />
        <span>Breached</span>
      </span>
    );
  }
  
  if (status === 'at_risk') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 rounded-full text-[11px] font-semibold h-5">
        <Clock className="w-3 h-3 shrink-0" />
        <span>At Risk</span>
      </span>
    );
  }
  
  if (status === 'on_track') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 rounded-full text-[11px] font-medium h-5">
        <CheckCircle className="w-3 h-3 shrink-0" />
        <span>On Track</span>
      </span>
    );
  }
  
  // Default/unknown
  return <span className="text-[11px] text-muted-foreground leading-5">—</span>;
}

// Major - small badge only when applicable, otherwise "—"
export function MajorPill({ isMajor }: { isMajor: boolean }) {
  if (!isMajor) {
    return <span className="text-[11px] text-muted-foreground leading-5">—</span>;
  }
  
  return (
    <TablePill variant="danger" dot dotColor="bg-red-500">
      Major
    </TablePill>
  );
}

// Committee - text with subtle styling
export function CommitteePill({ status, label }: { status: string; label: string }) {
  if (status === 'n/a' || status === 'none' || !status || label === 'N/A') {
    return <span className="text-[11px] text-muted-foreground leading-5">—</span>;
  }
  
  const colorClass = status === 'approved' 
    ? 'text-green-600 dark:text-green-400'
    : status === 'rejected'
    ? 'text-red-600 dark:text-red-400'
    : 'text-muted-foreground';
  
  return (
    <span className={cn('text-[11px] font-medium whitespace-nowrap leading-5 truncate', colorClass)}>
      {label}
    </span>
  );
}

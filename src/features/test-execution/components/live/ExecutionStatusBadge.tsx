/**
 * Module 4C-2: Execution Status Badge
 * Displays real-time execution status with appropriate styling
 */

import React from 'react';
import { Badge } from '@/components/ui/badge';
import {
  Clock,
  Play,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  SkipForward,
  Pause,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type ExecutionStatus =
  | 'pending'
  | 'in_progress'
  | 'passed'
  | 'failed'
  | 'blocked'
  | 'skipped'
  | 'paused';

interface ExecutionStatusBadgeProps {
  status: ExecutionStatus | string;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  className?: string;
}

const statusConfig: Record<
  ExecutionStatus,
  { label: string; icon: React.ElementType; className: string }
> = {
  pending: {
    label: 'Pending',
    icon: Clock,
    className: 'bg-muted text-muted-foreground border-muted-foreground/20',
  },
  in_progress: {
    label: 'In Progress',
    icon: Play,
    className:
      'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700',
  },
  passed: {
    label: 'Passed',
    icon: CheckCircle2,
    className:
      'bg-green-100 text-green-700 border-green-300 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700',
  },
  failed: {
    label: 'Failed',
    icon: XCircle,
    className:
      'bg-red-100 text-red-700 border-red-300 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700',
  },
  blocked: {
    label: 'Blocked',
    icon: AlertTriangle,
    className:
      'bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-700',
  },
  skipped: {
    label: 'Skipped',
    icon: SkipForward,
    className:
      'bg-slate-100 text-slate-600 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-600',
  },
  paused: {
    label: 'Paused',
    icon: Pause,
    className:
      'bg-yellow-100 text-yellow-700 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-700',
  },
};

const sizeConfig = {
  sm: { badge: 'text-xs px-1.5 py-0', icon: 'h-3 w-3' },
  md: { badge: 'text-xs px-2 py-0.5', icon: 'h-3.5 w-3.5' },
  lg: { badge: 'text-sm px-2.5 py-1', icon: 'h-4 w-4' },
};

export function ExecutionStatusBadge({
  status,
  size = 'md',
  showIcon = true,
  className,
}: ExecutionStatusBadgeProps) {
  const config = statusConfig[status as ExecutionStatus] || statusConfig.pending;
  const sizes = sizeConfig[size];
  const Icon = config.icon;

  return (
    <Badge
      variant="outline"
      className={cn(
        'gap-1 font-medium capitalize',
        config.className,
        sizes.badge,
        className
      )}
    >
      {showIcon && <Icon className={sizes.icon} />}
      {config.label}
    </Badge>
  );
}

// Utility function to get status color for charts
export function getStatusColor(status: ExecutionStatus | string): string {
  const colors: Record<ExecutionStatus, string> = {
    pending: 'hsl(var(--muted-foreground))',
    in_progress: 'hsl(217, 91%, 60%)', // blue
    passed: 'hsl(142, 71%, 45%)', // green
    failed: 'hsl(0, 84%, 60%)', // red
    blocked: 'hsl(25, 95%, 53%)', // orange
    skipped: 'hsl(215, 14%, 45%)', // slate
    paused: 'hsl(48, 96%, 53%)', // yellow
  };

  return colors[status as ExecutionStatus] || colors.pending;
}

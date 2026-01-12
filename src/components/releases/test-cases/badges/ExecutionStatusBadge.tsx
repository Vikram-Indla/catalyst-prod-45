/**
 * ExecutionStatusBadge — Test execution result status
 */

import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, Clock, CircleDashed, AlertTriangle, SkipForward } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ExecutionStatus = 'passed' | 'failed' | 'blocked' | 'skipped' | 'pending' | 'not_run';

interface ExecutionStatusBadgeProps {
  status: ExecutionStatus;
  size?: 'sm' | 'default';
  showIcon?: boolean;
  className?: string;
}

const statusConfig: Record<ExecutionStatus, { 
  label: string; 
  icon: React.ComponentType<{ className?: string }>;
  className: string;
}> = {
  passed: {
    label: 'Passed',
    icon: CheckCircle2,
    className: 'bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/30',
  },
  failed: {
    label: 'Failed',
    icon: XCircle,
    className: 'bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30',
  },
  blocked: {
    label: 'Blocked',
    icon: AlertTriangle,
    className: 'bg-orange-500/15 text-orange-700 dark:text-orange-400 border-orange-500/30',
  },
  skipped: {
    label: 'Skipped',
    icon: SkipForward,
    className: 'bg-slate-500/15 text-slate-700 dark:text-slate-400 border-slate-500/30',
  },
  pending: {
    label: 'Pending',
    icon: Clock,
    className: 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30',
  },
  not_run: {
    label: 'Not Run',
    icon: CircleDashed,
    className: 'bg-muted text-muted-foreground border-border',
  },
};

export function ExecutionStatusBadge({ 
  status, 
  size = 'default', 
  showIcon = true,
  className 
}: ExecutionStatusBadgeProps) {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <Badge 
      variant="outline"
      size={size} 
      className={cn(
        config.className,
        'font-medium',
        className
      )}
    >
      {showIcon && <Icon className={cn("mr-1", size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5')} />}
      {config.label}
    </Badge>
  );
}

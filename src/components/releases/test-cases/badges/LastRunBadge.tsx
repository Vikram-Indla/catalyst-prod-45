/**
 * LastRunBadge — Test execution result indicator
 */

import { CheckCircle2, XCircle, Circle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export type LastRunStatus = 'passed' | 'failed' | 'not_run';

interface LastRunBadgeProps {
  status: LastRunStatus;
  size?: 'sm' | 'default';
  className?: string;
}

const statusConfig: Record<LastRunStatus, {
  icon: typeof CheckCircle2;
  label: string;
  variant: 'passed' | 'failed' | 'not-run';
}> = {
  passed: {
    icon: CheckCircle2,
    label: 'Passed',
    variant: 'passed',
  },
  failed: {
    icon: XCircle,
    label: 'Failed',
    variant: 'failed',
  },
  not_run: {
    icon: Circle,
    label: 'Not Run',
    variant: 'not-run',
  },
};

export function LastRunBadge({ status, size = 'default', className }: LastRunBadgeProps) {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <Badge 
      variant={config.variant} 
      size={size}
      className={cn('gap-1', className)}
    >
      <Icon className="w-3 h-3" />
      {config.label}
    </Badge>
  );
}

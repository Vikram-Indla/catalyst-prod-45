/**
 * PriorityBadge — Test case priority indicator with icon
 */

import { AlertTriangle, ArrowUp, Minus, ArrowDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export type TestCasePriority = 'critical' | 'high' | 'medium' | 'low';

interface PriorityBadgeProps {
  priority: TestCasePriority;
  showLabel?: boolean;
  size?: 'sm' | 'default';
  className?: string;
}

const priorityConfig: Record<TestCasePriority, { 
  icon: typeof AlertTriangle; 
  label: string; 
  className: string;
}> = {
  critical: {
    icon: AlertTriangle,
    label: 'Critical',
    className: 'text-red-600 dark:text-red-400',
  },
  high: {
    icon: ArrowUp,
    label: 'High',
    className: 'text-orange-600 dark:text-orange-400',
  },
  medium: {
    icon: Minus,
    label: 'Medium',
    className: 'text-yellow-600 dark:text-yellow-500',
  },
  low: {
    icon: ArrowDown,
    label: 'Low',
    className: 'text-muted-foreground',
  },
};

export function PriorityBadge({ priority, showLabel = true, size = 'default', className }: PriorityBadgeProps) {
  const config = priorityConfig[priority];
  const Icon = config.icon;
  const iconSize = size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5';
  const textSize = size === 'sm' ? 'text-[10px]' : 'text-xs';

  return (
    <span className={cn('flex items-center gap-1', config.className, className)}>
      <Icon className={iconSize} />
      {showLabel && <span className={cn('font-medium', textSize)}>{config.label}</span>}
    </span>
  );
}

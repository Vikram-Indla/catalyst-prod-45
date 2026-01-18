/**
 * PriorityBadge - Priority indicator with Catalyst V5 colors
 * GOD-TIER 9.8 Implementation
 */

import React from 'react';
import { cn } from '@/lib/utils';

type Priority = 'critical' | 'high' | 'medium' | 'low';

interface PriorityBadgeProps {
  priority: Priority;
  size?: 'sm' | 'md';
  className?: string;
}

const priorityConfig: Record<Priority, { label: string; className: string }> = {
  critical: {
    label: 'Critical',
    className: 'bg-destructive/10 text-destructive border-destructive/20',
  },
  high: {
    label: 'High',
    className: 'bg-warning/10 text-warning border-warning/20',
  },
  medium: {
    label: 'Medium',
    className: 'bg-info/10 text-info border-info/20',
  },
  low: {
    label: 'Low',
    className: 'bg-muted text-muted-foreground border-border',
  },
};

export function PriorityBadge({ priority, size = 'sm', className }: PriorityBadgeProps) {
  const config = priorityConfig[priority] || priorityConfig.medium;
  
  return (
    <span
      className={cn(
        'inline-flex items-center font-semibold uppercase tracking-wide border rounded',
        size === 'sm' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-1 text-xs',
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  );
}

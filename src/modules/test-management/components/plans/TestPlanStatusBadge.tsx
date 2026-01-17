/**
 * TestPlanStatusBadge - Status badge for test plans
 * Catalyst V5 design tokens
 */

import React from 'react';
import { cn } from '@/lib/utils';
import type { TestPlanStatus } from '../../types/testPlans';

interface StatusConfig {
  label: string;
  bg: string;
  text: string;
  dotColor: string;
  pulse?: boolean;
}

const statusConfig: Record<TestPlanStatus, StatusConfig> = {
  draft: {
    label: 'Draft',
    bg: 'bg-muted',
    text: 'text-muted-foreground',
    dotColor: 'bg-muted-foreground/50',
  },
  active: {
    label: 'Active',
    bg: 'bg-info/10',
    text: 'text-info',
    dotColor: 'bg-info',
  },
  executing: {
    label: 'Executing',
    bg: 'bg-warning/10',
    text: 'text-warning',
    dotColor: 'bg-warning',
    pulse: true,
  },
  completed: {
    label: 'Completed',
    bg: 'bg-success/10',
    text: 'text-success',
    dotColor: 'bg-success',
  },
  archived: {
    label: 'Archived',
    bg: 'bg-muted',
    text: 'text-muted-foreground',
    dotColor: 'bg-muted-foreground/30',
  },
};

interface TestPlanStatusBadgeProps {
  status: TestPlanStatus;
  size?: 'sm' | 'md';
  showDot?: boolean;
}

export function TestPlanStatusBadge({ 
  status, 
  size = 'md',
  showDot = true,
}: TestPlanStatusBadgeProps) {
  const config = statusConfig[status] || statusConfig.draft;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-medium border',
        config.bg,
        config.text,
        'border-transparent',
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs'
      )}
    >
      {showDot && (
        <span
          className={cn(
            'rounded-full',
            config.dotColor,
            config.pulse && 'animate-pulse',
            size === 'sm' ? 'w-1 h-1' : 'w-1.5 h-1.5'
          )}
        />
      )}
      {config.label}
    </span>
  );
}

export default TestPlanStatusBadge;

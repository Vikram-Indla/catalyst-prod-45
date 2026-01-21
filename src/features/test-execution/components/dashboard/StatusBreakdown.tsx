/**
 * Module 3B-3: Stacked status bar chart
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { STATUS_CONFIGS } from '../../types/progress-dashboard';
import type { StatusBreakdown as StatusBreakdownType } from '../../types/progress-dashboard';

interface StatusBreakdownProps {
  breakdown: StatusBreakdownType | null;
  className?: string;
}

export function StatusBreakdown({ breakdown, className }: StatusBreakdownProps) {
  if (!breakdown || !breakdown.statuses) return null;

  // Sort statuses in a consistent order
  const sortOrder = ['passed', 'failed', 'blocked', 'skipped', 'running', 'queued'];
  const sortedStatuses = [...breakdown.statuses].sort(
    (a, b) => sortOrder.indexOf(a.status) - sortOrder.indexOf(b.status)
  );

  return (
    <div className={cn('space-y-3', className)}>
      <h3 className="text-sm font-medium text-foreground">Status Breakdown</h3>
      
      {/* Stacked Bar */}
      <div className="h-6 w-full overflow-hidden rounded-full bg-muted flex">
        {sortedStatuses.map((item) => {
          const config = STATUS_CONFIGS[item.status];
          if (!config || item.percentage === 0) return null;
          
          return (
            <div
              key={item.status}
              className={cn(
                'h-full transition-all duration-500',
                config.bgClass
              )}
              style={{ width: `${item.percentage}%` }}
              title={`${config.label}: ${item.count} (${item.percentage}%)`}
            />
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4">
        {sortedStatuses.map((item) => {
          const config = STATUS_CONFIGS[item.status];
          if (!config) return null;
          
          return (
            <div key={item.status} className="flex items-center gap-2">
              <div
                className={cn('h-3 w-3 rounded-full', config.bgClass)}
              />
              <span className="text-xs text-muted-foreground">
                {config.label}: <span className="font-medium text-foreground">{item.count}</span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

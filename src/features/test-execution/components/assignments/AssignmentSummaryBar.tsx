/**
 * Module 4C-1: Assignment Summary Bar
 * Displays progress summary for run assignments
 */

import React from 'react';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import type { AssignmentSummary } from '../../types/run-assignments';

interface AssignmentSummaryBarProps {
  summary: AssignmentSummary;
  className?: string;
}

export function AssignmentSummaryBar({ summary, className }: AssignmentSummaryBarProps) {
  const { total, passed, failed, blocked, skipped, in_progress, pending } = summary;

  if (total === 0) return null;

  const passRate = total > 0 ? Math.round((passed / total) * 100) : 0;
  const completedCount = passed + failed + blocked + skipped;
  const completionPct = total > 0 ? Math.round((completedCount / total) * 100) : 0;

  const segments = [
    { count: passed, color: 'bg-green-500', label: 'Passed' },
    { count: failed, color: 'bg-red-500', label: 'Failed' },
    { count: blocked, color: 'bg-amber-500', label: 'Blocked' },
    { count: skipped, color: 'bg-gray-400', label: 'Skipped' },
    { count: in_progress, color: 'bg-blue-500', label: 'In Progress' },
    { count: pending, color: 'bg-muted', label: 'Pending' },
  ];

  return (
    <div className={cn('space-y-3', className)}>
      {/* Progress bar with segments */}
      <div className="h-2 rounded-full overflow-hidden flex bg-muted">
        {segments.map(
          (seg, idx) =>
            seg.count > 0 && (
              <div
                key={idx}
                className={cn('h-full transition-all', seg.color)}
                style={{ width: `${(seg.count / total) * 100}%` }}
              />
            )
        )}
      </div>

      {/* Summary stats */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
        <div className="flex items-center gap-1.5">
          <span className="font-medium">{completionPct}%</span>
          <span className="text-muted-foreground">complete</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="font-medium text-green-600 dark:text-green-400">{passed}</span>
          <span className="text-muted-foreground">passed</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="font-medium text-red-600 dark:text-red-400">{failed}</span>
          <span className="text-muted-foreground">failed</span>
        </div>
        {blocked > 0 && (
          <div className="flex items-center gap-1.5">
            <span className="font-medium text-amber-600 dark:text-amber-400">{blocked}</span>
            <span className="text-muted-foreground">blocked</span>
          </div>
        )}
        {skipped > 0 && (
          <div className="flex items-center gap-1.5">
            <span className="font-medium text-gray-500">{skipped}</span>
            <span className="text-muted-foreground">skipped</span>
          </div>
        )}
        <div className="flex items-center gap-1.5 ml-auto">
          <span className="text-muted-foreground">Pass rate:</span>
          <span className={cn(
            'font-medium',
            passRate >= 80 ? 'text-green-600 dark:text-green-400' :
            passRate >= 50 ? 'text-amber-600 dark:text-amber-400' :
            'text-red-600 dark:text-red-400'
          )}>
            {passRate}%
          </span>
        </div>
      </div>
    </div>
  );
}

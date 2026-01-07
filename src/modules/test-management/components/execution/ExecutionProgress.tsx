/**
 * Execution Progress Component
 * Shows step X of Y with color-coded status indicators
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import type { ExecutionStatus } from '../../api/types';

interface StepInfo {
  id: string;
  status: ExecutionStatus;
}

interface ExecutionProgressProps {
  steps: StepInfo[];
  currentIndex: number;
  onStepClick: (index: number) => void;
}

// Catalyst V5 semantic colors
const STATUS_COLORS: Record<ExecutionStatus, string> = {
  not_run: 'bg-muted-foreground/40',
  in_progress: 'bg-[hsl(var(--info))]',
  passed: 'bg-[hsl(var(--success))]',
  failed: 'bg-[hsl(var(--danger))]',
  blocked: 'bg-[hsl(var(--warning))]',
  skipped: 'bg-muted-foreground/30',
};

export function ExecutionProgress({
  steps,
  currentIndex,
  onStepClick,
}: ExecutionProgressProps) {
  const passedCount = steps.filter((s) => s.status === 'passed').length;
  const failedCount = steps.filter((s) => s.status === 'failed').length;
  const blockedCount = steps.filter((s) => s.status === 'blocked').length;
  const completedCount = steps.filter((s) => 
    ['passed', 'failed', 'blocked', 'skipped'].includes(s.status)
  ).length;

  const progressValue = steps.length > 0 ? (completedCount / steps.length) * 100 : 0;

  return (
    <div className="space-y-3">
      {/* Summary line */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">
          Step <span className="font-semibold text-foreground">{currentIndex + 1}</span> of{' '}
          <span className="font-semibold text-foreground">{steps.length}</span>
        </span>
        <div className="flex items-center gap-3 text-xs">
          {passedCount > 0 && (
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[hsl(var(--success))]" />
              {passedCount} passed
            </span>
          )}
          {failedCount > 0 && (
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[hsl(var(--danger))]" />
              {failedCount} failed
            </span>
          )}
          {blockedCount > 0 && (
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[hsl(var(--warning))]" />
              {blockedCount} blocked
            </span>
          )}
        </div>
      </div>

      {/* Progress bar with gradient based on results */}
      <div className="relative h-2 bg-muted rounded-full overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 transition-all duration-300"
          style={{ 
            width: `${progressValue}%`,
            background: failedCount > 0 || blockedCount > 0 
              ? 'linear-gradient(90deg, hsl(var(--primary)) 0%, hsl(142.1 76.2% 36.3%) 50%, hsl(0 84.2% 60.2%) 100%)'
              : 'hsl(var(--primary))'
          }}
        />
      </div>

      {/* Step indicators */}
      <div className="flex gap-1 flex-wrap">
        {steps.map((step, index) => (
          <button
            key={step.id}
            onClick={() => onStepClick(index)}
            className={cn(
              'w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium transition-all',
              STATUS_COLORS[step.status],
              'text-white',
              index === currentIndex && 'ring-2 ring-primary ring-offset-2 ring-offset-background scale-110'
            )}
            title={`Step ${index + 1}: ${step.status.replace('_', ' ')}`}
          >
            {index + 1}
          </button>
        ))}
      </div>
    </div>
  );
}

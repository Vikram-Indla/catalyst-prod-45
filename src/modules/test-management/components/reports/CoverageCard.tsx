/**
 * Coverage Card - Shows coverage metrics with progress bar
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';

interface CoverageCardProps {
  title: string;
  value: number;
  total: number;
  percentage: number;
  className?: string;
}

export function CoverageCard({
  title,
  value,
  total,
  percentage,
  className,
}: CoverageCardProps) {
  const getColorClass = (pct: number) => {
    if (pct >= 80) return 'text-teal-600 dark:text-teal-400';
    if (pct >= 50) return 'text-orange-600 dark:text-orange-400';
    return 'text-destructive';
  };

  const getProgressColor = (pct: number) => {
    if (pct >= 80) return 'bg-teal-500';
    if (pct >= 50) return 'bg-orange-500';
    return 'bg-destructive';
  };

  return (
    <div className={cn('bg-background border rounded-xl p-5', className)}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <span className={cn('text-2xl font-extrabold', getColorClass(percentage))}>
          {percentage.toFixed(0)}%
        </span>
      </div>
      
      <div className="relative h-2 bg-muted rounded-full overflow-hidden mb-3">
        <div 
          className={cn(
            'absolute inset-y-0 left-0 rounded-full transition-all duration-1000 ease-out',
            getProgressColor(percentage)
          )}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
      
      <p className="text-xs text-muted-foreground">
        <strong className="text-foreground">{value}</strong> of {total} covered
      </p>
    </div>
  );
}

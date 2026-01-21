/**
 * Module 3B-4: Capacity utilization bar component
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { getCapacityColor, getCapacityTextColor } from '../../types/resource-allocation';

interface CapacityBarProps {
  allocated: number;
  capacity: number;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function CapacityBar({
  allocated,
  capacity,
  showLabel = true,
  size = 'md',
  className,
}: CapacityBarProps) {
  const percentage = capacity > 0 ? Math.round((allocated / capacity) * 100) : 0;
  const barColor = getCapacityColor(percentage);
  const textColor = getCapacityTextColor(percentage);

  const heights = {
    sm: 'h-1.5',
    md: 'h-2',
    lg: 'h-3',
  };

  return (
    <div className={cn('space-y-1', className)}>
      {showLabel && (
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">
            {allocated} / {capacity}
          </span>
          <span className={cn('font-medium', textColor)}>
            {percentage}%
          </span>
        </div>
      )}
      <div className={cn('w-full bg-muted rounded-full overflow-hidden', heights[size])}>
        <div
          className={cn('h-full rounded-full transition-all duration-300', barColor)}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
    </div>
  );
}

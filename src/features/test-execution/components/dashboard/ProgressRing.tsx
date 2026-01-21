/**
 * Module 3B-3: Circular progress SVG component
 */

import React from 'react';
import { cn } from '@/lib/utils';

interface ProgressRingProps {
  percentage: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
  showLabel?: boolean;
  label?: string;
}

export function ProgressRing({
  percentage,
  size = 160,
  strokeWidth = 12,
  className,
  showLabel = true,
  label,
}: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;
  
  // Color based on percentage
  const getColor = () => {
    if (percentage >= 80) return 'stroke-success';
    if (percentage >= 50) return 'stroke-warning';
    return 'stroke-destructive';
  };

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)}>
      <svg
        width={size}
        height={size}
        className="transform -rotate-90"
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          className="stroke-muted"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className={cn('transition-all duration-500 ease-out', getColor())}
        />
      </svg>
      
      {showLabel && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold text-foreground">
            {Math.round(percentage)}%
          </span>
          {label && (
            <span className="text-sm text-muted-foreground">{label}</span>
          )}
        </div>
      )}
    </div>
  );
}

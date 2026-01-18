/**
 * CoverageRing - Animated SVG ring showing coverage percentage
 * GOD-TIER 9.8 Implementation
 */

import React, { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface CoverageRingProps {
  percent: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
}

export function CoverageRing({ 
  percent, 
  size = 80, 
  strokeWidth = 6,
  className 
}: CoverageRingProps) {
  const [animatedPercent, setAnimatedPercent] = useState(0);
  
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (animatedPercent / 100) * circumference;
  
  // Animate on mount and when percent changes
  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedPercent(percent);
    }, 100);
    return () => clearTimeout(timer);
  }, [percent]);

  // Determine color based on coverage level
  const getColor = () => {
    if (animatedPercent >= 80) return 'hsl(var(--success))'; // Green
    if (animatedPercent >= 50) return 'hsl(var(--warning))'; // Yellow/Orange
    return 'hsl(var(--destructive))'; // Red
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
          stroke="hsl(var(--border))"
          strokeWidth={strokeWidth}
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={getColor()}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-700 ease-out"
        />
      </svg>
      {/* Center text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span 
          className="text-lg font-bold tabular-nums"
          style={{ color: getColor() }}
        >
          {Math.round(animatedPercent)}%
        </span>
        <span className="text-[9px] uppercase tracking-wider text-muted-foreground font-medium">
          Coverage
        </span>
      </div>
    </div>
  );
}

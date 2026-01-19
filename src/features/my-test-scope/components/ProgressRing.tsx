/**
 * Progress Ring Component
 * Visualizes test execution progress with a circular ring
 */

import React from 'react';
import { cn } from '@/lib/utils';
import type { TestScopeSummary } from '../types';

interface ProgressRingProps {
  summary: TestScopeSummary;
  size?: number;
  strokeWidth?: number;
  className?: string;
}

export function ProgressRing({ 
  summary, 
  size = 160, 
  strokeWidth = 12,
  className 
}: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  const { totalTests, passedTests, failedTests, blockedTests, notRunTests } = summary;
  
  if (totalTests === 0) {
    return (
      <div className={cn("flex flex-col items-center justify-center", className)}>
        <svg width={size} height={size} className="transform -rotate-90">
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="hsl(var(--muted))"
            strokeWidth={strokeWidth}
          />
        </svg>
        <div className="absolute flex flex-col items-center">
          <span className="text-3xl font-bold text-foreground">0%</span>
          <span className="text-xs text-muted-foreground">No tests</span>
        </div>
      </div>
    );
  }

  const completionRate = Math.round((passedTests / totalTests) * 100);
  
  // Calculate segment lengths
  const segments = [
    { count: passedTests, color: 'hsl(var(--success))', label: 'Passed' },
    { count: failedTests, color: 'hsl(var(--destructive))', label: 'Failed' },
    { count: blockedTests, color: 'hsl(var(--warning))', label: 'Blocked' },
    { count: notRunTests, color: 'hsl(var(--muted))', label: 'Not Run' },
  ];

  let offset = 0;
  
  return (
    <div className={cn("relative flex items-center justify-center", className)}>
      <svg width={size} height={size} className="transform -rotate-90">
        {segments.map((segment, index) => {
          if (segment.count === 0) return null;
          
          const length = (segment.count / totalTests) * circumference;
          const currentOffset = offset;
          offset += length;
          
          return (
            <circle
              key={index}
              cx={center}
              cy={center}
              r={radius}
              fill="none"
              stroke={segment.color}
              strokeWidth={strokeWidth}
              strokeDasharray={`${length} ${circumference - length}`}
              strokeDashoffset={-currentOffset}
              strokeLinecap="butt"
              className="transition-all duration-500"
            />
          );
        })}
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-3xl font-bold text-foreground">{completionRate}%</span>
        <span className="text-xs text-muted-foreground">Complete</span>
      </div>
    </div>
  );
}

/**
 * Workload Progress Bar Component
 * Visual capacity utilization bar with color coding
 */

import React from 'react';
import { CATALYST_V5 } from '@/lib/catalyst-colors';

interface WorkloadProgressBarProps {
  current: number;
  capacity: number;
  showLabels?: boolean;
  size?: 'sm' | 'md' | 'lg';
  showSegments?: boolean;
  segments?: { completed: number; inProgress: number; pending: number };
}

function getCapacityColor(percentage: number): string {
  if (percentage > 100) return CATALYST_V5.danger;
  if (percentage > 85) return CATALYST_V5.warning;
  if (percentage >= 60) return CATALYST_V5.teal;
  return CATALYST_V5.primary;
}

const sizeClasses = {
  sm: 'h-1.5',
  md: 'h-2.5',
  lg: 'h-4',
};

export function WorkloadProgressBar({ 
  current, 
  capacity, 
  showLabels = false, 
  size = 'md',
  showSegments = false,
  segments
}: WorkloadProgressBarProps) {
  const percentage = capacity > 0 ? (current / capacity) * 100 : 0;
  const cappedPercentage = Math.min(percentage, 100);
  const isOverCapacity = percentage > 100;
  const overflowPercentage = isOverCapacity ? Math.min(percentage - 100, 20) : 0;
  const color = getCapacityColor(percentage);
  
  return (
    <div className="w-full">
      {showLabels && (
        <div className="flex justify-between text-xs mb-1">
          <span style={{ color: CATALYST_V5.slate[500] }}>
            {current} / {capacity}
          </span>
          <span style={{ color }}>
            {Math.round(percentage)}%
          </span>
        </div>
      )}
      
      <div className="relative">
        {/* Background track */}
        <div 
          className={`w-full rounded-full ${sizeClasses[size]}`}
          style={{ backgroundColor: CATALYST_V5.slate[100] }}
        >
          {showSegments && segments ? (
            /* Segmented bar */
            <div className="flex h-full rounded-full overflow-hidden">
              <div 
                className="h-full transition-all"
                style={{ 
                  width: `${(segments.completed / capacity) * 100}%`,
                  backgroundColor: CATALYST_V5.teal 
                }}
              />
              <div 
                className="h-full transition-all"
                style={{ 
                  width: `${(segments.inProgress / capacity) * 100}%`,
                  backgroundColor: CATALYST_V5.primary 
                }}
              />
              <div 
                className="h-full transition-all"
                style={{ 
                  width: `${(segments.pending / capacity) * 100}%`,
                  backgroundColor: CATALYST_V5.slate[300]
                }}
              />
            </div>
          ) : (
            /* Single fill bar */
            <div 
              className={`h-full rounded-full transition-all ${sizeClasses[size]}`}
              style={{ 
                width: `${cappedPercentage}%`,
                backgroundColor: color 
              }}
            />
          )}
        </div>
        
        {/* Overflow indicator for over-capacity */}
        {isOverCapacity && (
          <div 
            className={`absolute top-0 rounded-full ${sizeClasses[size]}`}
            style={{ 
              left: '100%',
              width: `${overflowPercentage}%`,
              backgroundColor: CATALYST_V5.danger,
              opacity: 0.6
            }}
          />
        )}
        
        {/* Capacity marker */}
        <div 
          className="absolute top-0 w-0.5 h-full"
          style={{ 
            left: '100%',
            backgroundColor: CATALYST_V5.slate[400],
            transform: 'translateX(-50%)'
          }}
        />
      </div>
    </div>
  );
}

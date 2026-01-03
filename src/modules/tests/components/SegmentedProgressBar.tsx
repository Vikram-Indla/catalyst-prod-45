/**
 * SegmentedProgressBar
 * Multi-segment progress bar showing passed/failed/blocked/pending
 */

import React from 'react';
import { cn } from '@/lib/utils';

interface Segment {
  value: number;
  color: string;
  label: string;
}

interface SegmentedProgressBarProps {
  segments: Segment[];
  total: number;
  height?: string;
  className?: string;
  showLabels?: boolean;
}

export function SegmentedProgressBar({
  segments,
  total,
  height = 'h-2',
  className,
  showLabels = true,
}: SegmentedProgressBarProps) {
  if (total === 0) return null;

  return (
    <div className={cn('space-y-2', className)}>
      {/* Progress Bar */}
      <div className={cn('w-full rounded-full overflow-hidden flex', height, 'bg-surface-3')}>
        {segments.map((segment, index) => {
          const width = (segment.value / total) * 100;
          if (width === 0) return null;
          return (
            <div
              key={index}
              className={cn('h-full transition-all', segment.color)}
              style={{ width: `${width}%` }}
            />
          );
        })}
      </div>

      {/* Labels */}
      {showLabels && (
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          {segments.map((segment, index) => (
            <div key={index} className="flex items-center gap-1.5 text-xs">
              <div className={cn('w-2 h-2 rounded-full', segment.color)} />
              <span className="text-text-tertiary">
                {segment.value} {segment.label}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

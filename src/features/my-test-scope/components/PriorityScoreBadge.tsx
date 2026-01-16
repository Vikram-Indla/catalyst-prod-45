/**
 * Priority Score Badge
 * Visual indicator for test priority scores
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { getScoreColor, getScoreLevel } from '../types';

interface PriorityScoreBadgeProps {
  score: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export function PriorityScoreBadge({ score, size = 'md', showLabel = false }: PriorityScoreBadgeProps) {
  const color = getScoreColor(score);
  const level = getScoreLevel(score);
  
  const sizeClasses = {
    sm: 'w-7 h-5 text-[10px]',
    md: 'w-9 h-6 text-xs',
    lg: 'w-12 h-8 text-sm',
  };

  return (
    <div className="flex items-center gap-2">
      <span 
        className={cn(
          'inline-flex items-center justify-center rounded font-bold text-white',
          sizeClasses[size]
        )}
        style={{ backgroundColor: color }}
      >
        {score}
      </span>
      {showLabel && (
        <span className="text-xs text-muted-foreground capitalize">{level}</span>
      )}
    </div>
  );
}

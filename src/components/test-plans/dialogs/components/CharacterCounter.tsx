/**
 * CharacterCounter - Shows character count with warning/danger states
 * GOD-TIER 9.8 Implementation
 */

import React from 'react';
import { cn } from '@/lib/utils';

interface CharacterCounterProps {
  current: number;
  max: number;
  warningThreshold?: number; // Percentage (default 80%)
  className?: string;
}

export function CharacterCounter({ 
  current, 
  max, 
  warningThreshold = 80,
  className 
}: CharacterCounterProps) {
  const percentage = (current / max) * 100;
  
  const getColorClass = () => {
    if (percentage >= 100) return 'text-destructive font-semibold';
    if (percentage >= warningThreshold) return 'text-warning';
    return 'text-muted-foreground';
  };

  return (
    <span className={cn('text-[10px] tabular-nums', getColorClass(), className)}>
      {current}/{max}
    </span>
  );
}

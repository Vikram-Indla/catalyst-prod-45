/**
 * Module 3A-5: Speed Indicator Badge
 */
import React from 'react';
import { cn } from '@/lib/utils';
import type { SpeedIndicator } from '../../types/timer-metrics';

interface SpeedBadgeProps {
  indicator: SpeedIndicator | null;
  showIcon?: boolean;
  size?: 'sm' | 'md';
}

export const SpeedBadge: React.FC<SpeedBadgeProps> = React.memo(({
  indicator,
  showIcon = true,
  size = 'md',
}) => {
  if (!indicator) return null;

  return (
    <span className={cn(
      'inline-flex items-center gap-1 rounded-full font-medium',
      indicator.bgColor,
      indicator.color,
      size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm'
    )}>
      {showIcon && <span>{indicator.icon}</span>}
      <span>{indicator.label}</span>
    </span>
  );
});

SpeedBadge.displayName = 'SpeedBadge';

import React from 'react';
import { cn } from '@/lib/utils';

interface ProgressBarProps {
  value: number;
  className?: string;
  size?: 'sm' | 'default';
  showLabel?: boolean;
  color?: 'auto' | 'green' | 'gold' | 'bronze';
}

const colorStyles = {
  green: 'bg-[var(--section-accent-green)]',
  gold: 'bg-[var(--section-accent-gold)]',
  bronze: 'bg-[var(--section-accent-bronze)]',
};

export function ProgressBar({
  value,
  className,
  size = 'default',
  showLabel,
  color = 'auto',
}: ProgressBarProps) {
  const safeValue = Math.min(100, Math.max(0, value));
  
  let barColor: string;
  if (color === 'auto') {
    if (safeValue >= 70) barColor = colorStyles.green;
    else if (safeValue >= 30) barColor = colorStyles.gold;
    else barColor = 'bg-[var(--danger)]';
  } else {
    barColor = colorStyles[color];
  }

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div
        className={cn(
          'flex-1 bg-[var(--progress-bg)] rounded-full overflow-hidden',
          size === 'sm' ? 'h-1' : 'h-1.5'
        )}
      >
        <div
          className={cn('h-full rounded-full transition-all duration-300', barColor)}
          style={{ width: `${safeValue}%` }}
        />
      </div>
      {showLabel && (
        <span className="text-xs font-medium text-[var(--text-secondary)] min-w-[36px] text-right">
          {safeValue}%
        </span>
      )}
    </div>
  );
}

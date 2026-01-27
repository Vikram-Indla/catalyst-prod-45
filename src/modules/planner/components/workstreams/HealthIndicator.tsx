// ============================================================
// HEALTH INDICATOR COMPONENT
// Shows workstream health status with colored dot and label
// ============================================================

import { cn } from '@/lib/utils';

interface HealthIndicatorProps {
  health: 'healthy' | 'at-risk' | 'critical';
  showLabel?: boolean;
  size?: 'sm' | 'md';
}

const HEALTH_CONFIG = {
  healthy: {
    color: '#10b981',
    bgColor: 'bg-emerald-100 dark:bg-emerald-900/30',
    textColor: 'text-emerald-700 dark:text-emerald-400',
    label: 'Healthy',
  },
  'at-risk': {
    color: '#f59e0b',
    bgColor: 'bg-amber-100 dark:bg-amber-900/30',
    textColor: 'text-amber-700 dark:text-amber-400',
    label: 'At Risk',
  },
  critical: {
    color: '#ef4444',
    bgColor: 'bg-red-100 dark:bg-red-900/30',
    textColor: 'text-red-700 dark:text-red-400',
    label: 'Critical',
  },
};

export function HealthIndicator({ health, showLabel = true, size = 'md' }: HealthIndicatorProps) {
  const config = HEALTH_CONFIG[health];
  const dotSize = size === 'sm' ? 'w-2 h-2' : 'w-2.5 h-2.5';
  const textSize = size === 'sm' ? 'text-[10px]' : 'text-xs';

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-1 rounded-full',
        config.bgColor
      )}
    >
      <span
        className={cn('rounded-full', dotSize)}
        style={{ backgroundColor: config.color }}
      />
      {showLabel && (
        <span className={cn('font-medium', textSize, config.textColor)}>
          {config.label}
        </span>
      )}
    </div>
  );
}

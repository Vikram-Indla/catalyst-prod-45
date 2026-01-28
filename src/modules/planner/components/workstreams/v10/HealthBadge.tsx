// ============================================================
// WORKSTREAMS V10 HEALTH BADGE
// Health indicator with trend arrow (↑↓→)
// ============================================================

import { cn } from '@/lib/utils';
import { Lock, CheckCircle, AlertTriangle, AlertCircle, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { HealthStatus, HealthTrend } from './types';

interface HealthBadgeProps {
  health: HealthStatus;
  trend?: HealthTrend;
  size?: 'sm' | 'md' | 'lg';
  showTrend?: boolean;
  className?: string;
}

const HEALTH_CONFIG = {
  healthy: {
    label: 'On Track',
    bgColor: 'bg-emerald-100 dark:bg-emerald-900/30',
    textColor: 'text-emerald-700 dark:text-emerald-400',
    borderColor: 'border-emerald-200 dark:border-emerald-800',
    icon: CheckCircle,
  },
  'at-risk': {
    label: 'At Risk',
    bgColor: 'bg-amber-100 dark:bg-amber-900/30',
    textColor: 'text-amber-700 dark:text-amber-400',
    borderColor: 'border-amber-200 dark:border-amber-800',
    icon: AlertTriangle,
  },
  critical: {
    label: 'Critical',
    bgColor: 'bg-red-100 dark:bg-red-900/30',
    textColor: 'text-red-700 dark:text-red-400',
    borderColor: 'border-red-200 dark:border-red-800',
    icon: AlertCircle,
  },
  locked: {
    label: 'Locked',
    bgColor: 'bg-slate-100 dark:bg-slate-800',
    textColor: 'text-slate-500 dark:text-slate-400',
    borderColor: 'border-slate-200 dark:border-slate-700',
    icon: Lock,
  },
};

const TREND_CONFIG = {
  up: {
    icon: TrendingUp,
    color: 'text-emerald-600 dark:text-emerald-400',
    label: 'Improving',
  },
  down: {
    icon: TrendingDown,
    color: 'text-red-600 dark:text-red-400',
    label: 'Declining',
  },
  stable: {
    icon: Minus,
    color: 'text-slate-400 dark:text-slate-500',
    label: 'Stable',
  },
};

const SIZE_CONFIG = {
  sm: {
    badge: 'px-2 py-0.5 text-[10px] gap-1',
    icon: 'w-3 h-3',
    trend: 'text-[8px]',
  },
  md: {
    badge: 'px-2.5 py-1 text-xs gap-1.5',
    icon: 'w-3.5 h-3.5',
    trend: 'text-[10px]',
  },
  lg: {
    badge: 'px-3 py-1.5 text-sm gap-2',
    icon: 'w-4 h-4',
    trend: 'text-xs',
  },
};

export function HealthBadge({ 
  health, 
  trend, 
  size = 'md', 
  showTrend = true,
  className 
}: HealthBadgeProps) {
  const config = HEALTH_CONFIG[health];
  const sizeConfig = SIZE_CONFIG[size];
  const trendConfig = trend ? TREND_CONFIG[trend] : null;
  const Icon = config.icon;
  const TrendIcon = trendConfig?.icon;

  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full font-medium border',
        config.bgColor,
        config.textColor,
        config.borderColor,
        sizeConfig.badge,
        className
      )}
      role="status"
      aria-label={`Health status: ${config.label}${trendConfig ? `, ${trendConfig.label}` : ''}`}
    >
      <Icon className={sizeConfig.icon} aria-hidden="true" />
      <span>{config.label}</span>
      
      {showTrend && trendConfig && TrendIcon && health !== 'locked' && (
        <TrendIcon 
          className={cn(sizeConfig.trend, trendConfig.color)} 
          aria-hidden="true"
        />
      )}
    </div>
  );
}

// Standalone trend indicator
export function TrendIndicator({ trend, size = 'sm' }: { trend: HealthTrend; size?: 'sm' | 'md' }) {
  const config = TREND_CONFIG[trend];
  const Icon = config.icon;
  const iconSize = size === 'sm' ? 'w-3 h-3' : 'w-4 h-4';

  return (
    <span 
      className={cn('inline-flex items-center', config.color)}
      title={config.label}
      aria-label={config.label}
    >
      <Icon className={iconSize} />
    </span>
  );
}

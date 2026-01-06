/**
 * KPI Card - Displays a single metric with trend indicator
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus, LucideIcon } from 'lucide-react';

interface KPICardProps {
  label: string;
  value: string | number;
  trend?: {
    value: number;
    direction: 'up' | 'down' | 'neutral';
  };
  icon: LucideIcon;
  iconColor?: 'blue' | 'teal' | 'orange' | 'red' | 'purple';
  valueColor?: 'default' | 'teal' | 'red';
  className?: string;
  animationDelay?: number;
}

const iconColorClasses = {
  blue: 'bg-[var(--sem-info-bg)] text-[var(--sem-info)]',
  teal: 'bg-brand-teal/10 text-brand-teal',
  orange: 'bg-[var(--sem-warning-bg)] text-[var(--sem-warning)]',
  red: 'bg-[var(--sem-danger-bg)] text-[var(--sem-danger)]',
  purple: 'bg-brand-primary/10 text-brand-primary',
};

const valueColorClasses = {
  default: 'text-foreground',
  teal: 'text-brand-teal',
  red: 'text-destructive',
};

export function KPICard({
  label,
  value,
  trend,
  icon: Icon,
  iconColor = 'blue',
  valueColor = 'default',
  className,
  animationDelay = 0,
}: KPICardProps) {
  const TrendIcon = trend?.direction === 'up' 
    ? TrendingUp 
    : trend?.direction === 'down' 
    ? TrendingDown 
    : Minus;

  const trendColor = trend?.direction === 'up'
    ? 'bg-[var(--sem-success-bg)] text-[var(--sem-success)]'
    : trend?.direction === 'down'
    ? 'bg-[var(--sem-danger-bg)] text-destructive'
    : 'bg-muted text-muted-foreground';

  return (
    <div
      className={cn(
        'bg-background border rounded-xl p-5 transition-all duration-200 hover:shadow-md hover:border-border/80 animate-fade-in',
        className
      )}
      style={{ animationDelay: `${animationDelay}ms` }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className={cn(
          'flex items-center justify-center w-10 h-10 rounded-lg',
          iconColorClasses[iconColor]
        )}>
          <Icon className="h-5 w-5" />
        </div>
        
        {trend && (
          <span className={cn(
            'flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-semibold',
            trendColor
          )}>
            <TrendIcon className="h-3 w-3" />
            {trend.direction === 'neutral' ? '0%' : `${trend.value > 0 ? '+' : ''}${trend.value}%`}
          </span>
        )}
      </div>
      
      <div className={cn(
        'text-3xl font-extrabold mb-1 animate-fade-in',
        valueColorClasses[valueColor]
      )}>
        {value}
      </div>
      
      <div className="text-xs text-muted-foreground">
        {label}
      </div>
    </div>
  );
}

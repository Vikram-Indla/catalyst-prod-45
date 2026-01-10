import React, { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { Package, Play, CheckCircle, Bug, Target, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

export interface MetricCardProps {
  label: string;
  value: number;
  suffix?: string;
  trend?: {
    direction: 'up' | 'down' | 'neutral';
    text: string;
  };
  icon: 'package' | 'play' | 'check-circle' | 'bug' | 'target';
  iconVariant: 'primary' | 'success' | 'warning' | 'danger' | 'teal' | 'purple';
  progress?: number;
  className?: string;
  animationDelay?: number;
}

const iconMap = {
  package: Package,
  play: Play,
  'check-circle': CheckCircle,
  bug: Bug,
  target: Target,
};

const variantStyles = {
  primary: {
    bg: 'bg-blue-50 dark:bg-blue-950/30',
    icon: 'text-blue-600 dark:text-blue-400',
    border: 'border-blue-100 dark:border-blue-900/50',
  },
  success: {
    bg: 'bg-emerald-50 dark:bg-emerald-950/30',
    icon: 'text-emerald-600 dark:text-emerald-400',
    border: 'border-emerald-100 dark:border-emerald-900/50',
  },
  warning: {
    bg: 'bg-amber-50 dark:bg-amber-950/30',
    icon: 'text-amber-600 dark:text-amber-400',
    border: 'border-amber-100 dark:border-amber-900/50',
  },
  danger: {
    bg: 'bg-red-50 dark:bg-red-950/30',
    icon: 'text-red-600 dark:text-red-400',
    border: 'border-red-100 dark:border-red-900/50',
  },
  teal: {
    bg: 'bg-teal-50 dark:bg-teal-950/30',
    icon: 'text-teal-600 dark:text-teal-400',
    border: 'border-teal-100 dark:border-teal-900/50',
  },
  purple: {
    bg: 'bg-purple-50 dark:bg-purple-950/30',
    icon: 'text-purple-600 dark:text-purple-400',
    border: 'border-purple-100 dark:border-purple-900/50',
  },
};

const TrendIcon = ({ direction }: { direction: 'up' | 'down' | 'neutral' }) => {
  switch (direction) {
    case 'up':
      return <TrendingUp className="h-3 w-3" />;
    case 'down':
      return <TrendingDown className="h-3 w-3" />;
    default:
      return <Minus className="h-3 w-3" />;
  }
};

export function MetricCard({
  label,
  value,
  suffix = '',
  trend,
  icon,
  iconVariant,
  progress,
  className,
  animationDelay = 0,
}: MetricCardProps) {
  const [animatedValue, setAnimatedValue] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  
  const IconComponent = iconMap[icon];
  const styles = variantStyles[iconVariant];

  // Animate in
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), animationDelay);
    return () => clearTimeout(timer);
  }, [animationDelay]);

  // Count up animation
  useEffect(() => {
    if (!isVisible) return;
    
    const duration = 1000;
    const startTime = Date.now();
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Ease out
      const easeOut = 1 - Math.pow(1 - progress, 3);
      setAnimatedValue(Math.round(value * easeOut));
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    requestAnimationFrame(animate);
  }, [value, isVisible]);

  // FIX 6: Correct vertical layout - label top-left, icon top-right, value large, trend below
  return (
    <div
      className={cn(
        'relative bg-card border rounded-lg p-4 transition-all duration-300',
        'hover:shadow-md hover:border-primary/20',
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3',
        className
      )}
      style={{ transitionDelay: `${animationDelay}ms` }}
    >
      {/* Header row: Label left, Icon right */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <p className="text-[13px] font-medium text-muted-foreground">
          {label}
        </p>
        {/* Icon box - top right */}
        <div className={cn('p-2.5 rounded-lg border flex-shrink-0', styles.bg, styles.border)}>
          <IconComponent className={cn('h-5 w-5', styles.icon)} />
        </div>
      </div>
      
      {/* Large value */}
      <p className="text-[32px] font-bold tabular-nums text-foreground leading-none mb-2">
        {animatedValue}{suffix}
      </p>
      
      {/* Trend or Progress */}
      <div>
        {trend && (
          <div className={cn(
            'flex items-center gap-1 text-xs font-medium',
            trend.direction === 'up' && iconVariant !== 'danger' && 'text-emerald-600 dark:text-emerald-400',
            trend.direction === 'down' && iconVariant === 'danger' && 'text-emerald-600 dark:text-emerald-400',
            trend.direction === 'down' && iconVariant !== 'danger' && 'text-red-600 dark:text-red-400',
            trend.direction === 'up' && iconVariant === 'danger' && 'text-red-600 dark:text-red-400',
            trend.direction === 'neutral' && 'text-muted-foreground'
          )}>
            <TrendIcon direction={trend.direction} />
            <span>{trend.text}</span>
          </div>
        )}
        
        {progress !== undefined && (
          <div className="space-y-1.5">
            <Progress 
              value={isVisible ? progress : 0} 
              variant={iconVariant === 'teal' ? 'teal' : iconVariant === 'purple' ? 'primary' : 'primary'}
              size="sm"
              animate
              className="h-1.5"
            />
            <p className="text-xs text-muted-foreground">
              {progress}% complete
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default MetricCard;

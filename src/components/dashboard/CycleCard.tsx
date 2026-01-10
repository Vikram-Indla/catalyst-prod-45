import React from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

export interface CycleCardProps {
  id: string;
  cycleKey: string;
  name: string;
  environment: 'dev' | 'staging' | 'production';
  progress: number;
  assignee: { initials: string; name: string; color: string };
  testsCompleted: number;
  testsTotal: number;
  onClick?: () => void;
  className?: string;
  animationDelay?: number;
}

// FIX 7: Full environment names instead of abbreviations
const envStyles = {
  dev: {
    badge: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800',
    label: 'Dev',
  },
  staging: {
    badge: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800',
    label: 'Staging',
  },
  production: {
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800',
    label: 'Production',
  },
};

export function CycleCard({
  cycleKey,
  name,
  environment,
  progress,
  assignee,
  testsCompleted,
  testsTotal,
  onClick,
  className,
  animationDelay = 0,
}: CycleCardProps) {
  const [isVisible, setIsVisible] = React.useState(false);
  const envStyle = envStyles[environment];

  React.useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), animationDelay);
    return () => clearTimeout(timer);
  }, [animationDelay]);

  return (
    <div
      onClick={onClick}
      className={cn(
        'group relative bg-card border rounded-lg p-4 transition-all duration-200 cursor-pointer',
        'hover:shadow-md hover:border-primary/30 hover:-translate-y-0.5',
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3',
        className
      )}
      style={{ transitionDelay: `${animationDelay}ms` }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick?.()}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-mono font-medium text-muted-foreground">
              {cycleKey}
            </span>
            <span 
              className={cn(
                'inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide border',
                envStyle.badge
              )}
            >
              {envStyle.label}
            </span>
          </div>
          <h4 className="text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors">
            {name}
          </h4>
        </div>
      </div>
      
      {/* Progress */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Progress</span>
          <span className="font-medium text-foreground tabular-nums">{progress}%</span>
        </div>
        <Progress 
          value={isVisible ? progress : 0} 
          variant={progress === 0 ? 'primary' : progress >= 70 ? 'success' : 'primary'}
          size="sm"
          animate
        />
        {/* FIX 8: Avatar LEFT of assignee name */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{testsCompleted} of {testsTotal} tests</span>
          <div className="flex items-center gap-1.5">
            <Avatar size="xs" className="flex-shrink-0">
              <AvatarFallback 
                style={{ backgroundColor: assignee.color }} 
                className="text-white text-[8px] font-medium"
              >
                {assignee.initials}
              </AvatarFallback>
            </Avatar>
            <span>{assignee.name}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CycleCard;

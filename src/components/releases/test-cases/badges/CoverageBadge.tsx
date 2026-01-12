/**
 * CoverageBadge — Test coverage indicator with progress
 */

import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface CoverageBadgeProps {
  percentage: number;
  size?: 'sm' | 'default';
  showLabel?: boolean;
  className?: string;
}

function getCoverageColor(percentage: number): string {
  if (percentage >= 80) return 'text-green-600 dark:text-green-400';
  if (percentage >= 60) return 'text-yellow-600 dark:text-yellow-400';
  if (percentage >= 40) return 'text-orange-600 dark:text-orange-400';
  return 'text-red-600 dark:text-red-400';
}

function getCoverageBarColor(percentage: number): string {
  if (percentage >= 80) return 'bg-green-500';
  if (percentage >= 60) return 'bg-yellow-500';
  if (percentage >= 40) return 'bg-orange-500';
  return 'bg-red-500';
}

export function CoverageBadge({ 
  percentage, 
  size = 'default', 
  showLabel = true,
  className 
}: CoverageBadgeProps) {
  const clampedPercentage = Math.min(100, Math.max(0, percentage));
  
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div 
          className={cn(
            'inline-flex items-center gap-2',
            size === 'sm' ? 'text-xs' : 'text-sm',
            className
          )}
        >
          {showLabel && (
            <span className={cn('font-medium tabular-nums', getCoverageColor(clampedPercentage))}>
              {clampedPercentage}%
            </span>
          )}
          <div className={cn(
            'overflow-hidden rounded-full bg-muted',
            size === 'sm' ? 'h-1.5 w-12' : 'h-2 w-16'
          )}>
            <div 
              className={cn(
                'h-full transition-all duration-300',
                getCoverageBarColor(clampedPercentage)
              )}
              style={{ width: `${clampedPercentage}%` }}
            />
          </div>
        </div>
      </TooltipTrigger>
      <TooltipContent side="top" className="text-xs">
        <div className="space-y-1">
          <p className="font-medium">Test Coverage: {clampedPercentage}%</p>
          <p className="text-muted-foreground">
            {clampedPercentage >= 80 ? 'Excellent coverage' :
             clampedPercentage >= 60 ? 'Good coverage' :
             clampedPercentage >= 40 ? 'Moderate coverage' :
             'Low coverage - needs improvement'}
          </p>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

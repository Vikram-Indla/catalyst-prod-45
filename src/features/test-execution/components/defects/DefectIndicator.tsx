/**
 * Module 4C-3: Defect Indicator Badge
 * Shows defect count with severity indicator
 */

import React from 'react';
import { Bug } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface DefectIndicatorProps {
  count: number;
  criticalCount?: number;
  size?: 'sm' | 'md';
  showZero?: boolean;
  className?: string;
}

export function DefectIndicator({
  count,
  criticalCount = 0,
  size = 'sm',
  showZero = false,
  className,
}: DefectIndicatorProps) {
  if (count === 0 && !showZero) {
    return null;
  }

  const hasCritical = criticalCount > 0;
  const sizeConfig = {
    sm: {
      badge: 'h-5 px-1.5 text-xs gap-0.5',
      icon: 'h-3 w-3',
    },
    md: {
      badge: 'h-6 px-2 text-sm gap-1',
      icon: 'h-3.5 w-3.5',
    },
  };

  const config = sizeConfig[size];

  const badge = (
    <Badge
      variant="outline"
      className={cn(
        'font-medium',
        config.badge,
        hasCritical
          ? 'bg-red-100 text-red-700 border-red-300 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700'
          : count > 0
          ? 'bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-700'
          : 'bg-muted text-muted-foreground',
        className
      )}
    >
      <Bug className={config.icon} />
      {count}
    </Badge>
  );

  if (count === 0) {
    return badge;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{badge}</TooltipTrigger>
        <TooltipContent>
          <p>
            {count} defect{count !== 1 ? 's' : ''} linked
            {hasCritical && (
              <span className="text-red-400 ml-1">
                ({criticalCount} critical)
              </span>
            )}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

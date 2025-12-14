import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { TrendCode } from '../lib/okrTypes';

interface TrendIconProps {
  trend: TrendCode;
  variance?: number | null;
  size?: 'sm' | 'md';
}

const TREND_CONFIG = {
  ahead: {
    icon: TrendingUp,
    colorClass: 'text-secondary-green',
    label: 'Ahead of plan',
  },
  'on-plan': {
    icon: Minus,
    colorClass: 'text-muted-foreground',
    label: 'On plan',
  },
  behind: {
    icon: TrendingDown,
    colorClass: 'text-destructive',
    label: 'Behind plan',
  },
  none: {
    icon: Minus,
    colorClass: 'text-muted-foreground/50',
    label: 'No baseline',
  },
} as const;

export function TrendIcon({ trend, variance, size = 'sm' }: TrendIconProps) {
  const config = TREND_CONFIG[trend];
  const Icon = config.icon;
  const iconSize = size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4';
  
  const varianceText = variance !== null && variance !== undefined
    ? `${variance > 0 ? '+' : ''}${variance}pp`
    : '';

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Icon className={`${iconSize} ${config.colorClass} flex-shrink-0`} />
        </TooltipTrigger>
        <TooltipContent side="top">
          <p>{config.label}{varianceText && ` (${varianceText})`}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
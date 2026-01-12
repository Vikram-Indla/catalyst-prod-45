/**
 * AutomationBadge — Automation status indicator
 */

import { Badge } from '@/components/ui/badge';
import { Bot, Hand, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export type AutomationStatus = 'automated' | 'manual' | 'in_progress' | 'candidate';

interface AutomationBadgeProps {
  status: AutomationStatus;
  size?: 'sm' | 'default';
  showTooltip?: boolean;
  className?: string;
}

const statusConfig: Record<AutomationStatus, { 
  label: string; 
  shortLabel: string;
  icon: React.ComponentType<{ className?: string }>;
  tooltip: string;
  className: string;
}> = {
  automated: {
    label: 'Automated',
    shortLabel: 'Auto',
    icon: Bot,
    tooltip: 'This test case is fully automated',
    className: 'bg-violet-500/15 text-violet-700 dark:text-violet-400 border-violet-500/30',
  },
  manual: {
    label: 'Manual',
    shortLabel: 'Manual',
    icon: Hand,
    tooltip: 'This test case requires manual execution',
    className: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30',
  },
  in_progress: {
    label: 'Automating',
    shortLabel: 'WIP',
    icon: Loader2,
    tooltip: 'Automation is in progress for this test case',
    className: 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30',
  },
  candidate: {
    label: 'Candidate',
    shortLabel: 'Candidate',
    icon: Bot,
    tooltip: 'This test case is a candidate for automation',
    className: 'bg-slate-500/15 text-slate-700 dark:text-slate-400 border-slate-500/30',
  },
};

export function AutomationBadge({ 
  status, 
  size = 'default', 
  showTooltip = true,
  className 
}: AutomationBadgeProps) {
  const config = statusConfig[status];
  const Icon = config.icon;

  const badge = (
    <Badge 
      variant="outline"
      size={size} 
      className={cn(
        config.className,
        'font-medium',
        className
      )}
    >
      <Icon className={cn(
        "mr-1", 
        size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5',
        status === 'in_progress' && 'animate-spin'
      )} />
      {size === 'sm' ? config.shortLabel : config.label}
    </Badge>
  );

  if (!showTooltip) return badge;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {badge}
      </TooltipTrigger>
      <TooltipContent side="top" className="text-xs">
        {config.tooltip}
      </TooltipContent>
    </Tooltip>
  );
}

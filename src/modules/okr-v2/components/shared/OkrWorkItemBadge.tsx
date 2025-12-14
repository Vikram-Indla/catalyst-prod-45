// ═══════════════════════════════════════════════════════════════════════════════
// OKR Work Item Badge — Shows work item type icon + name
// e.g., [Epic Icon] Epic - Mobile App Integration
// ═══════════════════════════════════════════════════════════════════════════════

import { Hexagon, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export type WorkItemBadgeType = 'epic' | 'feature' | 'story' | 'unknown';

interface OkrWorkItemBadgeProps {
  type: WorkItemBadgeType;
  name: string;
  compact?: boolean;
  className?: string;
}

// Get icon for work item type
function getWorkItemIcon(type: WorkItemBadgeType) {
  switch (type) {
    case 'epic':
      return <Hexagon className="h-3.5 w-3.5 text-secondary-green flex-shrink-0" />;
    case 'feature':
      return <Layers className="h-3.5 w-3.5 text-brand-gold flex-shrink-0" />;
    case 'story':
      return <Layers className="h-3 w-3 text-secondary-bronze flex-shrink-0" />;
    default:
      return <Layers className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />;
  }
}

// Get display label for work item type
function getTypeLabel(type: WorkItemBadgeType): string {
  switch (type) {
    case 'epic':
      return 'Epic';
    case 'feature':
      return 'Feature';
    case 'story':
      return 'Story';
    default:
      return 'Work';
  }
}

export function OkrWorkItemBadge({ type, name, compact = false, className }: OkrWorkItemBadgeProps) {
  const icon = getWorkItemIcon(type);
  const typeLabel = getTypeLabel(type);
  const displayText = compact ? name : `${typeLabel} - ${name}`;
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn(
            "flex items-center gap-1.5 min-w-0",
            className
          )}>
            {icon}
            <span className={cn(
              "text-sm truncate",
              compact ? "max-w-[140px]" : "max-w-[220px]",
              "text-muted-foreground italic"
            )}>
              {displayText}
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-md bg-popover border border-border z-[400]">
          <div className="flex items-center gap-2">
            {icon}
            <span className="font-medium">{typeLabel}</span>
            <span className="text-muted-foreground">-</span>
            <span>{name}</span>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

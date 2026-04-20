// ═══════════════════════════════════════════════════════════════════════════════
// OKR Work Item Badge — Shows work item type icon + name
// e.g., [Epic Icon] Epic - Mobile App Integration
// ═══════════════════════════════════════════════════════════════════════════════

import { cn } from '@/lib/utils';
import { Tooltip } from '@/components/ads';
import { WorkItemIcon } from '@/components/ja/icons/WorkItemIcon';

export type WorkItemBadgeType = 'epic' | 'feature' | 'story' | 'unknown';

interface OkrWorkItemBadgeProps {
  type: WorkItemBadgeType;
  name: string;
  compact?: boolean;
  className?: string;
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
  const typeLabel = getTypeLabel(type);
  const displayText = compact ? name : `${typeLabel} - ${name}`;
  const iconType = type === 'unknown' ? 'story' : type;
  
  return (
    <Tooltip
      position="top"
      content={
        <div className="flex items-center gap-2">
          <WorkItemIcon type={iconType} size={14} />
          <span className="font-medium">{typeLabel}</span>
          <span className="text-muted-foreground">-</span>
          <span>{name}</span>
        </div>
      }
    >
      <div className={cn(
        "flex items-center gap-1.5 min-w-0",
        className
      )}>
        <WorkItemIcon type={iconType} size={14} />
        <span className={cn(
          "text-sm truncate",
          compact ? "max-w-[140px]" : "max-w-[220px]",
          "text-muted-foreground italic"
        )}>
          {displayText}
        </span>
      </div>
    </Tooltip>
  );
}

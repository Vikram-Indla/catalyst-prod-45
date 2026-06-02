// ============================================================
// PRIORITY BADGE COMPONENT
// Displays task priority with color-coded styling and icons
// Critical/High: colored badges, Medium/Low: subtle (no background)
// Catalyst V5 semantic colors
// ============================================================

import type { KanbanTaskPriority } from '../../types/kanban';
import { cn } from '@/lib/utils';

interface PriorityBadgeProps {
  priority: KanbanTaskPriority;
  className?: string;
  showIcon?: boolean;
}

export function PriorityBadge({ priority, className, showIcon = true }: PriorityBadgeProps) {
  // Critical and High get colored badges, Medium and Low are subtle
  switch (priority) {
    case 'critical':
      return (
        <span
          className={cn(
            'inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded',
            'bg-red-50 text-red-600',
            className
          )}
        >
          {showIcon && <span className="text-[9px]">⚠️</span>}
          Critical
        </span>
      );
    
    case 'high':
      return (
        <span
          className={cn(
            'inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded',
            'bg-amber-50 text-amber-600',
            className
          )}
        >
          {showIcon && <span className="text-[9px]">🔥</span>}
          High
        </span>
      );
    
    case 'medium':
      // Subtle - no background, just text
      return (
        <span
          className={cn(
            'inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide',
            'text-slate-500',
            className
          )}
        >
          {showIcon && <span className="text-[9px]">●</span>}
          Medium
        </span>
      );
    
    case 'low':
      // Subtle - no background, just text
      return (
        <span
          className={cn(
            'inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide',
            'text-slate-400',
            className
          )}
        >
          {showIcon && <span className="text-[9px]">○</span>}
          Low
        </span>
      );
    
    default:
      return null;
  }
}

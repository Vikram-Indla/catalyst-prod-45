// ============================================================
// PRIORITY BADGE COMPONENT
// Displays task priority with color-coded styling and icons
// Catalyst V5 semantic colors
// ============================================================

import type { KanbanTaskPriority } from '../../types/kanban';
import { PRIORITY_STYLES } from '../../types/kanban';
import { cn } from '@/lib/utils';

interface PriorityBadgeProps {
  priority: KanbanTaskPriority;
  className?: string;
  showIcon?: boolean;
}

export function PriorityBadge({ priority, className, showIcon = true }: PriorityBadgeProps) {
  const styles = PRIORITY_STYLES[priority];
  
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded',
        className
      )}
      style={{
        backgroundColor: styles.bg,
        color: styles.text,
      }}
    >
      {showIcon && <span className="text-[9px]">{styles.icon}</span>}
      {priority}
    </span>
  );
}

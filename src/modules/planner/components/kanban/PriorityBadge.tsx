// ============================================================
// PRIORITY BADGE COMPONENT
// Displays task priority with color-coded styling
// ============================================================

import type { KanbanTaskPriority } from '../../types/kanban';
import { PRIORITY_STYLES } from '../../types/kanban';
import { cn } from '@/lib/utils';

interface PriorityBadgeProps {
  priority: KanbanTaskPriority;
  className?: string;
}

export function PriorityBadge({ priority, className }: PriorityBadgeProps) {
  const styles = PRIORITY_STYLES[priority];
  
  return (
    <span
      className={cn(
        'text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded',
        className
      )}
      style={{
        backgroundColor: styles.bg,
        color: styles.text,
      }}
    >
      {priority}
    </span>
  );
}

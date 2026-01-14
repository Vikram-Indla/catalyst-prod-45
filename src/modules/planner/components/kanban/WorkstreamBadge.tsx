// ============================================================
// WORKSTREAM BADGE COMPONENT
// Displays workstream/team pill with Catalyst V5 color
// ============================================================

import type { KanbanWorkstream } from '../../types/kanban';
import { getWorkstreamColor } from '../../types/kanban';
import { cn } from '@/lib/utils';

interface WorkstreamBadgeProps {
  workstream: KanbanWorkstream;
  className?: string;
}

export function WorkstreamBadge({ workstream, className }: WorkstreamBadgeProps) {
  const colors = getWorkstreamColor(workstream.name);
  
  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full',
        className
      )}
      style={{ backgroundColor: colors.bg }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full"
        style={{ backgroundColor: colors.dot }}
      />
      <span 
        className="text-[11px] font-semibold"
        style={{ color: colors.text }}
      >
        {workstream.name}
      </span>
    </div>
  );
}

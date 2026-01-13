// ============================================================
// WORKSTREAM BADGE COMPONENT
// Displays workstream/team pill with color
// ============================================================

import type { KanbanWorkstream } from '../../types/kanban';
import { CATALYST_COLORS } from '../../types/kanban';
import { cn } from '@/lib/utils';

interface WorkstreamBadgeProps {
  workstream: KanbanWorkstream;
  className?: string;
}

export function WorkstreamBadge({ workstream, className }: WorkstreamBadgeProps) {
  const color = CATALYST_COLORS.teal;
  
  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full',
        className
      )}
      style={{ backgroundColor: CATALYST_COLORS.tealLight }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full"
        style={{ backgroundColor: color }}
      />
      <span 
        className="text-[11px] font-semibold"
        style={{ color: CATALYST_COLORS.teal }}
      >
        {workstream.name}
      </span>
    </div>
  );
}

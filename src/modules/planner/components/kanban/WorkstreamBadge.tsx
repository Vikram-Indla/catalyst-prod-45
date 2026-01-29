// ============================================================
// WORKSTREAM BADGE COMPONENT
// Displays workstream/team pill with proper workstream-specific colors
// Uses lib/workstream-colors.ts for correct color mapping
// Catalyst Track = TEAL, Senaie = INDIGO, etc.
// ============================================================

import type { KanbanWorkstream } from '../../types/kanban';
import { getWorkstreamColor } from '@/lib/workstream-colors';
import { cn } from '@/lib/utils';

interface WorkstreamBadgeProps {
  workstream: KanbanWorkstream;
  className?: string;
}

export function WorkstreamBadge({ workstream, className }: WorkstreamBadgeProps) {
  // Use proper workstream-specific colors from lib/workstream-colors.ts
  const colors = getWorkstreamColor(workstream.name);
  
  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full',
        className
      )}
      style={{ backgroundColor: colors.light }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
        style={{ backgroundColor: colors.hex }}
      />
      <span 
        className="text-[11px] font-semibold"
        style={{ color: colors.hex }}
      >
        {workstream.name.replace(' Track', '')}
      </span>
    </div>
  );
}

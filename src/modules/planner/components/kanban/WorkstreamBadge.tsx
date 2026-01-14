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
        colors.bg, // bg-teal-50 for Catalyst, bg-indigo-50 for Senaie, etc.
        className
      )}
    >
      <span
        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
        style={{ backgroundColor: colors.hex }}
      />
      <span 
        className={cn(
          'text-[11px] font-semibold',
          colors.text // text-teal-800 for Catalyst, etc.
        )}
      >
        {workstream.name.replace(' Track', '')}
      </span>
    </div>
  );
}

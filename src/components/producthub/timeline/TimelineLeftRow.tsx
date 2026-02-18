// =====================================================
// TIMELINE LEFT ROW — Single initiative row in left panel
// =====================================================

import React from 'react';
import { cn } from '@/lib/utils';
import type { TimelineInitiative } from '@/types/producthub/initiative';
import { DENSITY_MAP, hashColor, getInitialsFromName } from '@/types/producthub/initiative';
import { useTimelineState } from '@/hooks/producthub/useTimelineState';

interface TimelineLeftRowProps {
  initiative: TimelineInitiative;
}

export const TimelineLeftRow: React.FC<TimelineLeftRowProps> = ({ initiative }) => {
  const { density, selectedInitiativeId, openDetail } = useTimelineState();
  const rowHeight = DENSITY_MAP[density].row;
  const isSelected = selectedInitiativeId === initiative.id;

  const initials = initiative.assignee_name
    ? getInitialsFromName(initiative.assignee_name)
    : initiative.initiative_key.slice(0, 2);

  const avatarColor = hashColor(initiative.initiative_key);

  return (
    <button
      onClick={() => openDetail(initiative.id)}
      className={cn(
        'w-full flex items-center gap-2.5 px-4 border-b border-border/30 transition-colors duration-100 text-left shrink-0 overflow-hidden',
        isSelected ? 'bg-blue-50 dark:bg-blue-950/20' : 'hover:bg-muted/50'
      )}
      style={{ height: rowHeight, minHeight: rowHeight, maxHeight: rowHeight }}
    >
      {/* ID badge */}
      <span
        className="shrink-0 px-1.5 py-0.5 rounded-sm text-[11px] font-medium bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400"
        style={{ fontFamily: "'JetBrains Mono', monospace", fontVariantNumeric: 'tabular-nums' }}
      >
        {initiative.initiative_key}
      </span>

      {/* Title */}
      <span className="flex-1 text-[13px] font-medium text-foreground truncate max-w-[180px]">
        {initiative.title}
      </span>

      {/* Avatar circle */}
      <span
        className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-semibold text-white"
        style={{ backgroundColor: avatarColor }}
      >
        {initials}
      </span>
    </button>
  );
};

export default TimelineLeftRow;

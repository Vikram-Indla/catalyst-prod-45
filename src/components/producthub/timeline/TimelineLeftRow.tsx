// =====================================================
// TIMELINE LEFT ROW — Single initiative row with type indicator
// =====================================================

import React from 'react';
import { cn } from '@/lib/utils';
import type { TimelineInitiative } from '@/types/producthub/initiative';
import { DENSITY_MAP, hashColor, getInitialsFromName } from '@/types/producthub/initiative';
import { useTimelineState } from '@/hooks/producthub/useTimelineState';
import { getTypeColor } from '@/utils/initiative-type-utils';
import { InitiativeTypeBadge } from '@/components/producthub/shared/InitiativeTypeBadge';

interface TimelineLeftRowProps {
  initiative: TimelineInitiative;
}

export const TimelineLeftRow: React.FC<TimelineLeftRowProps> = ({ initiative }) => {
  const { density, selectedInitiativeId, openDetail } = useTimelineState();
  const rowHeight = DENSITY_MAP[density].row;
  const isSelected = selectedInitiativeId === initiative.id;
  const typeColor = getTypeColor(initiative.initiative_type_key);

  const initials = initiative.assignee_name
    ? getInitialsFromName(initiative.assignee_name)
    : initiative.initiative_key.slice(0, 2);

  const avatarColor = hashColor(initiative.assignee_name || initiative.initiative_key);

  return (
    <button
      onClick={() => openDetail(initiative.id)}
      className={cn(
        'w-full flex items-center gap-2 px-3 border-b border-border/30 transition-colors duration-100 text-left shrink-0 overflow-hidden',
        isSelected ? 'bg-blue-50' : 'hover:bg-muted/50'
      )}
      style={{ height: rowHeight, minHeight: rowHeight, maxHeight: rowHeight }}
    >
      {/* Type dot */}
      <span
        className="shrink-0 rounded-sm"
        style={{ width: 4, height: 20, background: typeColor.hex }}
      />

      {/* ID badge */}
      <span
        className="shrink-0 px-1.5 py-0.5 rounded-sm text-[10px] font-medium"
        style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontVariantNumeric: 'tabular-nums',
          background: 'var(--cp-blue-wash)',
          color: 'var(--cp-blue)',
        }}
      >
        {initiative.initiative_key}
      </span>

      {/* Title */}
      <span className="flex-1 text-[12px] font-medium text-foreground truncate max-w-[140px]">
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

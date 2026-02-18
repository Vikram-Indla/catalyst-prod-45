// =====================================================
// TIMELINE GROUP HEADER — Collapsible group row
// =====================================================

import React from 'react';
import { cn } from '@/lib/utils';
import { ChevronRight } from 'lucide-react';
import { useTimelineState } from '@/hooks/producthub/useTimelineState';

interface TimelineGroupHeaderProps {
  name: string;
  count: number;
}

export const TimelineGroupHeader: React.FC<TimelineGroupHeaderProps> = ({ name, count }) => {
  const { collapsedGroups, toggleGroup } = useTimelineState();
  const isCollapsed = collapsedGroups.has(name);

  return (
    <button
      onClick={() => toggleGroup(name)}
      className="w-full h-9 flex items-center gap-2 px-4 bg-muted/70 border-b border-border/30 text-left transition-colors hover:bg-muted"
    >
      <ChevronRight
        className={cn(
          'w-3.5 h-3.5 text-muted-foreground transition-transform duration-200',
          !isCollapsed && 'rotate-90'
        )}
      />
      <span className="text-[12px] font-semibold text-foreground uppercase tracking-wide">
        {name}
      </span>
      <span
        className="text-[11px] font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full"
        style={{ fontVariantNumeric: 'tabular-nums' }}
      >
        {count}
      </span>
    </button>
  );
};

export default TimelineGroupHeader;

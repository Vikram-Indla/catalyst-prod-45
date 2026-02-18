// =====================================================
// TIMELINE LEFT PANEL — Initiative list with grouping
// =====================================================

import React from 'react';
import { cn } from '@/lib/utils';
import { ArrowUpDown } from 'lucide-react';
import type { TimelineInitiative } from '@/types/producthub/initiative';
import { TimelineLeftRow } from './TimelineLeftRow';
import { TimelineGroupHeader } from './TimelineGroupHeader';
import { useTimelineState } from '@/hooks/producthub/useTimelineState';

interface GroupData {
  name: string;
  items: TimelineInitiative[];
  count: number;
}

interface TimelineLeftPanelProps {
  initiatives: TimelineInitiative[];
  groups: GroupData[];
  totalCount: number;
  isLoading: boolean;
  scrollRef?: React.RefObject<HTMLDivElement>;
}

/** Skeleton row for loading state */
const SkeletonRow = () => (
  <div className="flex items-center gap-2.5 px-4 h-11 border-b border-border/30 animate-pulse">
    <div className="w-14 h-5 bg-muted rounded-sm" />
    <div className="flex-1 h-4 bg-muted rounded" />
    <div className="w-5 h-5 bg-muted rounded-full" />
  </div>
);

export const TimelineLeftPanel: React.FC<TimelineLeftPanelProps> = ({
  initiatives,
  groups,
  totalCount,
  isLoading,
  scrollRef,
}) => {
  const { groupBy, collapsedGroups } = useTimelineState();
  const isGrouped = groupBy !== 'none' && groups.length > 0;

  return (
    <div className="w-[340px] bg-card border-r border-border flex flex-col shrink-0">
      {/* Header */}
      <div className="h-10 flex items-center justify-between px-4 border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-[12px] font-semibold text-foreground uppercase tracking-wide">
            Initiatives
          </span>
          <span
            className="text-[11px] font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full"
            style={{ fontVariantNumeric: 'tabular-nums' }}
          >
            {totalCount}
          </span>
        </div>
        <button className="w-7 h-7 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors">
          <ArrowUpDown className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Scrollable body */}
      <div ref={scrollRef as any} className="flex-1 overflow-y-auto min-h-0">
        {isLoading ? (
          <>
            {Array.from({ length: 5 }).map((_, i) => (
              <SkeletonRow key={i} />
            ))}
          </>
        ) : totalCount === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mb-3">
              <ArrowUpDown className="w-5 h-5 text-muted-foreground" />
            </div>
            <p className="text-[13px] font-medium text-foreground mb-1">No initiatives found</p>
            <p className="text-[12px] text-muted-foreground">Try adjusting your filters</p>
          </div>
        ) : isGrouped ? (
          groups.map(group => (
            <div key={group.name}>
              <TimelineGroupHeader name={group.name} count={group.count} />
              {!collapsedGroups.has(group.name) &&
                group.items.map(item => (
                  <TimelineLeftRow key={item.id} initiative={item} />
                ))
              }
            </div>
          ))
        ) : (
          initiatives.map(item => (
            <TimelineLeftRow key={item.id} initiative={item} />
          ))
        )}
      </div>
    </div>
  );
};

export default TimelineLeftPanel;

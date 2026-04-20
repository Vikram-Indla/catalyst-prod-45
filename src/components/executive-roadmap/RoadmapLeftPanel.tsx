// RoadmapLeftPanel.tsx — Sticky left panel with business request rows

import React from 'react';
import { cn } from '@/lib/utils';
import { Tooltip } from '@/components/ads';
import { ChevronUp, ChevronDown, Lock } from 'lucide-react';
import { BusinessRequestRoadmapItem, PLATFORM_INFO } from '@/types/roadmapTypes';
import { SortOrder, ROW_HEIGHT, HEADER_HEIGHT } from './roadmapConstants';
import { formatDisplayKey } from './roadmapTimeUtils';

interface RoadmapLeftPanelProps {
  leftPanelRef: React.RefObject<HTMLDivElement>;
  firstColumnWidth: number;
  filteredItems: BusinessRequestRoadmapItem[];
  selectedRow: string | null;
  setSelectedRow: (id: string | null) => void;
  hoveredItem: string | null;
  setHoveredItem: (id: string | null) => void;
  setSelectedRequestId: (id: string | null) => void;
  sortOrder: SortOrder;
  setSortOrder: (order: SortOrder) => void;
  isRTL: boolean;
  isResizing: boolean;
  handleResizeMouseDown: (e: React.MouseEvent) => void;
  t: { businessRequest: string; rank: string };
}

export function RoadmapLeftPanel({
  leftPanelRef,
  firstColumnWidth,
  filteredItems,
  selectedRow,
  setSelectedRow,
  hoveredItem,
  setHoveredItem,
  setSelectedRequestId,
  sortOrder,
  setSortOrder,
  isRTL,
  isResizing,
  handleResizeMouseDown,
  t,
}: RoadmapLeftPanelProps) {
  return (
    <div
      ref={leftPanelRef}
      className="shrink-0 flex flex-col border-r overflow-y-auto overflow-x-hidden"
      style={{
        width: firstColumnWidth,
        minWidth: firstColumnWidth,
        backgroundColor: 'white',
        borderColor: 'hsl(var(--roadmap-sandstone))',
        position: 'sticky',
        left: 0,
        zIndex: 15
      }}
    >
      {/* Left Panel Header */}
      <div
        className="flex items-center justify-between px-4 border-b relative shrink-0 sticky top-0 z-10"
        style={{
          backgroundColor: 'white',
          borderColor: 'hsl(var(--roadmap-sandstone))',
          height: `${HEADER_HEIGHT}px`,
          minHeight: `${HEADER_HEIGHT}px`
        }}
      >
        <span className="text-xs font-semibold tracking-wider" style={{ color: 'hsl(var(--roadmap-charcoal))' }}>
          {t.businessRequest}
        </span>
        <button
          onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
          className="flex items-center gap-1 text-[10px] font-medium hover:underline"
          style={{ color: 'hsl(var(--roadmap-status-new))' }}
        >
          {sortOrder === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          {t.rank}
        </button>
        {/* Resize Handle */}
        <div
          className={cn("absolute right-0 top-0 h-full w-1 cursor-col-resize z-20 transition-colors hover:bg-[hsl(var(--roadmap-status-new))]", isResizing && "bg-[hsl(var(--roadmap-status-new))]")}
          onMouseDown={handleResizeMouseDown}
          onClick={(e) => e.stopPropagation()}
        />
      </div>

      {/* Left Panel Rows */}
      {filteredItems.map((item) => {
        const isSelected = selectedRow === item.id;
        return (
          <div
            key={item.id}
            className={cn("border-b cursor-pointer transition-colors shrink-0")}
            style={{
              height: `${ROW_HEIGHT}px`,
              minHeight: `${ROW_HEIGHT}px`,
              borderColor: 'hsl(var(--roadmap-sandstone))',
              backgroundColor: isSelected ? 'hsla(var(--roadmap-status-new) / 0.08)' : hoveredItem === item.id ? 'hsla(var(--roadmap-status-new) / 0.04)' : 'white',
              borderLeft: isSelected ? '3px solid hsl(var(--roadmap-status-new))' : 'none'
            }}
            onClick={() => setSelectedRow(isSelected ? null : item.id)}
            onMouseEnter={() => setHoveredItem(item.id)}
            onMouseLeave={() => setHoveredItem(null)}
          >
            <div className="h-full px-4 py-2.5 flex flex-col justify-center overflow-hidden">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-xs font-bold shrink-0" style={{ color: 'hsl(var(--roadmap-charcoal))' }}>#{item.rank}</span>
                {(item.rank === 1 || item.rank === 3 || item.rank === 9) && (
                  <Lock className="h-3 w-3 shrink-0" style={{ color: 'hsl(var(--roadmap-status-new))' }} />
                )}
                <button
                  onClick={(e) => { e.stopPropagation(); setSelectedRequestId(item.id); }}
                  className="text-xs font-medium hover:underline cursor-pointer bg-transparent border-none p-0 shrink-0"
                  style={{ color: 'hsl(var(--roadmap-status-new))' }}
                >
                  {formatDisplayKey(item)}
                </button>
              </div>
              <Tooltip
                delay={300}
                position="top-start"
                content={
                  <>
                    <div className="font-semibold mb-1.5 text-xs uppercase tracking-wider" style={{ color: '#C5A86E' }}>
                      {formatDisplayKey(item)}
                    </div>
                    <div className="font-medium" style={{ color: 'white' }}>
                      {isRTL ? item.titleAr : item.titleEn}
                    </div>
                  </>
                }
              >
                <div className="text-sm font-medium truncate leading-tight mt-1 cursor-default" style={{ color: 'hsl(var(--roadmap-charcoal))' }}>
                  {isRTL ? item.titleAr : item.titleEn}
                </div>
              </Tooltip>
              <div className="text-[11px] mt-1 truncate" style={{ color: 'hsl(var(--roadmap-fossil))' }}>
                {isRTL ? item.ownerAr : item.ownerEn}
                <span className="mx-1.5">&middot;</span>
                <span style={{ color: 'hsl(var(--roadmap-status-new))' }}>{isRTL ? PLATFORM_INFO[item.platform]?.nameAr : item.platform}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

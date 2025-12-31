/**
 * Roadmap Timeline - Main timeline area
 */

import React, { forwardRef, useMemo } from 'react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import type { RoadmapGroup, RoadmapDependency, TimesliceMode, TimelineConfig } from '@/types/roadmap';
import { LAYOUT, MILESTONE_COLORS } from '@/types/roadmap';
import { generateTimeUnits, generateQuarters, dateToPosition } from '@/lib/roadmap-utils';
import { RoadmapBar } from './RoadmapBar';

interface RoadmapTimelineProps {
  groups: RoadmapGroup[];
  deps: RoadmapDependency[];
  collapsed: Set<string>;
  selected: string | null;
  editing: string | null;
  slice: TimesliceMode;
  zoom: number;
  timelineConfig: TimelineConfig;
  onSelect: (id: string | null) => void;
  onStartEdit: (id: string) => void;
  onFinishEdit: (id: string, newName: string) => void;
  onCancelEdit: () => void;
  onContextMenu: (e: React.MouseEvent, id: string) => void;
  onShowTooltip: (e: React.MouseEvent, id: string) => void;
  onHideTooltip: () => void;
}

export const RoadmapTimeline = forwardRef<HTMLDivElement, RoadmapTimelineProps>(({
  groups,
  deps,
  collapsed,
  selected,
  editing,
  slice,
  zoom,
  timelineConfig,
  onSelect,
  onStartEdit,
  onFinishEdit,
  onCancelEdit,
  onContextMenu,
  onShowTooltip,
  onHideTooltip,
}, ref) => {
  const quarters = useMemo(() => generateQuarters(timelineConfig), [timelineConfig]);
  const timeUnits = useMemo(() => generateTimeUnits(timelineConfig, slice), [timelineConfig, slice]);
  const todayPosition = useMemo(() => dateToPosition(timelineConfig.today, timelineConfig), [timelineConfig]);

  // Count total rows for grid height
  let rowIndex = 0;

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-surface-1 relative">
      {/* Header */}
      <div 
        className="bg-surface-0 border-b border-border shrink-0 flex flex-col overflow-hidden"
        style={{ height: LAYOUT.headerHeight }}
      >
        {/* Quarters row */}
        <div className="flex flex-1">
          {quarters.map((q, i) => (
            <div
              key={i}
              className={cn(
                "flex items-center justify-center text-[11px] font-semibold border-r",
                q.isPast 
                  ? "bg-brand-primary text-white border-white/10" 
                  : "bg-surface-1 text-text-secondary border-border"
              )}
              style={{ width: `${q.width}%` }}
            >
              {q.label}
            </div>
          ))}
        </div>

        {/* Months row */}
        <div className="flex h-[22px] border-t border-border">
          {timeUnits.map((unit, i) => (
            <div
              key={i}
              className={cn(
                "flex items-center justify-center text-[10px] border-r border-border relative",
                unit.isCurrent ? "text-brand-primary font-semibold" : "text-text-muted"
              )}
              style={{ width: `${unit.width}%` }}
            >
              {unit.label}
              {unit.isCurrent && (
                <span className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 bg-brand-primary text-white text-[8px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide z-50">
                  Today
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Body */}
      <div ref={ref} className="flex-1 overflow-auto relative">
        <div className="relative min-h-full" style={{ minWidth: `${zoom}%` }}>
          {/* Grid lines */}
          <div className="absolute inset-0 flex pointer-events-none">
            {timeUnits.map((unit, i) => (
              <div 
                key={i}
                className="border-r border-border opacity-50"
                style={{ width: `${unit.width}%` }}
              />
            ))}
          </div>

          {/* Today line */}
          <div 
            className="absolute top-0 bottom-0 w-0.5 bg-brand-primary opacity-40 z-40 pointer-events-none"
            style={{ left: `${todayPosition}%` }}
          />

          {/* Dependency lines */}
          <svg className="absolute inset-0 pointer-events-none z-10">
            {/* TODO: Implement dependency curves */}
          </svg>

          {/* Swimlanes */}
          <div className="relative z-20">
            {groups.map((group) => {
              const isCollapsed = collapsed.has(group.id);
              
              return (
                <div key={group.id}>
                  {/* Theme header in timeline */}
                  <div 
                    className="flex items-center gap-2 px-3 bg-surface-0 border-b border-border"
                    style={{ height: LAYOUT.themeHeight }}
                  >
                    <div 
                      className="w-[3px] h-3 rounded-sm"
                      style={{ backgroundColor: group.color }}
                    />
                    <span className="text-[10px] font-semibold text-text-muted uppercase tracking-wide">
                      {group.name}
                    </span>
                  </div>

                  {/* Objectives */}
                  {!isCollapsed && group.objs.map((obj, objIndex) => {
                    rowIndex++;
                    return (
                      <div
                        key={obj.id}
                        className={cn(
                          "relative border-b border-border transition-colors",
                          selected === obj.id ? "bg-brand-primary/5" : "hover:bg-surface-0/50"
                        )}
                        style={{ 
                          height: LAYOUT.rowHeight,
                          animationDelay: `${rowIndex * 30}ms`,
                        }}
                      >
                        <RoadmapBar
                          objective={obj}
                          timelineConfig={timelineConfig}
                          isSelected={selected === obj.id}
                          isEditing={editing === obj.id}
                          animationDelay={objIndex * 50}
                          zoom={zoom}
                          onSelect={() => onSelect(selected === obj.id ? null : obj.id)}
                          onDoubleClick={() => onStartEdit(obj.id)}
                          onFinishEdit={(name) => onFinishEdit(obj.id, name)}
                          onCancelEdit={onCancelEdit}
                          onContextMenu={(e) => onContextMenu(e, obj.id)}
                          onMouseEnter={(e) => onShowTooltip(e, obj.id)}
                          onMouseLeave={onHideTooltip}
                        />
                      </div>
                    );
                  })}

                  {/* Milestones */}
                  {!isCollapsed && group.ms?.map((ms) => (
                    <div
                      key={ms.id}
                      className="absolute w-3.5 h-3.5 rotate-45 rounded-sm cursor-pointer z-30 shadow-sm hover:scale-110 transition-transform"
                      style={{ 
                        left: `${dateToPosition(ms.date, timelineConfig)}%`,
                        top: LAYOUT.themeHeight + 9,
                        backgroundColor: MILESTONE_COLORS[ms.type],
                      }}
                      title={`${ms.name} - ${format(new Date(ms.date), 'MMM d, yyyy')}`}
                    />
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
});

RoadmapTimeline.displayName = 'RoadmapTimeline';

import React, { forwardRef, useMemo, useRef, useEffect, useImperativeHandle } from 'react';
import { ObjectiveGroup, GroupBy, Scale, Objective, KeyResult } from '@/types/objective-roadmap';
import { generateTimeUnits, calcPosition } from '@/utils/objective-roadmap-utils';
import { cn } from '@/lib/utils';
import { getKRStatusStyle } from '@/constants/krStatusStyles';

interface TimelineAreaProps {
  groups: ObjectiveGroup[];
  groupBy: GroupBy;
  collapsedGroups: Set<string>;
  scale: Scale;
  showMilestones: boolean;
  timelineStart: Date;
  timelineEnd: Date;
  onObjectiveClick: (objectiveId: string) => void;
}

export interface TimelineAreaRef {
  scrollToToday: () => void;
}

// Fixed row heights for perfect sync with ObjectivesColumn
const GROUP_ROW_HEIGHT = 40; // h-10 - matches ObjectivesColumn
const OBJECTIVE_ROW_HEIGHT = 48; // h-12 - matches ObjectivesColumn

export const TimelineArea = forwardRef<HTMLDivElement, TimelineAreaProps>(
  ({ groups, groupBy, collapsedGroups, scale, showMilestones, timelineStart, timelineEnd, onObjectiveClick }, ref) => {
    const headerRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);
    
    const timeUnits = useMemo(() => 
      generateTimeUnits(scale, timelineStart, timelineEnd), 
      [scale, timelineStart, timelineEnd]
    );
    
    const todayPosition = useMemo(() => 
      calcPosition(new Date(), timelineStart, timelineEnd),
      [timelineStart, timelineEnd]
    );

    // Calculate total content height (for grid lines to stop at last row)
    const totalContentHeight = useMemo(() => {
      let height = 0;
      groups.forEach(group => {
        if (groupBy !== 'none') {
          height += GROUP_ROW_HEIGHT;
        }
        if (!collapsedGroups.has(group.key)) {
          height += group.items.length * OBJECTIVE_ROW_HEIGHT;
        }
      });
      return height;
    }, [groups, groupBy, collapsedGroups]);

    // Sync horizontal scroll between header and content
    useEffect(() => {
      const content = contentRef.current;
      const header = headerRef.current;
      if (!content || !header) return;

      const syncHeaderFromContent = () => {
        if (header) header.scrollLeft = content.scrollLeft;
      };

      content.addEventListener('scroll', syncHeaderFromContent);
      return () => content.removeEventListener('scroll', syncHeaderFromContent);
    }, []);

    // Forward ref to content for vertical scroll sync with objectives column
    useImperativeHandle(ref, () => contentRef.current as HTMLDivElement);
    
    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Timeline Header - responsive width */}
        <div 
          ref={headerRef}
          className="h-10 flex items-center border-b border-border bg-muted/50 overflow-x-hidden relative"
        >
          {/* TODAY badge in header (always visible, not clipped) */}
          {todayPosition >= 0 && todayPosition <= 100 && (
            <div 
              className="absolute top-1/2 -translate-y-1/2 z-20"
              style={{ left: `${todayPosition}%` }}
            >
              <span 
                className="px-1.5 py-0.5 text-[9px] font-semibold text-white rounded whitespace-nowrap"
                style={{ backgroundColor: '#8b7355' }}
              >
                TODAY
              </span>
            </div>
          )}
          <div className="flex w-full">
            {timeUnits.map((unit, i) => (
              <div 
                key={i} 
                className={cn(
                  "flex-1 min-w-[80px] px-2 text-[11px] font-medium text-center",
                  unit.isCurrent ? "text-brand-gold font-semibold" : "text-muted-foreground"
                )}
              >
                {unit.label}
              </div>
            ))}
          </div>
        </div>
        
        {/* Timeline Grid - responsive width, scrolls vertically only */}
        <div ref={contentRef} className="flex-1 overflow-auto">
          <div className="relative w-full" style={{ minHeight: `${totalContentHeight}px` }}>
            {/* Grid Lines - stop at last row */}
            <div 
              className="absolute top-0 left-0 right-0 flex pointer-events-none"
              style={{ height: `${totalContentHeight}px` }}
            >
              {timeUnits.map((_, i) => (
                <div 
                  key={i} 
                  className="flex-1 min-w-[80px] border-r border-border/30"
                />
              ))}
            </div>
            
            {/* Today Line - Bronze (grid height only) */}
            {todayPosition >= 0 && todayPosition <= 100 && (
              <div 
                className="absolute top-0 w-px z-10"
                style={{ 
                  left: `${todayPosition}%`, 
                  height: `${totalContentHeight}px`,
                  backgroundColor: '#8b7355' 
                }}
              />
            )}
            
            {/* Rows */}
            {groups.map(group => {
              const isCollapsed = collapsedGroups.has(group.key);
              
              return (
                <React.Fragment key={group.key}>
                  {/* Group Header Row - exact height match */}
                  {groupBy !== 'none' && (
                    <div 
                      className="border-b border-border bg-muted/30"
                      style={{ height: `${GROUP_ROW_HEIGHT}px` }}
                    />
                  )}
                  
                  {/* Objective Rows - exact height match */}
                  {!isCollapsed && group.items.map(obj => (
                    <TimelineRow
                      key={obj.id}
                      objective={obj}
                      showMilestones={showMilestones}
                      timelineStart={timelineStart}
                      timelineEnd={timelineEnd}
                      onClick={() => onObjectiveClick(obj.id)}
                      rowHeight={OBJECTIVE_ROW_HEIGHT}
                    />
                  ))}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </div>
    );
  }
);

TimelineArea.displayName = 'TimelineArea';

interface TimelineRowProps {
  objective: Objective;
  showMilestones: boolean;
  timelineStart: Date;
  timelineEnd: Date;
  onClick: () => void;
  rowHeight: number;
}

const TimelineRow: React.FC<TimelineRowProps> = ({
  objective,
  showMilestones,
  timelineStart,
  timelineEnd,
  onClick,
  rowHeight,
}) => {
  const barLeft = calcPosition(objective.startDate, timelineStart, timelineEnd);
  const barRight = calcPosition(objective.endDate, timelineStart, timelineEnd);
  const barWidth = Math.max(barRight - barLeft, 2);
  
  return (
    <div 
      className="relative border-b border-border hover:bg-muted/20 group/row cursor-pointer"
      style={{ height: `${rowHeight}px` }}
      onClick={onClick}
    >
      {/* Progress Bar */}
      <div 
        className="absolute top-1/2 -translate-y-1/2 h-1 rounded-full overflow-hidden"
        style={{ 
          left: `${barLeft}%`, 
          width: `${barWidth}%`,
          background: '#E5E7EB',
          minWidth: '24px'
        }}
      >
        {/* Progress Fill - Gold */}
        <div 
          className="absolute inset-y-0 left-0 rounded-full bg-brand-gold transition-all"
          style={{ width: `${objective.progress}%` }}
        />
      </div>
      
      {/* KR Markers - NO individual tooltips */}
      {showMilestones && objective.keyResults.length > 0 && objective.keyResults.map((kr, index) => (
        <KRMarker
          key={kr.id}
          keyResult={kr}
          index={index}
          totalKRs={objective.keyResults.length}
          objectiveStart={objective.startDate}
          objectiveEnd={objective.endDate}
          barLeft={barLeft}
          barWidth={barWidth}
        />
      ))}
      
      {/* UNIFIED TOOLTIP - One tooltip per row with all information */}
      <div 
        className="absolute top-full left-0 mt-1 px-3 py-2.5 bg-popover border border-border rounded-lg shadow-xl opacity-0 group-hover/row:opacity-100 transition-opacity pointer-events-none z-[100] min-w-[220px] max-w-[320px]"
        style={{ left: `${Math.max(0, Math.min(barLeft, 70))}%` }}
      >
        {/* Objective Name */}
        <div className="text-xs font-semibold text-foreground mb-1 leading-tight">
          {objective.name}
        </div>
        
        {/* Date Range */}
        <div className="text-[10px] text-muted-foreground mb-2">
          {objective.startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} → {objective.endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </div>
        
        {/* Progress Bar Visual */}
        <div className="flex items-center gap-2 mb-2">
          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-brand-gold rounded-full"
              style={{ width: `${objective.progress}%` }}
            />
          </div>
          <span className="text-[10px] font-semibold text-brand-gold">{objective.progress}%</span>
        </div>
        
        {/* Key Results Section */}
        {objective.keyResults.length > 0 && (
          <div className="border-t border-border/50 pt-2 mt-1">
            <div className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
              Key Results ({objective.keyResults.length})
            </div>
            <div className="space-y-1">
              {objective.keyResults.slice(0, 4).map(kr => {
                const statusStyle = getKRStatusStyle(kr.status);
                return (
                  <div key={kr.id} className="flex items-center gap-2 text-[10px]">
                    <div 
                      className="w-2 h-2 rotate-45 flex-shrink-0"
                      style={{ 
                        background: statusStyle.filled ? statusStyle.color : '#ffffff',
                        border: `1.5px solid ${statusStyle.color}`
                      }}
                    />
                    <span className="flex-1 truncate text-foreground">{kr.title}</span>
                    <span className="text-muted-foreground flex-shrink-0">{kr.progress}%</span>
                  </div>
                );
              })}
              {objective.keyResults.length > 4 && (
                <div className="text-[9px] text-muted-foreground">
                  +{objective.keyResults.length - 4} more
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

interface KRMarkerProps {
  keyResult: KeyResult;
  index: number;
  totalKRs: number;
  objectiveStart: Date;
  objectiveEnd: Date;
  barLeft: number;
  barWidth: number;
}

// KR Marker - visual only, NO tooltip (tooltip is unified at row level)
const KRMarker: React.FC<KRMarkerProps> = ({
  keyResult,
  index,
  totalKRs,
  objectiveStart,
  objectiveEnd,
  barLeft,
  barWidth,
}) => {
  const absolutePosition = useMemo(() => {
    const dueTime = keyResult.dueDate.getTime();
    const startTime = objectiveStart.getTime();
    const endTime = objectiveEnd.getTime();
    
    let relativePosition: number;
    if (dueTime >= startTime && dueTime <= endTime) {
      const barDuration = endTime - startTime;
      const krPosition = dueTime - startTime;
      relativePosition = Math.max(5, Math.min(95, (krPosition / barDuration) * 100));
    } else {
      const spacing = 90 / (totalKRs + 1);
      relativePosition = 5 + spacing * (index + 1);
    }
    
    return barLeft + (relativePosition / 100) * barWidth;
  }, [keyResult.dueDate, objectiveStart, objectiveEnd, index, totalKRs, barLeft, barWidth]);
  
  const statusStyle = getKRStatusStyle(keyResult.status);
  
  // Visual marker only - no tooltip
  return (
    <div 
      className="absolute top-1/2 w-2.5 h-2.5 rotate-45 border z-10 pointer-events-none"
      style={{ 
        left: `${absolutePosition}%`,
        transform: 'translateY(-50%) rotate(45deg)',
        background: statusStyle.filled ? statusStyle.color : '#ffffff',
        borderColor: statusStyle.color,
        borderWidth: '1.5px'
      }}
    />
  );
};

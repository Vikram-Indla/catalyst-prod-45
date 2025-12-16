import React, { forwardRef, useMemo, useRef, useEffect, useImperativeHandle } from 'react';
import { ObjectiveGroup, GroupBy, Scale, Objective, KeyResult } from '@/types/objective-roadmap';
import { generateTimeUnits, calcPosition, formatShortDate } from '@/utils/objective-roadmap-utils';
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
        {/* Timeline Header - syncs horizontally with content */}
        <div 
          ref={headerRef}
          className="h-10 flex items-center border-b border-border bg-muted/50 overflow-x-hidden"
        >
          <div 
            className="flex min-w-max"
            style={{ width: `${timeUnits.length * 120}px` }}
          >
            {timeUnits.map((unit, i) => (
              <div 
                key={i} 
                className={cn(
                  "flex-shrink-0 w-[120px] px-2 text-[11px] font-medium text-center",
                  unit.isCurrent ? "text-brand-gold font-semibold" : "text-muted-foreground"
                )}
              >
                {unit.label}
              </div>
            ))}
          </div>
        </div>
        
        {/* Timeline Grid - scrolls both horizontally and vertically */}
        <div ref={contentRef} className="flex-1 overflow-auto">
          <div 
            className="relative min-w-max"
            style={{ width: `${timeUnits.length * 120}px` }}
          >
            {/* Grid Lines */}
            <div className="absolute inset-0 flex pointer-events-none">
              {timeUnits.map((_, i) => (
                <div 
                  key={i} 
                  className="flex-shrink-0 w-[120px] border-r border-border/30"
                />
              ))}
            </div>
            
            {/* Today Line - Bronze */}
            <div 
              className="absolute top-0 bottom-0 w-px z-10"
              style={{ left: `${todayPosition}%`, backgroundColor: '#8b7355' }}
            >
              <span 
                className="absolute top-0 left-1/2 -translate-x-1/2 px-1.5 py-0.5 text-[9px] font-semibold text-white rounded"
                style={{ backgroundColor: '#8b7355' }}
              >
                TODAY
              </span>
            </div>
            
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
  
  // Compact timeline bar: 4px thin progress line (CIO-grade)
  return (
    <div 
      className="relative border-b border-border hover:bg-muted/20 group/bar"
      style={{ height: `${rowHeight}px` }}
    >
      <div 
        className="absolute top-1/2 -translate-y-1/2 h-1 rounded-full cursor-pointer overflow-hidden"
        style={{ 
          left: `${barLeft}%`, 
          width: `${barWidth}%`,
          background: '#E5E7EB',
          minWidth: '24px'
        }}
        onClick={onClick}
      >
        {/* Progress Fill - Gold */}
        <div 
          className="absolute inset-y-0 left-0 rounded-full bg-brand-gold transition-all"
          style={{ width: `${objective.progress}%` }}
        />
      </div>
      
      {/* KR Markers positioned on the bar */}
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
      
      {/* Tooltip */}
      <div 
        className="absolute bottom-0 translate-y-full mt-1 px-3 py-2 bg-popover border border-border rounded-lg shadow-xl opacity-0 group-hover/bar:opacity-100 transition-opacity pointer-events-none z-[100]"
        style={{ left: `${barLeft}%` }}
      >
        <div className="text-xs font-semibold text-foreground mb-0.5">{objective.name}</div>
        <div className="text-[10px] text-muted-foreground mb-1">
          {objective.startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} → {objective.endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </div>
        <div className="flex items-center gap-2 text-[10px]">
          <span className="text-brand-gold font-medium">{objective.progress}%</span>
          <span className="text-muted-foreground">{objective.keyResults.length} KRs</span>
        </div>
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

const KRMarker: React.FC<KRMarkerProps> = ({
  keyResult,
  index,
  totalKRs,
  objectiveStart,
  objectiveEnd,
  barLeft,
  barWidth,
}) => {
  // Calculate position within the bar
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
      // Distribute evenly if no valid due date
      const spacing = 90 / (totalKRs + 1);
      relativePosition = 5 + spacing * (index + 1);
    }
    
    // Convert relative bar position to absolute timeline position
    return barLeft + (relativePosition / 100) * barWidth;
  }, [keyResult.dueDate, objectiveStart, objectiveEnd, index, totalKRs, barLeft, barWidth]);
  
  const statusStyle = getKRStatusStyle(keyResult.status);
  
  return (
    <div 
      className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rotate-45 border z-10 group/kr cursor-pointer"
      style={{ 
        left: `${absolutePosition}%`,
        transform: 'translateY(-50%) rotate(45deg)',
        background: statusStyle.filled ? statusStyle.color : '#ffffff',
        borderColor: statusStyle.color,
        borderWidth: '1.5px'
      }}
    >
      {/* Tooltip */}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1.5 bg-popover border border-border rounded shadow-xl opacity-0 group-hover/kr:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-[100] -rotate-45">
        <div className="text-[9px] font-semibold text-brand-gold uppercase tracking-wide mb-0.5">Key Result</div>
        <div className="text-[10px] font-medium text-foreground max-w-[180px] truncate">{keyResult.title}</div>
        <div className="text-[9px] text-muted-foreground mt-0.5">
          <span className="text-brand-gold font-medium">{keyResult.progress}%</span> complete
        </div>
      </div>
    </div>
  );
};

import React, { forwardRef, useMemo } from 'react';
import { ObjectiveGroup, GroupBy, Scale, Objective, KeyResult } from '@/types/objective-roadmap';
import { generateTimeUnits, calcPosition, formatShortDate } from '@/utils/objective-roadmap-utils';
import { cn } from '@/lib/utils';

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

export const TimelineArea = forwardRef<HTMLDivElement, TimelineAreaProps>(
  ({ groups, groupBy, collapsedGroups, scale, showMilestones, timelineStart, timelineEnd, onObjectiveClick }, ref) => {
    const timeUnits = useMemo(() => 
      generateTimeUnits(scale, timelineStart, timelineEnd), 
      [scale, timelineStart, timelineEnd]
    );
    
    const todayPosition = useMemo(() => 
      calcPosition(new Date(), timelineStart, timelineEnd),
      [timelineStart, timelineEnd]
    );
    
    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Timeline Header */}
        <div className="h-10 flex items-center border-b border-border bg-muted/50 overflow-x-auto">
          <div 
            className="flex min-w-max"
            style={{ width: `${timeUnits.length * 120}px` }}
          >
            {timeUnits.map((unit, i) => (
              <div 
                key={i} 
                className={cn(
                  "flex-shrink-0 w-[120px] px-3 text-xs font-medium text-center",
                  unit.isCurrent ? "text-brand-gold font-semibold" : "text-muted-foreground"
                )}
              >
                {unit.label}
              </div>
            ))}
          </div>
        </div>
        
        {/* Timeline Grid */}
        <div className="flex-1 overflow-auto" ref={ref}>
          <div 
            className="relative min-w-max"
            style={{ width: `${timeUnits.length * 120}px` }}
          >
            {/* Grid Lines */}
            <div className="absolute inset-0 flex pointer-events-none">
              {timeUnits.map((_, i) => (
                <div 
                  key={i} 
                  className="flex-shrink-0 w-[120px] border-r border-border/50"
                />
              ))}
            </div>
            
            {/* Today Line */}
            <div 
              className="absolute top-0 bottom-0 w-px bg-brand-gold z-10"
              style={{ left: `${todayPosition}%` }}
            >
              <span className="absolute -top-0 left-1/2 -translate-x-1/2 px-1.5 py-0.5 text-[10px] font-semibold text-white bg-brand-gold rounded">
                TODAY
              </span>
            </div>
            
            {/* Rows */}
            {groups.map(group => {
              const isCollapsed = collapsedGroups.has(group.key);
              
              return (
                <React.Fragment key={group.key}>
                  {/* Group Header Row */}
                  {groupBy !== 'none' && (
                    <div className="h-14 border-b border-border bg-muted/30" />
                  )}
                  
                  {/* Objective Rows */}
                  {!isCollapsed && group.items.map(obj => (
                    <TimelineRow
                      key={obj.id}
                      objective={obj}
                      showMilestones={showMilestones}
                      timelineStart={timelineStart}
                      timelineEnd={timelineEnd}
                      onClick={() => onObjectiveClick(obj.id)}
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
}

const TimelineRow: React.FC<TimelineRowProps> = ({
  objective,
  showMilestones,
  timelineStart,
  timelineEnd,
  onClick,
}) => {
  const barLeft = calcPosition(objective.startDate, timelineStart, timelineEnd);
  const barRight = calcPosition(objective.endDate, timelineStart, timelineEnd);
  const barWidth = Math.max(barRight - barLeft, 2);
  
  // Timeline bar: Grey track with gold fill (rounded ends)
  return (
    <div className="relative h-[76px] border-b border-border hover:bg-muted/20">
      <div 
        className="absolute top-1/2 -translate-y-1/2 h-6 rounded-full cursor-pointer group overflow-hidden"
        style={{ 
          left: `${barLeft}%`, 
          width: `${barWidth}%`,
          background: '#C8CCD0',
          minWidth: '40px'
        }}
        onClick={onClick}
      >
        {/* Progress Fill - Gold with rounded ends */}
        <div 
          className="absolute inset-y-0 left-0 rounded-full bg-brand-gold transition-all"
          style={{ width: `${objective.progress}%` }}
        />
        
        {/* Bar Content */}
        <div className="relative h-full flex items-center px-2">
          {/* KR Markers or Count */}
          {showMilestones ? (
            objective.keyResults.map((kr) => (
              <KRMarker
                key={kr.id}
                keyResult={kr}
                objectiveStart={objective.startDate}
                objectiveEnd={objective.endDate}
                statusColor="#c69c6d"
              />
            ))
          ) : (
            <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">
              {objective.keyResults.length} KRs
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

interface KRMarkerProps {
  keyResult: KeyResult;
  objectiveStart: Date;
  objectiveEnd: Date;
  statusColor: string;
}

const KRMarker: React.FC<KRMarkerProps> = ({
  keyResult,
  objectiveStart,
  objectiveEnd,
  statusColor,
}) => {
  const position = useMemo(() => {
    const barDuration = objectiveEnd.getTime() - objectiveStart.getTime();
    const krPosition = keyResult.dueDate.getTime() - objectiveStart.getTime();
    return Math.max(5, Math.min(95, (krPosition / barDuration) * 100));
  }, [keyResult.dueDate, objectiveStart, objectiveEnd]);
  
  const getKRColor = (status: string) => {
    switch (status) {
      case 'complete': return '#059669';
      case 'overdue': return '#DC2626';
      case 'in-progress': return statusColor;
      default: return '#6B7280';
    }
  };
  
  const krColor = getKRColor(keyResult.status);
  
  return (
    <div 
      className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rotate-45 border-2 border-white z-10 group/kr cursor-pointer"
      style={{ 
        left: `${position}%`,
        background: keyResult.status === 'complete' ? krColor : 'transparent',
        borderColor: krColor
      }}
    >
      {/* Tooltip */}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-popover border border-border rounded-lg shadow-lg opacity-0 group-hover/kr:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 rotate-[-45deg]">
        <div className="text-[10px] font-medium text-muted-foreground mb-1">Key Result</div>
        <div className="text-xs font-medium mb-1 max-w-[200px] truncate">{keyResult.title}</div>
        <div className="text-[10px] text-muted-foreground">
          Due: {formatShortDate(keyResult.dueDate)} • {keyResult.progress}%
        </div>
      </div>
    </div>
  );
};

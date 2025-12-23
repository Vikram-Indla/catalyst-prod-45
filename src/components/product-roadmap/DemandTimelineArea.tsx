import React, { forwardRef, useMemo, useRef, useEffect, useImperativeHandle, useState } from 'react';
import { Demand, Scale, DemandMilestone, DEMAND_STATUS_CONFIG } from '@/types/product-roadmap';
import { generateTimeUnits, calcPosition } from '@/utils/objective-roadmap-utils';
import { cn } from '@/lib/utils';
import { TODAY_LINE_COLOR, getKRStatusStyle } from '@/constants/krStatusStyles';
import { DemandGroupBy } from './ProductRoadmapToolbar';
import { ChevronDown } from 'lucide-react';

interface DemandGroup {
  key: string;
  label: string;
  demands: Demand[];
}

interface DemandTimelineAreaProps {
  demands: Demand[];
  groups: DemandGroup[];
  groupBy: DemandGroupBy;
  scale: Scale;
  showMilestones: boolean;
  timelineStart: Date;
  timelineEnd: Date;
  onDemandClick: (demandId: string) => void;
}

// Matching Program density: 56px row height, 44px group header
const DEMAND_ROW_HEIGHT = 56;
const GROUP_HEADER_HEIGHT = 44;

export const DemandTimelineArea = forwardRef<HTMLDivElement, DemandTimelineAreaProps>(
  ({ demands, groups, groupBy, scale, showMilestones, timelineStart, timelineEnd, onDemandClick }, ref) => {
    const headerRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);
    const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
    
    const toggleGroup = (key: string) => {
      setCollapsedGroups(prev => {
        const next = new Set(prev);
        if (next.has(key)) {
          next.delete(key);
        } else {
          next.add(key);
        }
        return next;
      });
    };
    
    const timeUnits = useMemo(() => 
      generateTimeUnits(scale, timelineStart, timelineEnd), 
      [scale, timelineStart, timelineEnd]
    );
    
    const todayPosition = useMemo(() => 
      calcPosition(new Date(), timelineStart, timelineEnd),
      [timelineStart, timelineEnd]
    );

    // Calculate total content height
    const totalContentHeight = useMemo(() => {
      if (groupBy === 'none') {
        return demands.length * DEMAND_ROW_HEIGHT;
      }
      // Account for group headers and collapsed groups
      let height = 0;
      groups.forEach(group => {
        height += GROUP_HEADER_HEIGHT;
        if (!collapsedGroups.has(group.key)) {
          height += group.demands.length * DEMAND_ROW_HEIGHT;
        }
      });
      return height;
    }, [demands.length, groups, groupBy, collapsedGroups]);

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

    // Forward ref for vertical scroll sync
    useImperativeHandle(ref, () => contentRef.current as HTMLDivElement);
    
    // Find which quarter contains today for the TODAY badge
    const getTodayQuarterIndex = () => {
      const today = new Date();
      for (let i = 0; i < timeUnits.length; i++) {
        const unit = timeUnits[i];
        // Check if today falls within this unit's timespan
        if (unit.isCurrent) {
          return i;
        }
      }
      return -1;
    };
    
    const todayQuarterIndex = getTodayQuarterIndex();
    
    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Timeline Header - Q1 2025 format with TODAY badge */}
        <div 
          ref={headerRef}
          className="h-10 flex border-b border-border bg-background overflow-x-hidden relative"
        >
          <div className="flex w-full">
            {timeUnits.map((unit, i) => {
              const isTodayQuarter = i === todayQuarterIndex;
              
              return (
                <div 
                  key={i} 
                  className={cn(
                    "flex-1 min-w-[120px] flex items-center justify-center text-xs font-medium relative",
                    i < timeUnits.length - 1 && "border-r border-border",
                    unit.isCurrent ? "text-foreground" : "text-muted-foreground"
                  )}
                >
                  {unit.label}
                  
                  {/* TODAY Badge - positioned within the quarter header */}
                  {isTodayQuarter && (
                    <div
                      className="absolute top-1.5 bg-secondary-bronze text-white text-[9px] font-semibold px-1.5 py-0.5 rounded uppercase tracking-wider z-10"
                      style={{ 
                        left: '50%',
                        transform: 'translateX(-50%)'
                      }}
                    >
                      TODAY
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        
        {/* Timeline Grid */}
        <div ref={contentRef} className="flex-1 overflow-auto">
          <div className="relative w-full" style={{ minHeight: `${totalContentHeight}px` }}>
            {/* Grid Lines */}
            <div 
              className="absolute top-0 left-0 right-0 flex pointer-events-none"
              style={{ height: `${totalContentHeight}px` }}
            >
              {timeUnits.map((_, i) => (
                <div 
                  key={i} 
                  className={cn(
                    "flex-1 min-w-[120px]",
                    i < timeUnits.length - 1 && "border-r border-border"
                  )}
                />
              ))}
            </div>
            
            {/* Today Line - Bronze, matching Program */}
            {todayPosition >= 0 && todayPosition <= 100 && (
              <div 
                className="absolute top-0 w-0.5 z-10"
                style={{ 
                  left: `${todayPosition}%`, 
                  height: `${totalContentHeight}px`,
                  backgroundColor: TODAY_LINE_COLOR 
                }}
              />
            )}
            
            {/* Demand Rows */}
            {groupBy === 'none' ? (
              // Flat list
              demands.map(demand => (
                <DemandTimelineRow
                  key={demand.id}
                  demand={demand}
                  showMilestones={showMilestones}
                  timelineStart={timelineStart}
                  timelineEnd={timelineEnd}
                  onClick={() => onDemandClick(demand.id)}
                  rowHeight={DEMAND_ROW_HEIGHT}
                />
              ))
            ) : (
              // Grouped list with collapsible groups
              groups.map(group => {
                const isCollapsed = collapsedGroups.has(group.key);
                
                return (
                  <React.Fragment key={group.key}>
                    {/* Group Header Row */}
                    <div
                      onClick={() => toggleGroup(group.key)}
                      className="flex items-center bg-muted/50 border-b border-border cursor-pointer hover:bg-muted"
                      style={{ height: `${GROUP_HEADER_HEIGHT}px` }}
                    >
                      <div className="flex items-center gap-2 px-4">
                        <div className={cn(
                          "w-5 h-5 flex items-center justify-center text-muted-foreground text-xs transition-transform",
                          isCollapsed && "-rotate-90"
                        )}>
                          <ChevronDown size={14} />
                        </div>
                        <span className="text-xs font-semibold text-foreground uppercase tracking-wide">
                          {group.label}
                        </span>
                        <span className="text-xs text-muted-foreground">({group.demands.length})</span>
                      </div>
                    </div>
                    
                    {/* Group's demands */}
                    {!isCollapsed && group.demands.map(demand => (
                      <DemandTimelineRow
                        key={demand.id}
                        demand={demand}
                        showMilestones={showMilestones}
                        timelineStart={timelineStart}
                        timelineEnd={timelineEnd}
                        onClick={() => onDemandClick(demand.id)}
                        rowHeight={DEMAND_ROW_HEIGHT}
                      />
                    ))}
                  </React.Fragment>
                );
              })
            )}
          </div>
        </div>
      </div>
    );
  }
);

DemandTimelineArea.displayName = 'DemandTimelineArea';

interface DemandTimelineRowProps {
  demand: Demand;
  showMilestones: boolean;
  timelineStart: Date;
  timelineEnd: Date;
  onClick: () => void;
  rowHeight: number;
}

const DemandTimelineRow: React.FC<DemandTimelineRowProps> = ({
  demand,
  showMilestones,
  timelineStart,
  timelineEnd,
  onClick,
  rowHeight,
}) => {
  const barLeft = calcPosition(demand.startDate, timelineStart, timelineEnd);
  const barRight = calcPosition(demand.endDate, timelineStart, timelineEnd);
  const barWidth = Math.max(barRight - barLeft, 2);
  
  // Get status config for bar color
  const statusConfig = DEMAND_STATUS_CONFIG.find(s => s.key === demand.status);
  const barColor = statusConfig?.color || 'hsl(var(--brand-primary))';
  
  return (
    <div 
      className="relative border-b border-border hover:bg-muted bg-background cursor-pointer"
      style={{ height: `${rowHeight}px` }}
      onClick={onClick}
    >
      {/* Timeline Bar - matching Program: thin track with progress fill */}
      <div 
        className="absolute top-1/2 -translate-y-1/2 h-1.5"
        style={{ 
          left: `${barLeft}%`, 
          width: `${barWidth}%`,
          minWidth: '40px'
        }}
      >
        {/* Track */}
        <div className="absolute inset-0 bg-brand-primary/20 rounded-sm" />
        {/* Progress Fill */}
        <div
          className="absolute left-0 top-0 h-full bg-brand-primary rounded-sm"
          style={{ width: `${demand.progress}%` }}
        />
      </div>
      
      {/* Milestone Markers - Diamond shapes matching Program */}
      {showMilestones && demand.milestones.length > 0 && demand.milestones.map((milestone, index) => (
        <MilestoneMarker
          key={milestone.id}
          milestone={milestone}
          index={index}
          totalMilestones={demand.milestones.length}
          demandStart={demand.startDate}
          demandEnd={demand.endDate}
          barLeft={barLeft}
          barWidth={barWidth}
        />
      ))}
    </div>
  );
};

interface MilestoneMarkerProps {
  milestone: DemandMilestone;
  index: number;
  totalMilestones: number;
  demandStart: Date;
  demandEnd: Date;
  barLeft: number;
  barWidth: number;
}

// Milestone Diamond Marker - matching Program styling
const MilestoneMarker: React.FC<MilestoneMarkerProps> = ({
  milestone,
  index,
  totalMilestones,
  demandStart,
  demandEnd,
  barLeft,
  barWidth,
}) => {
  const absolutePosition = useMemo(() => {
    const milestoneTime = milestone.date.getTime();
    const startTime = demandStart.getTime();
    const endTime = demandEnd.getTime();
    
    let relativePosition: number;
    if (milestoneTime >= startTime && milestoneTime <= endTime) {
      const barDuration = endTime - startTime;
      const msPosition = milestoneTime - startTime;
      relativePosition = Math.max(5, Math.min(95, (msPosition / barDuration) * 100));
    } else {
      const spacing = 90 / (totalMilestones + 1);
      relativePosition = 5 + spacing * (index + 1);
    }
    
    return barLeft + (relativePosition / 100) * barWidth;
  }, [milestone.date, demandStart, demandEnd, index, totalMilestones, barLeft, barWidth]);
  
  const statusStyle = getKRStatusStyle(milestone.status);
  
  return (
    <div 
      className="absolute top-1/2 w-2.5 h-2.5 rotate-45 border-2 z-[3] pointer-events-none"
      style={{ 
        left: `${absolutePosition}%`,
        transform: 'translateY(-50%) rotate(45deg)',
        background: statusStyle.filled ? statusStyle.color : 'white',
        borderColor: statusStyle.color
      }}
    />
  );
};
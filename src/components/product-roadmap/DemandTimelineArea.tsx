import React, { forwardRef, useMemo, useRef, useEffect, useImperativeHandle, useState } from 'react';
import { Demand, Scale, DemandMilestone } from '@/types/product-roadmap';
import { generateTimeUnits, calcPosition } from '@/utils/objective-roadmap-utils';
import { cn } from '@/lib/utils';
import { TODAY_LINE_COLOR, getKRStatusStyle } from '@/constants/krStatusStyles';
import { DemandGroupBy } from './ProductRoadmapToolbar';
import { ChevronDown } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { format } from 'date-fns';
import { useProcessSteps } from '@/modules/kanban/hooks/useProcessSteps';

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
    
    // Fetch dynamic process steps from database
    const { data: processSteps = [] } = useProcessSteps();
    
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

// Status-based color mapping for progress bars
const STATUS_COLORS: Record<string, string> = {
  new: 'hsl(210, 40%, 50%)',                   // Blue
  new_request: 'hsl(210, 40%, 50%)',           // Blue
  new_demand: 'hsl(210, 40%, 50%)',            // Blue
  analyse: 'hsl(45, 85%, 50%)',                // Yellow/Amber
  in_review: 'hsl(45, 85%, 50%)',              // Yellow/Amber
  ea_review: 'hsl(280, 50%, 55%)',             // Purple
  approved: 'hsl(160, 60%, 45%)',              // Teal
  ready_to_implement: 'hsl(160, 70%, 42%)',    // Teal-Green
  implement: 'hsl(120, 40%, 50%)',             // Green
  implementing: 'hsl(120, 40%, 50%)',          // Green
  done: 'hsl(120, 45%, 40%)',                  // Dark Green
  closed: 'hsl(120, 45%, 40%)',                // Dark Green
  rejected: 'hsl(0, 60%, 50%)',                // Red
  on_hold: 'hsl(30, 70%, 50%)',                // Orange
};

function getStatusColor(status: string): string {
  const normalized = status.toLowerCase().replace(/[\s-]/g, '_');
  return STATUS_COLORS[normalized] || 'hsl(var(--brand-primary))';
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
  
  // Get bar color based on status
  const barColor = getStatusColor(demand.status);
  const barColorLight = barColor.replace(')', ', 0.2)').replace('hsl(', 'hsla(');
  
  // Format dates for tooltip
  const startDateStr = format(demand.startDate, 'MMM d, yyyy');
  const endDateStr = format(demand.endDate, 'MMM d, yyyy');
  
  // Count milestone statuses
  const milestoneStats = useMemo(() => {
    const milestones = demand.milestones || [];
    return {
      total: milestones.length,
      complete: milestones.filter(m => m.status === 'complete').length,
      current: milestones.filter(m => m.status === 'current').length,
      pending: milestones.filter(m => m.status === 'pending').length,
      overdue: milestones.filter(m => m.status === 'overdue').length,
    };
  }, [demand.milestones]);
  
  return (
    <TooltipProvider>
      <Tooltip delayDuration={200}>
        <TooltipTrigger asChild>
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
              <div 
                className="absolute inset-0 rounded-sm" 
                style={{ backgroundColor: barColorLight }}
              />
              {/* Progress Fill */}
              <div
                className="absolute left-0 top-0 h-full rounded-sm"
                style={{ width: `${demand.progress}%`, backgroundColor: barColor }}
              />
            </div>
            
            {/* Milestone Markers - Diamond shapes matching Program */}
            {showMilestones && demand.milestones && demand.milestones.length > 0 && demand.milestones.map((milestone, index) => (
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
        </TooltipTrigger>
        <TooltipContent 
          side="top" 
          className="max-w-xs p-3 bg-background border border-border shadow-lg z-50"
        >
          <div className="space-y-2">
            {/* Title */}
            <div className="font-semibold text-foreground text-sm">{demand.title}</div>
            
            {/* Date range */}
            <div className="text-xs text-muted-foreground">
              {startDateStr} → {endDateStr}
            </div>
            
            {/* Progress */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Progress:</span>
              <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-brand-primary rounded-full"
                  style={{ width: `${demand.progress}%` }}
                />
              </div>
              <span className="text-xs font-medium text-foreground">{demand.progress}%</span>
            </div>
            
            {/* Status */}
            <div className="flex items-center gap-2 text-xs">
              <span className="text-muted-foreground">Status:</span>
              <span className="font-medium text-foreground capitalize">{demand.status.replace('-', ' ')}</span>
            </div>
            
            {/* Milestones summary */}
            {milestoneStats.total > 0 && (
              <div className="pt-1 border-t border-border space-y-1">
                <div className="text-xs font-medium text-foreground">
                  Milestones ({milestoneStats.complete}/{milestoneStats.total} complete)
                </div>
                <div className="flex gap-2 text-[10px]">
                  {milestoneStats.complete > 0 && (
                    <span className="text-brand-primary">✓ {milestoneStats.complete} done</span>
                  )}
                  {milestoneStats.current > 0 && (
                    <span className="text-secondary-bronze">● {milestoneStats.current} current</span>
                  )}
                  {milestoneStats.pending > 0 && (
                    <span className="text-muted-foreground">○ {milestoneStats.pending} pending</span>
                  )}
                  {milestoneStats.overdue > 0 && (
                    <span className="text-destructive">! {milestoneStats.overdue} overdue</span>
                  )}
                </div>
              </div>
            )}
            
            {milestoneStats.total === 0 && (
              <div className="text-xs text-muted-foreground italic">No milestones</div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
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
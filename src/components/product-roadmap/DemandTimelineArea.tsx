import React, { forwardRef, useMemo, useRef, useEffect, useImperativeHandle } from 'react';
import { Demand, Scale, DemandMilestone, DEMAND_STATUS_CONFIG } from '@/types/product-roadmap';
import { generateTimeUnits, calcPosition } from '@/utils/objective-roadmap-utils';
import { cn } from '@/lib/utils';
import { TODAY_LINE_COLOR, getKRStatusStyle } from '@/constants/krStatusStyles';
import { DemandGroupBy } from './ProductRoadmapToolbar';

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

// Final approved Product density: 64px row height
const DEMAND_ROW_HEIGHT = 64;
const GROUP_HEADER_HEIGHT = 40;

export const DemandTimelineArea = forwardRef<HTMLDivElement, DemandTimelineAreaProps>(
  ({ demands, groups, groupBy, scale, showMilestones, timelineStart, timelineEnd, onDemandClick }, ref) => {
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
      if (groupBy === 'none') {
        return demands.length * DEMAND_ROW_HEIGHT;
      }
      // Account for group headers
      const groupHeadersHeight = groups.length * GROUP_HEADER_HEIGHT;
      const demandsHeight = demands.length * DEMAND_ROW_HEIGHT;
      return groupHeadersHeight + demandsHeight;
    }, [demands.length, groups.length, groupBy]);

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
    
    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Timeline Header - responsive width with TODAY badge */}
        <div 
          ref={headerRef}
          className="h-10 flex items-center border-b border-border bg-muted/50 overflow-x-hidden relative"
        >
          {/* TODAY badge in header (always visible, not clipped by scroll) */}
          {todayPosition >= 0 && todayPosition <= 100 && (
            <div 
              className="absolute top-1/2 -translate-y-1/2 z-20"
              style={{ left: `${todayPosition}%` }}
            >
              <span 
                className="px-1.5 py-0.5 text-[9px] font-semibold text-white rounded whitespace-nowrap"
                style={{ backgroundColor: TODAY_LINE_COLOR }}
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
            {/* Grid Lines - stop at last row (clipped to content height) */}
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
            
            {/* Today Line - Bronze (grid height only, clipped) */}
            {todayPosition >= 0 && todayPosition <= 100 && (
              <div 
                className="absolute top-0 w-px z-10"
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
              // Grouped list
              groups.map(group => (
                <div key={group.key}>
                  {/* Group Header Row - visual separator */}
                  <div 
                    className="flex items-center bg-muted/50 border-b border-border"
                    style={{ height: `${GROUP_HEADER_HEIGHT}px` }}
                  >
                    <span className="px-4 text-xs font-semibold text-foreground uppercase tracking-wide">
                      {group.label}
                    </span>
                    <span className="text-xs text-muted-foreground">({group.demands.length})</span>
                  </div>
                  {/* Group's demands */}
                  {group.demands.map(demand => (
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
                </div>
              ))
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
  
  // Get status color
  const statusConfig = DEMAND_STATUS_CONFIG.find(s => s.key === demand.status);
  const statusColor = statusConfig?.color || '#6b7280';
  
  return (
    <div 
      className="relative border-b border-border hover:bg-muted/20 group/row cursor-pointer"
      style={{ height: `${rowHeight}px` }}
      onClick={onClick}
    >
      {/* Timeline Bar - Final approved: 8px height, no text inside */}
      <div 
        className="absolute top-1/2 -translate-y-1/2 rounded-full overflow-hidden"
        style={{ 
          left: `${barLeft}%`, 
          width: `${barWidth}%`,
          height: '8px',
          background: 'hsl(var(--muted))',
          minWidth: '40px'
        }}
      >
        {/* Progress Fill */}
        <div 
          className="absolute inset-y-0 left-0 rounded-full transition-all"
          style={{ 
            width: `${demand.progress}%`,
            backgroundColor: statusColor
          }}
        />
      </div>
      
      {/* Milestone Markers - visual only, NO tooltips */}
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
      
      {/* UNIFIED TOOLTIP - One tooltip per row with all demand information */}
      <div 
        className="absolute top-full left-0 mt-1 px-3 py-2.5 bg-popover border border-border rounded-lg shadow-xl opacity-0 group-hover/row:opacity-100 transition-opacity pointer-events-none z-[100] min-w-[240px] max-w-[340px]"
        style={{ left: `${Math.max(0, Math.min(barLeft, 70))}%` }}
      >
        {/* Demand Key + Title */}
        <div className="flex items-start gap-2 mb-1">
          <span className="text-[10px] font-semibold text-brand-gold bg-brand-gold/10 px-1.5 py-0.5 rounded flex-shrink-0">
            {demand.key}
          </span>
          <div className="text-xs font-semibold text-foreground leading-tight flex-1">
            {demand.title}
          </div>
        </div>
        
        {/* Date Range (End Date is canonical) */}
        <div className="text-[10px] text-muted-foreground mb-2">
          {demand.startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} → {demand.endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </div>
        
        {/* Status + Progress */}
        <div className="flex items-center gap-2 mb-2">
          <span 
            className="text-[10px] font-semibold px-2 py-0.5 rounded"
            style={{ 
              backgroundColor: `${statusColor}20`,
              color: statusColor
            }}
          >
            {statusConfig?.label || demand.status}
          </span>
          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full rounded-full"
              style={{ width: `${demand.progress}%`, backgroundColor: statusColor }}
            />
          </div>
          <span className="text-[10px] font-semibold" style={{ color: statusColor }}>
            {demand.progress}%
          </span>
        </div>
        
        {/* Owner */}
        <div className="text-[10px] text-muted-foreground mb-1">
          <span className="font-medium text-foreground">Owner:</span> {demand.ownerName}
        </div>
        
        {/* Platform */}
        {demand.platform && (
          <div className="text-[10px] text-muted-foreground mb-1">
            <span className="font-medium text-foreground">Platform:</span> {demand.platform}
          </div>
        )}
        
        {/* Milestones Section - derived from single showMilestones toggle */}
        {showMilestones && demand.milestones.length > 0 && (
          <div className="border-t border-border/50 pt-2 mt-2">
            <div className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
              Milestones ({demand.milestones.length})
            </div>
            <div className="space-y-1">
              {demand.milestones.slice(0, 4).map(ms => {
                const msStatusStyle = getKRStatusStyle(ms.status);
                return (
                  <div key={ms.id} className="flex items-center gap-2 text-[10px]">
                    <div 
                      className="w-2 h-2 rotate-45 flex-shrink-0"
                      style={{ 
                        background: msStatusStyle.filled ? msStatusStyle.color : '#ffffff',
                        border: `1.5px solid ${msStatusStyle.color}`
                      }}
                    />
                    <span className="flex-1 truncate text-foreground">{ms.title}</span>
                    <span className="text-muted-foreground flex-shrink-0">
                      {ms.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                );
              })}
              {demand.milestones.length > 4 && (
                <div className="text-[9px] text-muted-foreground">
                  +{demand.milestones.length - 4} more
                </div>
              )}
            </div>
          </div>
        )}
      </div>
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

// Milestone Marker - visual only, NO tooltip (tooltip is unified at row level)
const MilestoneMarker: React.FC<MilestoneMarkerProps> = ({
  milestone,
  index,
  totalMilestones,
  demandStart,
  demandEnd,
  barLeft,
  barWidth,
}) => {
  // Calculate absolute position on timeline
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
      // Distribute evenly if date is out of range
      const spacing = 90 / (totalMilestones + 1);
      relativePosition = 5 + spacing * (index + 1);
    }
    
    return barLeft + (relativePosition / 100) * barWidth;
  }, [milestone.date, demandStart, demandEnd, index, totalMilestones, barLeft, barWidth]);
  
  const statusStyle = getKRStatusStyle(milestone.status);
  
  // Visual marker only - NO tooltip, pointer-events disabled
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

import React, { forwardRef, useMemo, useRef, useEffect, useImperativeHandle } from 'react';
import { Demand, Scale, DemandMilestone, DEMAND_STATUS_CONFIG } from '@/types/product-roadmap';
import { generateTimeUnits, calcPosition } from '@/utils/objective-roadmap-utils';
import { cn } from '@/lib/utils';
import { TODAY_LINE_COLOR, PROGRESS_BAR_COLOR, getKRStatusStyle } from '@/constants/krStatusStyles';

interface DemandTimelineAreaProps {
  demands: Demand[];
  scale: Scale;
  showMilestones: boolean;
  timelineStart: Date;
  timelineEnd: Date;
  onDemandClick: (demandId: string) => void;
}

export const DemandTimelineArea = forwardRef<HTMLDivElement, DemandTimelineAreaProps>(
  ({ demands, scale, showMilestones, timelineStart, timelineEnd, onDemandClick }, ref) => {
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

    // Forward ref for vertical scroll sync
    useImperativeHandle(ref, () => contentRef.current as HTMLDivElement);
    
    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Timeline Header */}
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
                  className="flex-shrink-0 w-[120px] border-r border-border/50"
                />
              ))}
            </div>
            
            {/* Today Line */}
            {todayPosition >= 0 && todayPosition <= 100 && (
              <div 
                className="absolute top-0 bottom-0 w-px z-10"
                style={{ left: `${todayPosition}%`, backgroundColor: TODAY_LINE_COLOR }}
              >
                <span 
                  className="absolute -top-0 left-1/2 -translate-x-1/2 px-1.5 py-0.5 text-[10px] font-semibold text-white rounded"
                  style={{ backgroundColor: TODAY_LINE_COLOR }}
                >
                  TODAY
                </span>
              </div>
            )}
            
            {/* Demand Rows */}
            {demands.map(demand => (
              <DemandTimelineRow
                key={demand.id}
                demand={demand}
                showMilestones={showMilestones}
                timelineStart={timelineStart}
                timelineEnd={timelineEnd}
                onClick={() => onDemandClick(demand.id)}
              />
            ))}
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
}

const DemandTimelineRow: React.FC<DemandTimelineRowProps> = ({
  demand,
  showMilestones,
  timelineStart,
  timelineEnd,
  onClick,
}) => {
  const barLeft = calcPosition(demand.startDate, timelineStart, timelineEnd);
  const barRight = calcPosition(demand.endDate, timelineStart, timelineEnd);
  const barWidth = Math.max(barRight - barLeft, 2);
  
  // Get status color
  const statusConfig = DEMAND_STATUS_CONFIG.find(s => s.key === demand.status);
  const statusColor = statusConfig?.color || '#6b7280';
  
  return (
    <div className="relative h-[76px] border-b border-border hover:bg-muted/20 group/bar">
      {/* Timeline Bar */}
      <div 
        className="absolute top-1/2 -translate-y-1/2 h-6 rounded-full cursor-pointer overflow-hidden"
        style={{ 
          left: `${barLeft}%`, 
          width: `${barWidth}%`,
          background: '#C8CCD0',
          minWidth: '40px'
        }}
        onClick={onClick}
      >
        {/* Progress Fill */}
        <div 
          className="absolute inset-y-0 left-0 rounded-full transition-all"
          style={{ 
            width: `${demand.progress}%`,
            backgroundColor: PROGRESS_BAR_COLOR
          }}
        />
        
        {/* Bar Content - Milestones or status label */}
        <div className="relative h-full flex items-center justify-center px-2">
          {showMilestones && demand.milestones.length > 0 ? (
            demand.milestones.map((milestone, index) => (
              <MilestoneMarker
                key={milestone.id}
                milestone={milestone}
                index={index}
                totalMilestones={demand.milestones.length}
                demandStart={demand.startDate}
                demandEnd={demand.endDate}
              />
            ))
          ) : (
            <span 
              className="text-xs font-medium whitespace-nowrap px-2 py-0.5 rounded"
              style={{ 
                backgroundColor: `${statusColor}20`,
                color: statusColor
              }}
            >
              {statusConfig?.label || demand.status}
            </span>
          )}
        </div>
      </div>
      
      {/* Tooltip */}
      <div 
        className="absolute bottom-0 translate-y-full mt-1 px-4 py-3 bg-popover border border-border rounded-lg shadow-xl opacity-0 group-hover/bar:opacity-100 transition-opacity pointer-events-none z-[100]"
        style={{ left: `${Math.min(barLeft, 70)}%` }}
      >
        <div className="text-sm font-semibold text-foreground mb-1">{demand.title}</div>
        <div className="text-xs text-muted-foreground mb-2">
          {demand.startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} → {demand.endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className="text-brand-gold font-medium">{demand.progress}% complete</span>
          <span className="text-muted-foreground">{demand.ownerName}</span>
        </div>
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
}

const MilestoneMarker: React.FC<MilestoneMarkerProps> = ({
  milestone,
  index,
  totalMilestones,
  demandStart,
  demandEnd,
}) => {
  // Calculate position
  const position = useMemo(() => {
    const milestoneTime = milestone.date.getTime();
    const startTime = demandStart.getTime();
    const endTime = demandEnd.getTime();
    
    if (milestoneTime >= startTime && milestoneTime <= endTime) {
      const barDuration = endTime - startTime;
      const msPosition = milestoneTime - startTime;
      return Math.max(10, Math.min(90, (msPosition / barDuration) * 100));
    }
    
    // Distribute evenly if date is out of range
    const spacing = 80 / (totalMilestones + 1);
    return 10 + spacing * (index + 1);
  }, [milestone.date, demandStart, demandEnd, index, totalMilestones]);
  
  const statusStyle = getKRStatusStyle(milestone.status);
  
  return (
    <div 
      className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rotate-45 border-2 z-10 group/ms cursor-pointer"
      style={{ 
        left: `${position}%`,
        background: statusStyle.filled ? statusStyle.color : '#ffffff',
        borderColor: statusStyle.color
      }}
    >
      {/* Tooltip */}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 px-4 py-3 bg-popover border border-border rounded-lg shadow-xl opacity-0 group-hover/ms:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-[100] -rotate-45">
        <div className="text-[10px] font-semibold text-brand-gold uppercase tracking-wide mb-1">Milestone</div>
        <div className="text-sm font-medium text-foreground mb-1 max-w-[220px] truncate">{milestone.title}</div>
        <div className="text-xs text-muted-foreground">
          {milestone.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </div>
      </div>
    </div>
  );
};

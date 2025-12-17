// Enterprise Roadmap Gantt Chart - Bar-Based Timeline Lanes
// Per markdown spec: themes are time-span items, NOT metrics

import { useMemo, useRef, useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { RoadmapItem, Milestone, TimeScale, TimelinePeriod } from './types';
import { 
  generateTimelinePeriods, 
  calculateBarMetrics, 
  calculateTodayPosition,
  formatRoadmapDate 
} from './utils';
import { startOfYear, endOfYear, addYears } from 'date-fns';

interface RoadmapGanttChartProps {
  items: RoadmapItem[];
  expandedIds: Set<string>;
  selectedId: string | null;
  milestones: Milestone[];
  showMilestones: boolean;
  timeScale: TimeScale;
  selectedYear: number;
  onItemClick: (item: RoadmapItem) => void;
  onMilestoneClick: (milestone: Milestone) => void;
}

const ROW_HEIGHT = 56;
const BAR_HEIGHT = 32; // Thick bar height per spec

// Status color mapping using design system tokens
const getStatusStyles = (status: string, health?: string) => {
  const healthStatus = health || status;
  switch (healthStatus) {
    case 'on-track':
    case 'active':
      return {
        bg: 'bg-[hsl(var(--status-success-bg))]',
        border: 'border-l-[hsl(var(--status-success))]',
        progress: 'bg-[hsl(var(--status-success))]',
        text: 'text-[hsl(var(--status-success))]'
      };
    case 'at-risk':
    case 'proposed':
      return {
        bg: 'bg-[hsl(var(--status-warning-bg))]',
        border: 'border-l-[hsl(var(--status-warning))]',
        progress: 'bg-[hsl(var(--status-warning))]',
        text: 'text-[hsl(var(--status-warning))]'
      };
    case 'delayed':
    case 'off-track':
      return {
        bg: 'bg-[hsl(var(--status-danger-bg))]',
        border: 'border-l-[hsl(var(--status-danger))]',
        progress: 'bg-[hsl(var(--status-danger))]',
        text: 'text-[hsl(var(--status-danger))]'
      };
    default:
      return {
        bg: 'bg-secondary-champagne/20',
        border: 'border-l-secondary-champagne',
        progress: 'bg-secondary-champagne',
        text: 'text-secondary-champagne'
      };
  }
};

export function RoadmapGanttChart({
  items,
  expandedIds,
  selectedId,
  milestones,
  showMilestones,
  timeScale,
  selectedYear,
  onItemClick,
  onMilestoneClick,
}: RoadmapGanttChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(1200);
  const [hoveredItem, setHoveredItem] = useState<RoadmapItem | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

  // Calculate timeline range
  const timelineStart = useMemo(() => startOfYear(new Date(selectedYear, 0, 1)), [selectedYear]);
  const timelineEnd = useMemo(() => {
    if (timeScale === 'yearly') {
      return endOfYear(addYears(timelineStart, 2));
    }
    return endOfYear(timelineStart);
  }, [timelineStart, timeScale]);

  // Generate timeline periods
  const periods = useMemo(() => {
    const periodCount = timeScale === 'monthly' ? 12 : timeScale === 'quarterly' ? 4 : 3;
    return generateTimelinePeriods(timeScale, timelineStart, periodCount);
  }, [timeScale, timelineStart]);

  // Update container width on resize
  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(Math.max(containerRef.current.clientWidth, 1200));
      }
    };
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  // Flatten visible items for rendering
  const flattenVisibleItems = (items: RoadmapItem[], level: number = 0): { item: RoadmapItem; level: number }[] => {
    const result: { item: RoadmapItem; level: number }[] = [];
    for (const item of items) {
      result.push({ item, level });
      if (expandedIds.has(item.id) && item.children) {
        result.push(...flattenVisibleItems(item.children, level + 1));
      }
    }
    return result;
  };

  const visibleItems = useMemo(() => flattenVisibleItems(items), [items, expandedIds]);

  // Calculate today line position
  const todayPosition = useMemo(() => 
    calculateTodayPosition(new Date(), timelineStart, timelineEnd, containerWidth),
    [timelineStart, timelineEnd, containerWidth]
  );

  // Handle bar hover
  const handleBarHover = (item: RoadmapItem, e: React.MouseEvent) => {
    setHoveredItem(item);
    setTooltipPosition({ x: e.clientX, y: e.clientY });
  };

  return (
    <div className="flex-1 overflow-x-auto overflow-y-auto" ref={containerRef}>
      <div className="min-w-[1200px] relative" style={{ width: containerWidth }}>
        {/* Timeline Header */}
        <div className={cn(
          "sticky top-0 z-20 flex",
          "bg-surface-subtle dark:bg-[#0D1117]",
          "border-b border-border"
        )}>
          {periods.map((period) => (
            <div 
              key={period.key}
              className={cn(
                "flex-1 text-center py-3 border-r border-border last:border-r-0",
                period.isCurrent && "bg-brand-primary/5"
              )}
            >
              <p className="text-sm font-semibold text-foreground">
                {period.label}
              </p>
              {period.year && (
                <p className="text-xs text-muted-foreground">
                  {period.year}
                </p>
              )}
            </div>
          ))}
        </div>

        {/* Grid + Bars Container */}
        <div 
          className="relative"
          style={{ height: visibleItems.length * ROW_HEIGHT }}
        >
          {/* Vertical Grid Lines */}
          {periods.map((period, index) => (
            <div
              key={`grid-${period.key}`}
              className="absolute top-0 bottom-0 border-r border-border/50"
              style={{ left: `${((index + 1) / periods.length) * 100}%` }}
            />
          ))}

          {/* Horizontal Row Lines */}
          {visibleItems.map((_, index) => (
            <div
              key={`row-${index}`}
              className="absolute left-0 right-0 border-b border-border/50"
              style={{ top: (index + 1) * ROW_HEIGHT }}
            />
          ))}

          {/* Today Line */}
          {todayPosition !== null && (
            <div 
              className="absolute top-0 bottom-0 w-0.5 bg-[hsl(var(--status-danger))] z-30 pointer-events-none"
              style={{ left: todayPosition }}
            >
              <div className={cn(
                "absolute -top-1 left-1/2 -translate-x-1/2",
                "px-2 py-0.5 rounded text-[10px] font-semibold",
                "bg-[hsl(var(--status-danger))] text-white"
              )}>
                Today
              </div>
            </div>
          )}

          {/* BAR-BASED GANTT BARS (per markdown spec) */}
          {visibleItems.map(({ item, level }, rowIndex) => {
            const itemStart = new Date(item.startDate);
            const itemEnd = new Date(item.endDate);
            const metrics = calculateBarMetrics(itemStart, itemEnd, timelineStart, timelineEnd, containerWidth);
            
            if (!metrics.visible) return null;

            const isSelected = selectedId === item.id;
            const barWidth = metrics.width;
            const statusStyles = getStatusStyles(item.status, item.health);

            // Calculate milestone positions for THIS item
            const itemMilestones = showMilestones && item.milestones ? item.milestones : [];

            return (
              <div
                key={item.id}
                className="absolute left-0 right-0"
                style={{ 
                  top: rowIndex * ROW_HEIGHT,
                  height: ROW_HEIGHT
                }}
              >
                {/* BAR-BASED TIMELINE VISUALIZATION */}
                <div
                  className={cn(
                    "absolute group cursor-pointer rounded-md overflow-hidden",
                    "border-l-4 transition-all duration-200",
                    statusStyles.border,
                    isSelected && "ring-2 ring-brand-primary ring-offset-1"
                  )}
                  style={{ 
                    left: metrics.left, 
                    width: barWidth,
                    top: (ROW_HEIGHT - BAR_HEIGHT) / 2,
                    height: BAR_HEIGHT
                  }}
                  onClick={() => onItemClick(item)}
                  onMouseEnter={(e) => handleBarHover(item, e)}
                  onMouseLeave={() => setHoveredItem(null)}
                >
                  {/* Bar Background */}
                  <div className={cn(
                    "absolute inset-0",
                    statusStyles.bg,
                    "group-hover:brightness-95 transition-all"
                  )} />

                  {/* Progress Fill */}
                  <div 
                    className={cn(
                      "absolute inset-y-0 left-0",
                      statusStyles.progress,
                      "opacity-30"
                    )}
                    style={{ width: `${item.progress}%` }}
                  />

                  {/* Bar Content */}
                  <div className="relative h-full flex items-center px-3 gap-2">
                    {/* Item Name */}
                    <span className="text-sm font-medium text-foreground truncate flex-1">
                      {barWidth > 120 ? item.name : ''}
                    </span>
                    
                    {/* Progress Badge */}
                    {barWidth > 80 && (
                      <span className={cn(
                        "text-xs font-semibold px-1.5 py-0.5 rounded",
                        "bg-white/50 dark:bg-black/20",
                        statusStyles.text
                      )}>
                        {item.progress}%
                      </span>
                    )}
                  </div>

                  {/* MILESTONES ANCHORED TO BAR (% positioning within bar container) */}
                  {itemMilestones.map((milestone, mIdx) => {
                    const milestoneDate = new Date(milestone.date);
                    const barStart = new Date(item.startDate).getTime();
                    const barEnd = new Date(item.endDate).getTime();
                    const milestoneTime = milestoneDate.getTime();
                    
                    // Calculate position as percentage within the bar
                    const percentPosition = ((milestoneTime - barStart) / (barEnd - barStart)) * 100;
                    
                    if (percentPosition < 0 || percentPosition > 100) return null;

                    return (
                      <div 
                        key={milestone.id || mIdx}
                        className="absolute z-20 cursor-pointer group/milestone"
                        style={{ 
                          left: `${percentPosition}%`, 
                          top: '50%', 
                          transform: 'translate(-50%, -50%)' 
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          onMilestoneClick(milestone);
                        }}
                      >
                        {/* Diamond Shape */}
                        <div className={cn(
                          "w-3 h-3 rotate-45 border-2",
                          "bg-brand-primary border-brand-primary",
                          "group-hover/milestone:scale-125 transition-transform"
                        )} />
                        
                        {/* Tooltip */}
                        <div className={cn(
                          "absolute top-5 left-1/2 -translate-x-1/2 whitespace-nowrap",
                          "px-2 py-1 rounded text-xs font-medium",
                          "bg-foreground text-background",
                          "opacity-0 group-hover/milestone:opacity-100 transition-opacity pointer-events-none"
                        )}>
                          {milestone.name}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Global milestones (for milestones not attached to specific items) */}
          {showMilestones && milestones.filter(m => !visibleItems.some(vi => vi.item.milestones?.some(im => im.id === m.id))).map((milestone) => {
            const milestoneDate = new Date(milestone.date);
            const position = calculateTodayPosition(milestoneDate, timelineStart, timelineEnd, containerWidth);
            
            if (position === null) return null;

            return (
              <div 
                key={milestone.id}
                className="absolute z-20 cursor-pointer group"
                style={{ left: position, top: 30 }}
                onClick={() => onMilestoneClick(milestone)}
              >
                {/* Diamond Shape */}
                <div className={cn(
                  "w-4 h-4 rotate-45 border-2",
                  "bg-brand-primary border-brand-primary",
                  "group-hover:scale-125 transition-transform"
                )} />
                
                {/* Tooltip */}
                <div className={cn(
                  "absolute top-6 left-1/2 -translate-x-1/2 whitespace-nowrap",
                  "px-2 py-1 rounded text-xs font-medium",
                  "bg-foreground text-background",
                  "opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                )}>
                  {milestone.name}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Floating Tooltip */}
      {hoveredItem && (
        <RoadmapTooltip 
          item={hoveredItem} 
          position={tooltipPosition}
        />
      )}
    </div>
  );
}

// Tooltip Component
function RoadmapTooltip({ item, position }: { item: RoadmapItem; position: { x: number; y: number } }) {
  const statusStyles = getStatusStyles(item.status, item.health);
  
  return (
    <div
      className={cn(
        "fixed z-50 w-72 rounded-xl overflow-hidden shadow-xl pointer-events-none",
        "bg-background border border-border"
      )}
      style={{ 
        top: position.y + 15, 
        left: position.x + 15,
        maxWidth: 'calc(100vw - 30px)'
      }}
    >
      {/* Header */}
      <div className={cn(
        "px-4 py-3 border-b border-border",
        "bg-surface-subtle"
      )}>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-mono text-brand-primary">{item.id.slice(0, 8)}</span>
          <span className={cn(
            "inline-flex px-2 py-0.5 rounded text-[10px] font-semibold uppercase",
            statusStyles.bg,
            statusStyles.text
          )}>
            {item.health || item.status}
          </span>
        </div>
        <h4 className="text-sm font-semibold text-foreground">
          {item.name}
        </h4>
      </div>

      {/* Body */}
      <div className="px-4 py-3 space-y-3">
        {/* Timeline */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>{formatRoadmapDate(item.startDate)} → {formatRoadmapDate(item.endDate)}</span>
        </div>

        {/* Progress */}
        <div>
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium text-foreground">{item.progress}%</span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div 
              className={cn("h-full rounded-full", statusStyles.progress)}
              style={{ width: `${item.progress}%` }}
            />
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border">
          <div className="text-center">
            <p className="text-lg font-bold text-foreground">{item.objectives ?? '—'}</p>
            <p className="text-[10px] text-muted-foreground">Objectives</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-foreground">{item.epics ?? '—'}</p>
            <p className="text-[10px] text-muted-foreground">Epics</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-foreground">{item.risks ?? '—'}</p>
            <p className="text-[10px] text-muted-foreground">Risks</p>
          </div>
        </div>
      </div>
    </div>
  );
}

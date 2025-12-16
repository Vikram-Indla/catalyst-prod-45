// Enterprise Roadmap Gantt Chart

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

const ROW_HEIGHT = 60;
const LINE_HEIGHT = 3; // Sleek progress line height

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
          "bg-[#FAFBFC] dark:bg-[#0D1117]",
          "border-b border-[#E1E4E8] dark:border-[#30363D]"
        )}>
          {periods.map((period) => (
            <div 
              key={period.key}
              className={cn(
                "flex-1 text-center py-3 border-r border-[#EAECEF] dark:border-[#21262D] last:border-r-0",
                period.isCurrent && "bg-[rgba(198,156,109,0.05)] dark:bg-[rgba(198,156,109,0.08)]"
              )}
            >
              <p className="text-sm font-semibold text-[#24292F] dark:text-[#E6EDF3]">
                {period.label}
              </p>
              {period.year && (
                <p className="text-xs text-[#8B949E] dark:text-[#6E7681]">
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
              className="absolute top-0 bottom-0 border-r border-[#EAECEF] dark:border-[#21262D]"
              style={{ left: `${((index + 1) / periods.length) * 100}%` }}
            />
          ))}

          {/* Horizontal Row Lines */}
          {visibleItems.map((_, index) => (
            <div
              key={`row-${index}`}
              className="absolute left-0 right-0 border-b border-[#EAECEF] dark:border-[#21262D]"
              style={{ top: (index + 1) * ROW_HEIGHT }}
            />
          ))}

          {/* Today Line */}
          {todayPosition !== null && (
            <div 
              className="absolute top-0 bottom-0 w-0.5 bg-[#B85C5C] z-30 pointer-events-none"
              style={{ left: todayPosition }}
            >
              <div className={cn(
                "absolute -top-1 left-1/2 -translate-x-1/2",
                "px-2 py-0.5 rounded text-[10px] font-semibold",
                "bg-[#B85C5C] text-white"
              )}>
                Today
              </div>
            </div>
          )}

          {/* Gantt Bars with Milestones INSIDE each row */}
          {visibleItems.map(({ item, level }, rowIndex) => {
            const itemStart = new Date(item.startDate);
            const itemEnd = new Date(item.endDate);
            const metrics = calculateBarMetrics(itemStart, itemEnd, timelineStart, timelineEnd, containerWidth);
            
            if (!metrics.visible) return null;

            const isSelected = selectedId === item.id;
            const barWidth = metrics.width;

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
                {/* Progress Line Visualization */}
                <div
                  className="absolute group cursor-pointer"
                  style={{ 
                    left: metrics.left, 
                    width: barWidth,
                    top: '50%',
                    transform: 'translateY(-50%)'
                  }}
                  onClick={() => onItemClick(item)}
                  onMouseEnter={(e) => handleBarHover(item, e)}
                  onMouseLeave={() => setHoveredItem(null)}
                >
                  {/* Start Node */}
                  <div className={cn(
                    "absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 z-10",
                    "w-3 h-3 rounded-full border-2",
                    "bg-white dark:bg-[#0D1117]",
                    "border-[#C69C6D]",
                    "transition-transform group-hover:scale-125"
                  )} />

                  {/* Track Line (background) */}
                  <div 
                    className="absolute inset-y-0 left-0 right-0 my-auto rounded-full bg-[#E1E4E8] dark:bg-[#30363D]"
                    style={{ height: LINE_HEIGHT }}
                  />

                  {/* Progress Line (foreground with gradient) */}
                  <div 
                    className={cn(
                      "absolute inset-y-0 left-0 my-auto rounded-full",
                      "transition-all duration-300",
                      isSelected && "shadow-[0_0_8px_rgba(198,156,109,0.6)]"
                    )}
                    style={{ 
                      height: LINE_HEIGHT,
                      width: `${item.progress}%`,
                      background: item.type === 'theme' 
                        ? 'linear-gradient(90deg, #5C7C5C, #7A9A7A)' 
                        : item.type === 'objective'
                        ? 'linear-gradient(90deg, #C69C6D, #D4B896)'
                        : 'linear-gradient(90deg, #8B7355, #A89070)'
                    }}
                  />

                  {/* Progress Node (current position) */}
                  {item.progress > 0 && item.progress < 100 && (
                    <div 
                      className={cn(
                        "absolute top-1/2 -translate-y-1/2 z-10",
                        "w-2.5 h-2.5 rounded-full",
                        "transition-transform group-hover:scale-125",
                        item.type === 'theme' ? "bg-[#5C7C5C]" : 
                        item.type === 'objective' ? "bg-[#C69C6D]" : "bg-[#8B7355]"
                      )}
                      style={{ left: `${item.progress}%`, transform: 'translate(-50%, -50%)' }}
                    />
                  )}

                  {/* End Node */}
                  <div className={cn(
                    "absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 z-10",
                    "w-3 h-3 rounded-full border-2",
                    item.progress >= 100 
                      ? "bg-[#5C7C5C] border-[#5C7C5C]" 
                      : "bg-white dark:bg-[#0D1117] border-[#8B949E] dark:border-[#6E7681]",
                    "transition-transform group-hover:scale-125"
                  )} />

                  {/* Progress Label (floats above line) */}
                  <div className={cn(
                    "absolute -top-5 left-1/2 -translate-x-1/2",
                    "text-[10px] font-semibold",
                    "opacity-0 group-hover:opacity-100 transition-opacity",
                    item.type === 'theme' ? "text-[#5C7C5C]" : 
                    item.type === 'objective' ? "text-[#C69C6D]" : "text-[#8B7355]"
                  )}>
                    {item.progress}%
                  </div>

                  {/* Date Labels on Hover */}
                  <div className="absolute -bottom-4 left-0 text-[10px] text-[#8B949E] dark:text-[#6E7681] opacity-0 group-hover:opacity-100 transition-opacity">
                    {formatRoadmapDate(item.startDate)}
                  </div>
                  <div className="absolute -bottom-4 right-0 text-[10px] text-[#8B949E] dark:text-[#6E7681] opacity-0 group-hover:opacity-100 transition-opacity">
                    {formatRoadmapDate(item.endDate)}
                  </div>
                </div>

                {/* Milestones for THIS row (positioned relative to row, not container) */}
                {itemMilestones.map((milestone) => {
                  const milestoneDate = new Date(milestone.date);
                  const position = calculateTodayPosition(milestoneDate, timelineStart, timelineEnd, containerWidth);
                  
                  if (position === null) return null;

                  return (
                    <div 
                      key={milestone.id}
                      className="absolute z-20 cursor-pointer group"
                      style={{ 
                        left: position, 
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
                        "w-4 h-4 rotate-45 border-2",
                        "bg-[#C69C6D] border-[#C69C6D]",
                        "group-hover:scale-125 transition-transform"
                      )} />
                      
                      {/* Tooltip */}
                      <div className={cn(
                        "absolute top-6 left-1/2 -translate-x-1/2 whitespace-nowrap",
                        "px-2 py-1 rounded text-xs font-medium",
                        "bg-[#24292F] dark:bg-[#E6EDF3] text-white dark:text-[#0D1117]",
                        "opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                      )}>
                        {milestone.name}
                      </div>
                    </div>
                  );
                })}
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
                  "bg-[#C69C6D] border-[#C69C6D]",
                  "group-hover:scale-125 transition-transform"
                )} />
                
                {/* Tooltip */}
                <div className={cn(
                  "absolute top-6 left-1/2 -translate-x-1/2 whitespace-nowrap",
                  "px-2 py-1 rounded text-xs font-medium",
                  "bg-[#24292F] dark:bg-[#E6EDF3] text-white dark:text-[#0D1117]",
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
  return (
    <div
      className={cn(
        "fixed z-50 w-72 rounded-xl overflow-hidden shadow-xl pointer-events-none",
        "bg-white dark:bg-[#161B22]",
        "border border-[#E1E4E8] dark:border-[#30363D]"
      )}
      style={{ 
        top: position.y + 15, 
        left: position.x + 15,
        maxWidth: 'calc(100vw - 30px)'
      }}
    >
      {/* Header */}
      <div className={cn(
        "px-4 py-3 border-b border-[#EAECEF] dark:border-[#21262D]",
        "bg-[#FAFBFC] dark:bg-[#0D1117]"
      )}>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-mono text-[#C69C6D]">{item.id.slice(0, 8)}</span>
          <span className={cn(
            "inline-flex px-2 py-0.5 rounded text-[10px] font-semibold uppercase border",
            item.status === 'active' 
              ? "bg-[rgba(92,124,92,0.1)] text-[#5C7C5C] border-[rgba(92,124,92,0.3)]"
              : "bg-[#F6F8FA] text-[#57606A] border-[#E1E4E8] dark:bg-[#21262D] dark:text-[#8B949E] dark:border-[#30363D]"
          )}>
            {item.status}
          </span>
        </div>
        <h4 className="text-sm font-semibold text-[#24292F] dark:text-[#E6EDF3]">
          {item.name}
        </h4>
      </div>

      {/* Body */}
      <div className="px-4 py-3 space-y-3">
        {/* Timeline */}
        <div className="flex items-center gap-2 text-sm text-[#57606A] dark:text-[#8B949E]">
          <span>{formatRoadmapDate(item.startDate)} → {formatRoadmapDate(item.endDate)}</span>
        </div>

        {/* Progress */}
        <div>
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-[#8B949E] dark:text-[#6E7681]">Progress</span>
            <span className="font-medium text-[#24292F] dark:text-[#E6EDF3]">{item.progress}%</span>
          </div>
          <div className="h-2 rounded-full bg-[#E1E4E8] dark:bg-[#30363D] overflow-hidden">
            <div 
              className="h-full rounded-full bg-[#5C7C5C]"
              style={{ width: `${item.progress}%` }}
            />
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#EAECEF] dark:border-[#21262D]">
          <div className="text-center">
            <p className="text-lg font-bold text-[#24292F] dark:text-[#E6EDF3]">{item.objectives ?? '—'}</p>
            <p className="text-[10px] text-[#8B949E] dark:text-[#6E7681]">Objectives</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-[#24292F] dark:text-[#E6EDF3]">{item.epics ?? '—'}</p>
            <p className="text-[10px] text-[#8B949E] dark:text-[#6E7681]">Epics</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-[#24292F] dark:text-[#E6EDF3]">{item.risks ?? '—'}</p>
            <p className="text-[10px] text-[#8B949E] dark:text-[#6E7681]">Risks</p>
          </div>
        </div>
      </div>
    </div>
  );
}

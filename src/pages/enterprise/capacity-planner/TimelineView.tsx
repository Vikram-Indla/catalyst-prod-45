import { useState, useMemo, useCallback } from 'react';
import { Users, ChevronRight, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  getAssignmentTheme,
  getAllocationTheme,
} from '@/lib/catalyst-colors';
import { RESOURCE_COLUMN_WIDTH, WEEK_COLUMN_WIDTH, MONTH_COLUMN_WIDTH, QUARTER_COLUMN_WIDTH } from '@/lib/capacity/timeline-columns';
import type { ResourceMetric, ResourceAllocation, PeriodType, GroupByType } from './types';
import { getTimelineProjectColor } from './types';

export interface TimelineViewProps {
  resources: ResourceMetric[];
  period: PeriodType;
  groupBy: GroupByType;
  groupedByAssignment: Record<string, ResourceMetric[]>;
  groupedByDepartment: Record<string, ResourceMetric[]>;
  allocations?: ResourceAllocation[];
  onEditResource?: (id: string) => void;
  onResourceWorkClick?: (id: string, name: string) => void;
}

export function TimelineView({ resources, period, groupBy, groupedByAssignment, groupedByDepartment, allocations = [], onEditResource, onResourceWorkClick }: TimelineViewProps) {
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  const toggleGroup = (name: string) => {
    setExpandedGroups(prev => ({ ...prev, [name]: !prev[name] }));
  };

  const isGroupExpanded = (name: string) => expandedGroups[name] === true;

  // Generate periods based on selected period type - dynamic from current date to Dec 26, 2026
  const periods = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const endDate = new Date(2026, 11, 26); // December 26, 2026

    if (period === 'monthly') {
      // Calculate months from current month to December 2026
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const months: { label: string; key: string }[] = [];
      let year = currentYear;
      let monthIndex = currentMonth;

      while (year < 2026 || (year === 2026 && monthIndex <= 11)) {
        const shortYear = String(year).slice(-2);
        months.push({
          label: `${monthNames[monthIndex]} '${shortYear}`,
          key: `${year}-${String(monthIndex + 1).padStart(2, '0')}`,
        });
        monthIndex++;
        if (monthIndex > 11) {
          monthIndex = 0;
          year++;
        }
      }
      return months;
    }
    if (period === 'quarterly') {
      // Calculate quarters from current quarter to Q4 2026
      const quarters: { label: string; key: string }[] = [];
      let year = currentYear;
      let quarterIndex = Math.floor(currentMonth / 3);

      while (year < 2026 || (year === 2026 && quarterIndex <= 3)) {
        const shortYear = String(year).slice(-2);
        quarters.push({
          label: `Q${quarterIndex + 1} '${shortYear}`,
          key: `${year}-Q${quarterIndex + 1}`,
        });
        quarterIndex++;
        if (quarterIndex > 3) {
          quarterIndex = 0;
          year++;
        }
      }
      return quarters;
    }
    // Weekly - from current week to December 26, 2026
    const weekLabels: { label: string; key: string }[] = [];
    const startOfCurrentWeek = new Date(now);
    startOfCurrentWeek.setDate(now.getDate() - now.getDay()); // Sunday start

    let weekNum = 1;
    let weekDate = new Date(startOfCurrentWeek);

    while (weekDate <= endDate) {
      const weekMonth = weekDate.toLocaleString('en-US', { month: 'short' });
      const weekDay = weekDate.getDate();
      const weekYear = String(weekDate.getFullYear()).slice(-2);
      weekLabels.push({
        label: `${weekMonth} ${weekDay} '${weekYear}`,
        key: `${weekDate.getFullYear()}-W${String(weekNum).padStart(2, '0')}`,
      });
      weekDate.setDate(weekDate.getDate() + 7);
      weekNum++;
    }
    return weekLabels;
  }, [period]);

  // Build a map of resourceId -> allocations from the time-boxed allocations
  // Index by BOTH profile_id AND resource_id to ensure lookups work regardless of key used
  const allocationsByResource = useMemo(() => {
    const map = new Map<string, ResourceAllocation[]>();
    allocations.forEach((a) => {
      // Add by profile_id if present
      if (a.profile_id) {
        if (!map.has(a.profile_id)) {
          map.set(a.profile_id, []);
        }
        map.get(a.profile_id)!.push(a);
      }
      // Also add by resource_id if different from profile_id
      if (a.resource_id && a.resource_id !== a.profile_id) {
        if (!map.has(a.resource_id)) {
          map.set(a.resource_id, []);
        }
        map.get(a.resource_id)!.push(a);
      }
    });
    return map;
  }, [allocations]);

  // Get allocations for a resource that overlap with a specific period
  const getResourceAllocationsForPeriod = useCallback((resourceId: string, periodStart: Date, periodEnd: Date) => {
    const resourceAllocations = allocationsByResource.get(resourceId) || [];
    return resourceAllocations.filter((a) => {
      const allocStart = new Date(a.start_date);
      const allocEnd = new Date(a.end_date);
      // Check overlap
      return allocStart <= periodEnd && allocEnd >= periodStart;
    });
  }, [allocationsByResource]);

  // Calculate total allocation for a period
  const getTotalAllocationForPeriod = useCallback((resourceId: string, periodStart: Date, periodEnd: Date) => {
    const periodAllocations = getResourceAllocationsForPeriod(resourceId, periodStart, periodEnd);
    return periodAllocations.reduce((sum, a) => sum + a.allocation_percent, 0);
  }, [getResourceAllocationsForPeriod]);

  // Check if resource has any time-boxed allocations
  const hasTimeBoxedAllocations = allocations.length > 0;

  // FIX #1: Use fixed pixel widths for column alignment
  const columnWidth = period === 'weekly' ? WEEK_COLUMN_WIDTH : period === 'monthly' ? MONTH_COLUMN_WIDTH : QUARTER_COLUMN_WIDTH;

  // Explicit pixel template (no repeat/fr units) to avoid rounding drift.
  const gridTemplateColumns = `${RESOURCE_COLUMN_WIDTH}px ${Array.from({ length: periods.length }, () => `${columnWidth}px`).join(' ')}`;
  const totalWidth = RESOURCE_COLUMN_WIDTH + (periods.length * columnWidth);

  const renderTimelineHeader = () => (
    <div
      className="grid bg-muted/50 dark:bg-surface-3 border-b border-border sticky top-0 z-10"
      style={{
        gridTemplateColumns,
        width: totalWidth,
        minWidth: totalWidth,
        borderLeftWidth: '3px',
        borderLeftColor: 'transparent'
      }}
    >
      <div className="px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider border-r border-border">
        Resource
      </div>
      {periods.map((p, i) => (
        <div
          key={p.key}
          className={cn(
            'px-2 py-3 text-center text-[11px] font-semibold text-muted-foreground border-r border-border last:border-r-0',
            i === 0 && 'bg-primary/5 text-primary'
          )}
        >
          {p.label}
        </div>
      ))}
    </div>
  );

  // Calculate period date ranges once for all resources
  const periodDateRanges = useMemo(() => {
    const now = new Date();
    return periods.map((p, colIdx) => {
      let periodStart: Date;
      let periodEnd: Date;

      if (period === 'monthly') {
        const monthIndex = (now.getMonth() + colIdx) % 12;
        const year = now.getFullYear() + Math.floor((now.getMonth() + colIdx) / 12);
        periodStart = new Date(year, monthIndex, 1);
        periodEnd = new Date(year, monthIndex + 1, 0);
      } else if (period === 'quarterly') {
        const currentQuarter = Math.floor(now.getMonth() / 3);
        const quarterIndex = (currentQuarter + colIdx) % 4;
        const year = now.getFullYear() + Math.floor((currentQuarter + colIdx) / 4);
        periodStart = new Date(year, quarterIndex * 3, 1);
        periodEnd = new Date(year, (quarterIndex + 1) * 3, 0);
      } else {
        const startOfCurrentWeek = new Date(now);
        startOfCurrentWeek.setDate(now.getDate() - now.getDay());
        periodStart = new Date(startOfCurrentWeek);
        periodStart.setDate(startOfCurrentWeek.getDate() + colIdx * 7);
        periodEnd = new Date(periodStart);
        periodEnd.setDate(periodStart.getDate() + 6);
      }

      // Normalize to full-day range so date-only strings (YYYY-MM-DD) match reliably
      periodStart.setHours(0, 0, 0, 0);
      periodEnd.setHours(23, 59, 59, 999);

      return { ...p, start: periodStart, end: periodEnd };
    });
  }, [periods, period]);

  // Calculate Gantt bar position for an allocation - pixel-precise version
  const calculateGanttBar = useCallback((alloc: ResourceAllocation) => {
    const allocStart = new Date(alloc.start_date);
    const allocEnd = new Date(alloc.end_date);

    // Normalize allocation dates to full-day range
    allocStart.setHours(0, 0, 0, 0);
    allocEnd.setHours(23, 59, 59, 999);

    // Find start column index
    let startColIndex = periodDateRanges.findIndex(p =>
      allocStart >= p.start && allocStart <= p.end
    );
    if (startColIndex === -1 && allocStart < periodDateRanges[0].start) {
      startColIndex = 0; // Starts before visible range
    }
    if (startColIndex === -1) {
      // Allocation starts after visible range
      return null;
    }

    // Find end column index
    let endColIndex = periodDateRanges.findIndex(p =>
      allocEnd >= p.start && allocEnd <= p.end
    );
    if (endColIndex === -1 && allocEnd > periodDateRanges[periodDateRanges.length - 1].end) {
      endColIndex = periodDateRanges.length - 1; // Ends after visible range
    }
    if (endColIndex === -1) {
      // Allocation ends before visible range
      return null;
    }

    // Ensure startColIndex <= endColIndex
    if (startColIndex > endColIndex) {
      return null;
    }

    // Calculate pixel-precise left offset within first column
    const startPeriod = periodDateRanges[startColIndex];
    const periodDuration = startPeriod.end.getTime() - startPeriod.start.getTime();
    const allocStartInPeriod = Math.max(allocStart.getTime(), startPeriod.start.getTime());
    const leftOffsetRatio = (allocStartInPeriod - startPeriod.start.getTime()) / periodDuration;
    const leftOffset = leftOffsetRatio * columnWidth;

    // Calculate pixel-precise width
    const endPeriod = periodDateRanges[endColIndex];
    const endPeriodDuration = endPeriod.end.getTime() - endPeriod.start.getTime();
    const allocEndInPeriod = Math.min(allocEnd.getTime(), endPeriod.end.getTime());
    const rightOffsetRatio = (allocEndInPeriod - endPeriod.start.getTime()) / endPeriodDuration;
    const rightOffset = rightOffsetRatio * columnWidth;

    // Total width: (full columns in between) + (partial start) + (partial end)
    const span = endColIndex - startColIndex + 1;
    let barWidth: number;
    if (startColIndex === endColIndex) {
      // Bar fits within single column
      barWidth = (rightOffsetRatio - leftOffsetRatio) * columnWidth;
    } else {
      // Bar spans multiple columns
      const startColRemainder = (1 - leftOffsetRatio) * columnWidth;
      const endColPortion = rightOffsetRatio * columnWidth;
      const middleColumns = (span - 2) * columnWidth;
      barWidth = startColRemainder + middleColumns + endColPortion;
    }

    // Minimum width for visibility
    barWidth = Math.max(barWidth, 60);

    return { startColIndex, endColIndex, span, leftOffset, barWidth };
  }, [periodDateRanges, columnWidth]);

  const renderResourceRow = (resource: ResourceMetric, assignmentName: string, isEven: boolean) => {
    const theme = getAssignmentTheme(assignmentName);
    const initials = resource.name?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'NA';

    // Get all allocations for this resource
    const resourceAllocations = allocationsByResource.get(resource.id) || [];

    // Calculate Gantt bars for each allocation
    const ganttBars = resourceAllocations
      .map(alloc => {
        const position = calculateGanttBar(alloc);
        if (!position) return null;
        return { alloc, ...position };
      })
      .filter((bar): bar is NonNullable<typeof bar> => bar !== null);

    // Determine which columns are covered by allocations
    const coveredColumns = new Set<number>();
    ganttBars.forEach(bar => {
      for (let i = bar.startColIndex; i <= bar.endColIndex; i++) {
        coveredColumns.add(i);
      }
    });

    // Calculate total allocation per period for warning display
    const periodTotals = periodDateRanges.map((pdr, idx) => {
      const periodAllocs = resourceAllocations.filter(a => {
        const allocStart = new Date(a.start_date);
        const allocEnd = new Date(a.end_date);
        return allocStart <= pdr.end && allocEnd >= pdr.start;
      });
      return periodAllocs.reduce((sum, a) => sum + a.allocation_percent, 0);
    });

    const legacyTotal = resource.allocation || 0;
    const allocTheme = getAllocationTheme(legacyTotal);
    const isUnassigned = assignmentName === 'Unassigned' || !assignmentName;

    return (
      <div
        key={resource.id}
        className={cn(
          "grid border-b border-border last:border-b-0 hover:bg-muted/50",
          isEven && "bg-muted/30"
        )}
        style={{
          gridTemplateColumns: gridTemplateColumns,
          width: totalWidth,
          minWidth: totalWidth,
          borderLeftWidth: '3px',
          borderLeftColor: allocTheme.bar
        }}
      >
        {/* Resource Info */}
        <div
          className="px-4 py-3 flex items-center gap-3 border-r border-border cursor-pointer hover:bg-muted/60 transition-colors"
          onClick={() => {
            const riId = (resource as any).resourceInventoryId || resource.id;
            onResourceWorkClick?.(riId, resource.name);
          }}
          title={`View ${resource.name}'s work items`}
        >
          <div className="relative shrink-0">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white"
              style={{ backgroundColor: theme.accent }}
            >
              {initials}
            </div>
            {resource.country_flag_svg && (
              <img
                src={resource.country_flag_svg}
                alt={resource.country || ''}
                className="absolute -bottom-0.5 -right-0.5 h-3.5 w-5 object-cover rounded-sm border border-background shadow-sm"
              />
            )}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">{resource.name}</p>
            <p className="text-[11px] text-muted-foreground truncate">{resource.role || 'Team Member'}</p>
          </div>
        </div>

        {/* Timeline Cells - One per period */}
        {periods.map((p, colIdx) => {
          const isCurrentPeriod = colIdx === 0;
          const isOver = periodTotals[colIdx] > 100;

          // Find bars that cover this column
          const barsInColumn = ganttBars.filter(bar =>
            colIdx >= bar.startColIndex && colIdx <= bar.endColIndex
          );

          // Only render bar on its start column
          const barsStartingHere = ganttBars.filter(bar => bar.startColIndex === colIdx);

          return (
            <div
              key={p.key}
              className={cn(
                'relative border-r border-border last:border-r-0 min-h-[60px] py-2 px-0',
                isCurrentPeriod && 'bg-primary/5',
                isOver && 'bg-warning/10'
              )}
            >
              {isOver && (
                <div className="absolute top-1 right-1 z-10">
                  <AlertTriangle className="w-3.5 h-3.5 text-[#2563eb]" />
                </div>
              )}

              {/* Render bars that START in this column - pixel-precise positioning */}
              {barsStartingHere.map((bar, idx) => {
                const projectName = bar.alloc.assignment_name || 'Allocation';
                const projectColor = getTimelineProjectColor(projectName);
                const tooltipText = `${projectName}: ${bar.alloc.allocation_percent}% (${new Date(bar.alloc.start_date).toLocaleDateString()} – ${new Date(bar.alloc.end_date).toLocaleDateString()})`;

                // Use pixel-precise positioning from calculateGanttBar
                const leftPx = bar.leftOffset || 0;
                const widthPx = bar.barWidth || (bar.span * columnWidth);

                // Committed = project color, Forecast = transparent with dotted border
                const isForecast = bar.alloc.status === 'forecast';

                return (
                  <div
                    key={bar.alloc.id || idx}
                    className="absolute h-7 rounded flex items-center px-3 text-[11px] font-semibold cursor-pointer hover:opacity-90 transition-opacity z-10"
                    style={{
                      top: 8 + idx * 32,
                      left: leftPx,
                      width: widthPx,
                      backgroundColor: isForecast ? 'transparent' : projectColor.bg,
                      color: isForecast ? projectColor.bg : projectColor.text,
                      border: isForecast ? `3px dotted ${projectColor.bg}` : 'none',
                      boxSizing: 'border-box',
                      boxShadow: !isForecast ? '0 1px 3px rgba(0,0,0,0.15)' : 'none',
                    }}
                    title={`${isForecast ? '[Forecast] ' : ''}${tooltipText}`}
                    onClick={() => onEditResource?.(resource.id)}
                  >
                    <span className="truncate">
                      {projectName} ({bar.alloc.allocation_percent}%)
                    </span>
                  </div>
                );
              })}

            </div>
          );
        })}
      </div>
    );
  };

  const renderGroupedTimeline = (groupName: string, groupResources: ResourceMetric[]) => {
    const theme = getAssignmentTheme(groupName);
    const isExpanded = isGroupExpanded(groupName);

    return (
      <div key={groupName} className="space-y-2">
        {/* Group Header */}
        <button
          onClick={() => toggleGroup(groupName)}
          className="w-full flex items-center justify-between px-4 py-3 bg-card border border-border rounded-lg hover:shadow-sm transition-all"
          style={{ borderLeftWidth: '4px', borderLeftColor: theme.accent }}
        >
          <div className="flex items-center gap-3">
            <ChevronRight className={cn("w-4 h-4 text-muted-foreground transition-transform", isExpanded && "rotate-90")} />
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: theme.accent }}
            >
              <Users className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-sm font-semibold" style={{ color: theme.accent }}>
              {groupName}
            </span>
          </div>
          <span className="text-xs text-muted-foreground bg-muted px-2.5 py-1 rounded-full">
            {groupResources.length} resources
          </span>
        </button>

        {/* Timeline Table - header outside scroll container to prevent overlap */}
        {isExpanded && (
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <div style={{ width: totalWidth, minWidth: totalWidth }}>
                {/* Sticky header outside the vertical scroll */}
                {renderTimelineHeader()}
                {/* Scrollable rows */}
                <div className="max-h-[400px] overflow-y-auto">
                  {groupResources.map((r, i) => renderResourceRow(r, groupName, i % 2 === 0))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  if (groupBy === 'assignment') {
    return (
      <div className="space-y-4">
        {/* Legend */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-teal-100 border-l-2 border-teal-500" />
            Available
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-blue-100 border-l-2 border-blue-500" />
            Optimal
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-amber-100 border-l-2 border-amber-500" />
            Over-allocated
          </span>
        </div>

        {Object.entries(groupedByAssignment).map(([name, resources]) =>
          renderGroupedTimeline(name, resources)
        )}
      </div>
    );
  }

  if (groupBy === 'department') {
    return (
      <div className="space-y-4">
        {Object.entries(groupedByDepartment).map(([name, resources]) =>
          renderGroupedTimeline(name, resources)
        )}
      </div>
    );
  }

  // No grouping - header outside scroll container to prevent overlap
  return (
    <div className="space-y-4">
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <div style={{ width: totalWidth, minWidth: totalWidth }}>
            {/* Sticky header outside the vertical scroll */}
            {renderTimelineHeader()}
            {/* Scrollable rows */}
            <div className="max-h-[500px] overflow-y-auto">
              {resources.map((r, i) => renderResourceRow(r, r.assignmentName || 'Unassigned', i % 2 === 0))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

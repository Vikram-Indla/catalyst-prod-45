/**
 * Capacity Planner Gantt — Ring-Fenced Component
 * 
 * ISOLATION: This component uses a dedicated design system that is
 * completely isolated from global Catalyst themes. All styles use
 * !important to prevent inheritance issues.
 * 
 * DO NOT modify the CSS file without reviewing the design tokens spec.
 */

import React, { useMemo, useCallback, useState } from 'react';
import './capacity-planner-gantt.css';
import '@/styles/capacity-module.css';
import { ChevronLeft, ChevronRight, Calendar, Download, LayoutGrid } from 'lucide-react';
import type { ResourceAllocation } from '@/modules/capacity-planner/types';
import { getContractStatus } from '@/lib/constants/catalyst-colors';
import { useRealtimeAllocations } from '@/hooks/useRealtimeAllocations';
import { useCapacityDepartments } from '@/modules/capacity-planner/hooks/useCapacityDepartments';
import { cn } from '@/lib/utils';
import { AnalyticsDepartmentTabs } from '@/components/capacity/CapacityAnalyticsView';

// Consistent department order across all Capacity views
const DEPARTMENT_ORDER = ['Delivery', 'Product', 'Operations', 'Technical Support', 'Governance'];
// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

interface ResourceMetric {
  id: string;
  name: string;
  role?: string;
  department?: string;
  allocation?: number;
  contractEndDate?: string | null;
  assignmentName?: string;
  country_flag_svg?: string | null;
}

interface TimelinePeriod {
  label: string;
  monthName: string;
  year: number;
  key: string;
  start: Date;
  end: Date;
  isCurrent: boolean;
  weeks: { num: number; key: string }[];
}

interface CapacityPlannerGanttProps {
  resources: ResourceMetric[];
  allocations?: ResourceAllocation[];
  year?: number;
  onEditResource?: (id: string) => void;
  className?: string;
}

// ═══════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════

const MONTH_WIDTH = 140; // pixels per month
const RESOURCE_COLUMN_WIDTH = 260;

// ═══════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function getWeeksInMonth(year: number, month: number): number {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startDay = firstDay.getDay();
  return Math.ceil((daysInMonth + startDay) / 7);
}

function getAvatarColor(name: string): string {
  const colors = ['teal', 'blue', 'amber', 'violet'];
  const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[hash % colors.length];
}

function getUtilizationClass(percent: number): string {
  if (percent > 100) return 'over';
  if (percent >= 81) return 'high';
  if (percent >= 51) return 'medium';
  return 'low';
}

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

export function CapacityPlannerGantt({
  resources,
  allocations = [],
  year = 2026,
  onEditResource,
  className,
}: CapacityPlannerGanttProps) {
  const [viewMode, setViewMode] = useState<'weeks' | 'months'>('months');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();

  // Fetch departments for filter
  const { departments } = useCapacityDepartments();

  // Enable real-time subscriptions
  useRealtimeAllocations();

  // Filter resources by department
  const filteredResources = useMemo(() => {
    if (selectedDepartment === 'all') return resources;
    return resources.filter(r => 
      r.department?.toLowerCase() === selectedDepartment.toLowerCase()
    );
  }, [resources, selectedDepartment]);

  // Build Utilization-identical tabs (id/name/count) in the mandated order
  const departmentTabs = useMemo(() => {
    const tabs = [
      { id: 'all', name: 'All Departments', count: resources.length },
      ...DEPARTMENT_ORDER.map((deptName) => ({
        id: deptName.toLowerCase(),
        name: deptName,
        count: resources.filter(r => r.department?.toLowerCase() === deptName.toLowerCase()).length,
      }))
    ];
    return tabs;
  }, [resources]);

  // Generate months for timeline
  const months = useMemo((): TimelinePeriod[] => {
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                        'July', 'August', 'September', 'October', 'November', 'December'];
    
    return Array.from({ length: 12 }, (_, index) => {
      const monthIndex = index;
      const start = new Date(year, monthIndex, 1);
      const end = new Date(year, monthIndex + 1, 0);
      const weeksCount = getWeeksInMonth(year, monthIndex);
      
      return {
        label: `${monthNames[monthIndex].slice(0, 3)} '${String(year).slice(2)}`,
        monthName: monthNames[monthIndex],
        year: year,
        key: `${year}-${String(monthIndex + 1).padStart(2, '0')}`,
        start,
        end,
        isCurrent: monthIndex === currentMonth && year === currentYear,
        weeks: Array.from({ length: weeksCount }, (_, i) => ({
          num: i + 1,
          key: `${year}-${monthIndex}-w${i + 1}`,
        })),
      };
    });
  }, [year, currentMonth, currentYear]);

  const timelineStartDate = months[0]?.start || new Date(year, 0, 1);
  const timelineEndDate = months[months.length - 1]?.end || new Date(year, 11, 31);

  // ═══════════════════════════════════════════════════════════════
  // MERGE MONTHLY ALLOCATION FRAGMENTS BY ASSIGNMENT
  // The database stores allocations as monthly fragments, but we need
  // to display them as single continuous bars per assignment.
  // ═══════════════════════════════════════════════════════════════
  const mergedAllocations = useMemo(() => {
    // Group by (resource_id, assignment_id, status) to merge consecutive months
    const groupKey = (a: ResourceAllocation) => 
      `${a.resource_id || a.profile_id}::${a.assignment_id}::${a.status}`;
    
    const grouped = new Map<string, ResourceAllocation[]>();
    allocations.forEach((a) => {
      const key = groupKey(a);
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(a);
    });

    // Merge each group into a single allocation with min start_date and max end_date
    const merged: ResourceAllocation[] = [];
    grouped.forEach((fragments, _key) => {
      if (fragments.length === 0) return;
      
      // Sort by start_date to find the true range
      fragments.sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());
      
      const first = fragments[0];
      const minStart = fragments.reduce((min, f) => 
        new Date(f.start_date) < new Date(min) ? f.start_date : min, first.start_date);
      const maxEnd = fragments.reduce((max, f) => 
        new Date(f.end_date) > new Date(max) ? f.end_date : max, first.end_date);
      
      // Use the first fragment's percent (they should all be the same for the same assignment)
      merged.push({
        ...first,
        start_date: minStart,
        end_date: maxEnd,
        // Track original IDs for potential editing operations
        originalIds: fragments.map(f => f.id),
      } as ResourceAllocation & { originalIds: string[] });
    });

    return merged;
  }, [allocations]);

  // Build allocation map by resource (using merged allocations)
  const allocationsByResource = useMemo(() => {
    const map = new Map<string, ResourceAllocation[]>();
    mergedAllocations.forEach((a) => {
      if (a.profile_id) {
        if (!map.has(a.profile_id)) map.set(a.profile_id, []);
        map.get(a.profile_id)!.push(a);
      }
      if (a.resource_id && a.resource_id !== a.profile_id) {
        if (!map.has(a.resource_id)) map.set(a.resource_id, []);
        map.get(a.resource_id)!.push(a);
      }
    });
    return map;
  }, [mergedAllocations]);

  // Calculate bar position
  const calculateBarPosition = useCallback((alloc: ResourceAllocation) => {
    const allocStart = new Date(alloc.start_date);
    const allocEnd = new Date(alloc.end_date);
    
    const visibleStart = allocStart < timelineStartDate ? timelineStartDate : allocStart;
    const visibleEnd = allocEnd > timelineEndDate ? timelineEndDate : allocEnd;
    
    if (visibleStart > timelineEndDate || visibleEnd < timelineStartDate) {
      return null;
    }
    
    const totalDays = (timelineEndDate.getTime() - timelineStartDate.getTime()) / (1000 * 60 * 60 * 24);
    const startDays = (visibleStart.getTime() - timelineStartDate.getTime()) / (1000 * 60 * 60 * 24);
    const durationDays = (visibleEnd.getTime() - visibleStart.getTime()) / (1000 * 60 * 60 * 24);
    
    const totalWidth = months.length * MONTH_WIDTH;
    const leftPx = (startDays / totalDays) * totalWidth;
    const widthPx = (durationDays / totalDays) * totalWidth;
    
    return { leftPx, widthPx };
  }, [months.length, timelineStartDate, timelineEndDate]);

  // Calculate contract marker position
  const getContractMarkerPosition = useCallback((contractEndDate: string | null | undefined) => {
    if (!contractEndDate) return null;
    
    const endDate = new Date(contractEndDate);
    if (endDate < timelineStartDate || endDate > timelineEndDate) {
      return null;
    }
    
    const totalDays = (timelineEndDate.getTime() - timelineStartDate.getTime()) / (1000 * 60 * 60 * 24);
    const endDays = (endDate.getTime() - timelineStartDate.getTime()) / (1000 * 60 * 60 * 24);
    const totalWidth = months.length * MONTH_WIDTH;
    
    return (endDays / totalDays) * totalWidth;
  }, [months.length, timelineStartDate, timelineEndDate]);

  // Calculate today marker position
  const todayMarkerPosition = useMemo(() => {
    const today = new Date();
    if (today < timelineStartDate || today > timelineEndDate) return null;
    
    const totalDays = (timelineEndDate.getTime() - timelineStartDate.getTime()) / (1000 * 60 * 60 * 24);
    const todayDays = (today.getTime() - timelineStartDate.getTime()) / (1000 * 60 * 60 * 24);
    const totalWidth = months.length * MONTH_WIDTH;
    
    return (todayDays / totalDays) * totalWidth;
  }, [months.length, timelineStartDate, timelineEndDate]);

  // Calculate resource utilization
  const getResourceUtilization = useCallback((resourceId: string) => {
    const resourceAllocs = allocationsByResource.get(resourceId) || [];
    const currentAllocs = resourceAllocs.filter(a => {
      const start = new Date(a.start_date);
      const end = new Date(a.end_date);
      return start <= currentDate && end >= currentDate;
    });
    return currentAllocs.reduce((sum, a) => sum + (a.allocation_percent || 0), 0);
  }, [allocationsByResource, currentDate]);

  // Summary stats
  const summaryStats = useMemo(() => {
    let committedCount = 0;
    let forecastCount = 0;
    allocations.forEach(a => {
      if (a.status === 'forecast') forecastCount++;
      else committedCount++;
    });
    return { committedCount, forecastCount };
  }, [allocations]);

  const totalWidth = months.length * MONTH_WIDTH;

  return (
    <div className={`capacity-gantt-container ${className || ''}`}>
      {/* Toolbar */}
      <div className="cpg-toolbar">
        <div className="cpg-toolbar-left">
          {/* Icon only (no label) to match Utilization header */}
          <h2 className="cpg-toolbar-title" aria-label="Resource Timeline">
            <LayoutGrid />
          </h2>
          <div className="cpg-date-navigator">
            <button className="cpg-nav-btn">
              <ChevronLeft />
            </button>
            <span className="cpg-date-range">
              {months[0]?.monthName} – {months[11]?.monthName} {year}
            </span>
            <button className="cpg-nav-btn">
              <ChevronRight />
            </button>
          </div>
        </div>
        <div className="cpg-toolbar-right">
          <div className="cpg-view-toggle">
            <button 
              className={`cpg-view-btn ${viewMode === 'weeks' ? 'active' : ''}`}
              onClick={() => setViewMode('weeks')}
            >
              Weeks
            </button>
            <button 
              className={`cpg-view-btn ${viewMode === 'months' ? 'active' : ''}`}
              onClick={() => setViewMode('months')}
            >
              Months
            </button>
          </div>
          <button className="cpg-today-btn">
            <span className="cpg-today-dot" />
            Today
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="cpg-legend">
        <div className="cpg-legend-item">
          <div className="cpg-legend-bar committed" />
          <span>Committed</span>
        </div>
        <div className="cpg-legend-item">
          <div className="cpg-legend-bar forecast" />
          <span>Forecast</span>
        </div>
        <div className="cpg-legend-item">
          <div className="cpg-legend-bar available" />
          <span>Available</span>
        </div>
        <div className="cpg-legend-item">
          <div className="cpg-legend-util">
            <div className="cpg-legend-util-bar low" />
            <div className="cpg-legend-util-bar medium" />
            <div className="cpg-legend-util-bar high" />
          </div>
          <span>Utilization</span>
        </div>
      </div>

      {/* Gantt Container with attached filters */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        {/* Department Filter Pills - Same styling as Utilization tab */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <AnalyticsDepartmentTabs
            tabs={departmentTabs}
            activeTab={selectedDepartment}
            onTabChange={setSelectedDepartment}
          />
        </div>

      {/* Gantt Wrapper */}
      <div className="cpg-wrapper">
        {/* Global Today Marker - single line spanning all rows */}
        {todayMarkerPosition !== null && (
          <div 
            className="cpg-today-marker-global"
            style={{ left: RESOURCE_COLUMN_WIDTH + todayMarkerPosition }}
          >
            <div className="cpg-today-line" />
          </div>
        )}
        <div className="cpg-grid" style={{ gridTemplateColumns: `${RESOURCE_COLUMN_WIDTH}px 1fr` }}>
          {/* Header */}
          <div className="cpg-header">
            <div className="cpg-header-resource">
              <span className="cpg-header-label">Resource</span>
            </div>
            <div className="cpg-header-timeline">
              <div className="cpg-months-row">
                {months.map(month => (
                  <div 
                    key={month.key} 
                    className={`cpg-month-header ${month.isCurrent ? 'current' : ''}`}
                    style={{ minWidth: MONTH_WIDTH }}
                  >
                    <span className="cpg-month-name">
                      {month.monthName.slice(0, 3)}
                      {month.isCurrent && (
                        <span className="cpg-current-badge">
                          <span style={{ width: 6, height: 6, background: '#fff', borderRadius: '50%', display: 'inline-block' }} />
                          Now
                        </span>
                      )}
                    </span>
                    <span className="cpg-month-year">{month.year}</span>
                  </div>
                ))}
              </div>
              {viewMode === 'weeks' && (
                <div className="cpg-weeks-row">
                  {months.flatMap(month => 
                    month.weeks.map(week => (
                      <div key={week.key} className="cpg-week-cell">
                        W{week.num}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Body */}
          <div className="cpg-body">
            {filteredResources.map(resource => {
              const resourceAllocs = allocationsByResource.get(resource.id) || 
                                    allocationsByResource.get((resource as any).resourceInventoryId) || [];
              const contractInfo = getContractStatus(resource.contractEndDate);
              const contractMarkerLeft = getContractMarkerPosition(resource.contractEndDate);
              const utilization = getResourceUtilization(resource.id);
              const utilClass = getUtilizationClass(utilization);

              return (
                <div key={resource.id} className="cpg-row">
                  {/* Resource Cell */}
                  <div className="cpg-resource-cell">
                    <div className={`cpg-avatar ${getAvatarColor(resource.name)}`}>
                      {getInitials(resource.name)}
                    </div>
                    <div className="cpg-resource-info">
                      <div className="cpg-resource-name">{resource.name}</div>
                      <div className="cpg-resource-role">{resource.role || 'Team Member'}</div>
                      <div className="cpg-resource-meta">
                        <div className="cpg-util-container">
                          <div className="cpg-util-track">
                            <div 
                              className={`cpg-util-fill ${utilClass}`}
                              style={{ width: `${Math.min(utilization, 100)}%` }}
                            />
                          </div>
                          <span className={`cpg-util-percent ${utilClass}`}>
                            {utilization}%
                          </span>
                        </div>
                        {resource.contractEndDate && (
                          <div className={`cpg-contract-badge ${contractInfo.status === 'warning' || contractInfo.status === 'critical' ? 'ending-soon' : ''}`}>
                            <Calendar style={{ width: 10, height: 10 }} />
                            {new Date(resource.contractEndDate).toLocaleDateString('en-US', { month: 'short', year: '2-digit' })}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Timeline Cell */}
                  <div className="cpg-timeline-cell">
                    {/* Grid Background */}
                    <div className="cpg-timeline-grid">
                      {months.map(month => (
                        <div key={month.key} className="cpg-grid-month">
                          {viewMode === 'weeks' && month.weeks.map(week => (
                            <div key={week.key} className="cpg-grid-week" />
                          ))}
                        </div>
                      ))}
                    </div>

                    {/* Assignments Container */}
                    <div className="cpg-assignments">
                      {resourceAllocs.map((alloc, idx) => {
                        const pos = calculateBarPosition(alloc);
                        if (!pos) return null;
                        
                        const isForecast = alloc.status === 'forecast';
                        const totalBars = resourceAllocs.length;
                        const barHeight = totalBars === 1 ? 32 : totalBars === 2 ? 26 : 20;
                        const gap = 4;
                        const topOffset = idx * (barHeight + gap);

                        return (
                          <div
                            key={alloc.id || idx}
                            className={`cpg-pill ${isForecast ? 'forecast' : 'committed'}`}
                            style={{
                              left: pos.leftPx,
                              width: Math.max(pos.widthPx, 100),
                              top: topOffset,
                              height: barHeight,
                            }}
                            onClick={() => onEditResource?.(resource.id)}
                          >
                            <span className="cpg-pill-name">
                              {alloc.assignment_name || 'Assignment'}
                            </span>
                            <span className="cpg-pill-allocation">
                              {alloc.allocation_percent}%
                            </span>
                          </div>
                        );
                      })}

                      {/* Today marker is now rendered globally at container level */}

                      {/* Contract End Zone */}
                      {contractMarkerLeft !== null && contractInfo.status !== 'permanent' && (
                        <>
                          <div 
                            className="cpg-contract-marker"
                            style={{ left: contractMarkerLeft }}
                          />
                          <div 
                            className="cpg-contract-zone"
                            style={{ left: contractMarkerLeft, right: 0 }}
                          >
                            <div className="cpg-contract-label">
                              Contract ends {new Date(resource.contractEndDate!).toLocaleDateString('en-US', { 
                                month: 'short', 
                                day: 'numeric' 
                              })}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      </div> {/* Close Gantt Container with attached filters */}

      {/* Summary Footer */}
      <div className="cpg-summary">
        <div className="cpg-summary-stats">
          <div className="cpg-summary-stat">
            <span className="cpg-stat-label">Committed:</span>
            <span className="cpg-stat-value committed">{summaryStats.committedCount}</span>
          </div>
          <div className="cpg-summary-stat">
            <span className="cpg-stat-label">Forecast:</span>
            <span className="cpg-stat-value forecast">{summaryStats.forecastCount}</span>
          </div>
        </div>
        <div className="cpg-summary-actions">
          <button className="cpg-export-btn">
            <Download />
            Export
          </button>
        </div>
      </div>
    </div>
  );
}

export default CapacityPlannerGantt;

/**
 * Enhanced Timeline View Component
 * Catalyst V5 Design System - 9.9/10 Design Craft
 * 
 * Features:
 * - Full viewport height
 * - Gradient allocation bars with depth
 * - Contract status rings on avatars
 * - Elegant available cells
 * - Contract end markers
 * - Locked zones post-contract
 */

import React, { useMemo, useCallback, useState } from 'react';
import { cn } from '@/lib/utils';
import { CATALYST_COLORS, getContractStatus, getTimelineBarStyle } from '@/lib/constants/catalyst-colors';
import styles from './Timeline.module.css';
import type { ResourceAllocation } from '@/modules/capacity-planner/types';
import { DraggableAllocationBar } from './DraggableAllocationBar';
import { useRealtimeAllocations } from '@/hooks/useRealtimeAllocations';
import { SyncStatusProvider } from '@/contexts/SyncStatusContext';
import { SyncStatusIndicator } from '@/components/ui/SyncStatusIndicator';

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
}

interface TimelinePeriod {
  label: string;
  key: string;
  start: Date;
  end: Date;
  isCurrent: boolean;
}

type GroupByType = 'none' | 'assignment' | 'department';

interface EnhancedTimelineViewProps {
  resources: ResourceMetric[];
  allocations?: ResourceAllocation[];
  year?: number;
  onEditResource?: (id: string) => void;
  className?: string;
  groupBy?: GroupByType;
  groupedByAssignment?: Record<string, ResourceMetric[]>;
}

// ═══════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════

const MONTH_WIDTH = 110; // pixels per month (V10 spec)
const RESOURCE_COLUMN_WIDTH = 220;

// ═══════════════════════════════════════════════════════════════
// HELPER COMPONENTS
// ═══════════════════════════════════════════════════════════════

interface AvatarProps {
  initials: string;
  contractEndDate?: string | null;
}

function ResourceAvatar({ initials, contractEndDate }: AvatarProps) {
  const contractInfo = getContractStatus(contractEndDate);
  
  const ringClass = cn(styles.avatarRing, {
    [styles.ringTeal]: contractInfo.status === 'healthy',
    [styles.ringWarning]: contractInfo.status === 'warning',
    [styles.ringDanger]: contractInfo.status === 'critical',
    [styles.ringGray]: contractInfo.status === 'permanent' || contractInfo.status === 'expired',
  });

  return (
    <div className={styles.avatarWrapper}>
      <div className={cn(styles.avatar, styles.avatarPrimary)}>
        {initials}
      </div>
      <div className={ringClass} />
    </div>
  );
}

interface AllocationBarProps {
  allocation: ResourceAllocation;
  leftPx: number;
  widthPx: number;
  rowIndex: number;
  totalBars: number;
  onClick?: () => void;
}

function AllocationBar({ allocation, leftPx, widthPx, rowIndex, totalBars, onClick }: AllocationBarProps) {
  const projectName = allocation.assignment_name || 'Allocation';
  const barStyle = getTimelineBarStyle(projectName);
  const isForecast = allocation.status === 'forecast';
  
  // Determine bar class based on project - with forecast variant
  const getBarClass = () => {
    const name = projectName.toLowerCase();
    if (name.includes('bau') || name.includes('ops') || name.includes('platform')) {
      return isForecast ? styles.barPrimaryForecast : styles.barPrimary;
    }
    if (name.includes('innovation') || name.includes('alpha') || name.includes('tahommena')) {
      return isForecast ? styles.barTealForecast : styles.barTeal;
    }
    if (name.includes('website') || name.includes('design') || name.includes('review')) {
      return isForecast ? styles.barWarningForecast : styles.barWarning;
    }
    if (name.includes('inspection') || name.includes('international') || name.includes('mim')) {
      return isForecast ? styles.barTealForecast : styles.barTeal;
    }
    if (name.includes('sectorial') || name.includes('strategy')) {
      return isForecast ? styles.barSlateForecast : styles.barSlate;
    }
    return isForecast ? styles.barPrimaryForecast : styles.barPrimary;
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Calculate vertical position - stack bars within the row without overflow
  // Row height is dynamic based on number of bars
  const baseRowHeight = 72;
  const padding = 4;
  const gap = 2;
  
  // Calculate bar height based on number of bars
  let barHeight: number;
  let topPx: number;
  
  if (totalBars === 1) {
    barHeight = 32;
    topPx = (baseRowHeight - barHeight) / 2;
  } else if (totalBars === 2) {
    barHeight = 26;
    const totalNeeded = (barHeight * 2) + gap;
    const startOffset = (baseRowHeight - totalNeeded) / 2;
    topPx = startOffset + (rowIndex * (barHeight + gap));
  } else {
    // 3+ bars - compress them to fit
    barHeight = Math.max(18, Math.floor((baseRowHeight - padding * 2 - (gap * (totalBars - 1))) / totalBars));
    topPx = padding + (rowIndex * (barHeight + gap));
  }

  return (
    <div
      className={cn(styles.allocationBar, getBarClass())}
      style={{
        left: leftPx,
        width: Math.max(widthPx, 80),
        top: topPx,
        height: barHeight,
      }}
      onClick={onClick}
      title={`${projectName}: ${allocation.allocation_percent}%`}
    >
      <span className="truncate">
        {projectName} ({allocation.allocation_percent}%)
      </span>
      <div className={styles.barTooltip}>
        <div className="font-semibold mb-1">{projectName}</div>
        <div className="text-muted-foreground text-[11px]">
          {formatDate(allocation.start_date)} – {formatDate(allocation.end_date)}
        </div>
        <div className="mt-1">
          <span className="text-muted-foreground">Allocation:</span>{' '}
          <span className="font-medium">{allocation.allocation_percent}%</span>
        </div>
      </div>
    </div>
  );
}

function AvailableCell({ onClick }: { onClick?: () => void }) {
  return (
    <div className={styles.availableCell} onClick={onClick}>
      <div className={styles.availableDot} />
      <span className={styles.availableLabel}>Available</span>
    </div>
  );
}

interface ContractMarkerProps {
  leftPx: number;
  status: 'healthy' | 'warning' | 'critical';
  date: string;
}

function ContractMarker({ leftPx, status, date }: ContractMarkerProps) {
  const markerClass = cn(styles.contractMarker, {
    [styles.markerTeal]: status === 'healthy',
    [styles.markerWarning]: status === 'warning',
    [styles.markerDanger]: status === 'critical',
  });

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className={markerClass} style={{ left: leftPx }}>
      <div className={styles.contractMarkerLine} />
      <div className={styles.contractMarkerDot} />
      <div className={styles.contractMarkerBadge}>{formatDate(date)}</div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

export function EnhancedTimelineView({
  resources,
  allocations = [],
  year = 2026,
  onEditResource,
  className,
  groupBy = 'none',
  groupedByAssignment = {},
}: EnhancedTimelineViewProps) {
  
  // Generate months for timeline (full year Jan-Dec)
  const months = useMemo((): TimelinePeriod[] => {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    
    return Array.from({ length: 12 }, (_, index) => {
      const monthIndex = index;
      const start = new Date(year, monthIndex, 1);
      const end = new Date(year, monthIndex + 1, 0);
      
      return {
        label: `${monthNames[monthIndex]} '${String(year).slice(2)}`,
        key: `${year}-${String(monthIndex + 1).padStart(2, '0')}`,
        start,
        end,
        isCurrent: monthIndex === currentMonth && year === currentYear,
      };
    });
  }, [year]);

  const timelineStartDate = months[0]?.start || new Date(year, 0, 1);
  const timelineEndDate = months[months.length - 1]?.end || new Date(year, 11, 31);

  // Build allocation map by resource
  const allocationsByResource = useMemo(() => {
    const map = new Map<string, ResourceAllocation[]>();
    allocations.forEach((a) => {
      const key = a.profile_id || a.resource_id;
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key)!.push(a);
    });
    return map;
  }, [allocations]);

  // Calculate bar position
  const calculateBarPosition = useCallback((alloc: ResourceAllocation) => {
    const allocStart = new Date(alloc.start_date);
    const allocEnd = new Date(alloc.end_date);
    
    // Clamp to visible range
    const visibleStart = allocStart < timelineStartDate ? timelineStartDate : allocStart;
    const visibleEnd = allocEnd > timelineEndDate ? timelineEndDate : allocEnd;
    
    if (visibleStart > timelineEndDate || visibleEnd < timelineStartDate) {
      return null; // Not visible
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

  // Get initials from name
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Check if a month has allocation coverage
  const hasAllocationInMonth = (resourceId: string, month: TimelinePeriod) => {
    const resourceAllocs = allocationsByResource.get(resourceId) || [];
    return resourceAllocs.some(a => {
      const allocStart = new Date(a.start_date);
      const allocEnd = new Date(a.end_date);
      return allocStart <= month.end && allocEnd >= month.start;
    });
  };

  // Check if month is after contract end
  const isMonthLocked = (contractEndDate: string | null | undefined, month: TimelinePeriod) => {
    if (!contractEndDate) return false;
    const endDate = new Date(contractEndDate);
    return endDate < month.start;
  };

  // Enable real-time subscriptions
  useRealtimeAllocations();
  
  // Dragging state
  const [isDraggingAny, setIsDraggingAny] = useState(false);
  
  const totalWidth = months.length * MONTH_WIDTH;

  return (
    <SyncStatusProvider>
      <div className={cn(styles.timelineContainer, className)}>
        {/* Header */}
        <div className={styles.timelineHeader}>
          <div className={styles.resourceColumnHeader}>
            Resource
          </div>
          <div className={styles.monthsContainer}>
            {months.map(month => (
              <div
                key={month.key}
                className={cn(styles.monthHeader, month.isCurrent && styles.monthHeaderCurrent)}
              >
                {month.label}
              </div>
            ))}
          </div>
          {/* Sync Status Indicator */}
          <div className="absolute top-2 right-4 z-10">
            <SyncStatusIndicator />
          </div>
        </div>

      {/* Body - Grouped or Ungrouped */}
      {groupBy === 'assignment' && Object.keys(groupedByAssignment).length > 0 ? (
        // Grouped by Assignment
        <div className="space-y-4">
          {Object.entries(groupedByAssignment).map(([assignmentName, groupResources]) => (
            <div key={assignmentName} className="border border-border rounded-lg overflow-hidden bg-card">
              {/* Group Header */}
              <div className="px-4 py-3 bg-muted/50 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-sm text-foreground">{assignmentName}</span>
                  <span className="text-xs text-muted-foreground">
                    {groupResources.length} resource{groupResources.length !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>
              {/* Group Timeline */}
              <div className={styles.timelineBody}>
                {groupResources.map((resource) => {
                  const resourceAllocations = allocationsByResource.get(resource.id) || [];
                  const contractInfo = getContractStatus(resource.contractEndDate);
                  const contractMarkerLeft = getContractMarkerPosition(resource.contractEndDate);
                  
                  const isRowCritical = contractInfo.status === 'critical';
                  const hasNoAllocations = resourceAllocations.length === 0;

                  return (
                    <div
                      key={resource.id}
                      className={cn(
                        styles.timelineRow,
                        isRowCritical && styles.rowCritical,
                        hasNoAllocations && styles.rowAvailable
                      )}
                    >
                      {/* Resource Column */}
                      <div className={styles.resourceColumn}>
                        <ResourceAvatar
                          initials={getInitials(resource.name)}
                          contractEndDate={resource.contractEndDate}
                        />
                        <div className={styles.resourceInfo}>
                          <div className={styles.textResourceName}>{resource.name}</div>
                          <div className={styles.textResourceRole}>{resource.role || 'Team Member'}</div>
                        </div>
                      </div>

                      {/* Timeline Cells */}
                      <div className={styles.timelineCells}>
                        {/* Month grid cells */}
                        {months.map(month => {
                          const hasAlloc = hasAllocationInMonth(resource.id, month);
                          const isLocked = isMonthLocked(resource.contractEndDate, month);
                          
                          return (
                            <div
                              key={month.key}
                              className={cn(
                                styles.timelineCell,
                                month.isCurrent && styles.timelineCellCurrent
                              )}
                            >
                              {/* Show available cell only if no allocation and not locked */}
                              {!hasAlloc && !isLocked && (
                                <AvailableCell onClick={() => onEditResource?.(resource.id)} />
                              )}
                            </div>
                          );
                        })}

                        {/* Allocation Bars - Draggable */}
                        {resourceAllocations.map((alloc, idx) => {
                          return (
                            <DraggableAllocationBar
                              key={alloc.id || idx}
                              allocation={{
                                id: alloc.id,
                                start_date: alloc.start_date,
                                end_date: alloc.end_date,
                                allocation_percent: alloc.allocation_percent,
                                assignment_name: alloc.assignment_name,
                                profile_id: alloc.profile_id,
                              }}
                              timelineStartDate={timelineStartDate}
                              timelineEndDate={timelineEndDate}
                              totalWidth={totalWidth}
                              rowIndex={idx}
                              totalBars={resourceAllocations.length}
                              onDragStart={() => setIsDraggingAny(true)}
                              onDragEnd={() => setIsDraggingAny(false)}
                              onClick={() => onEditResource?.(resource.id)}
                            />
                          );
                        })}

                        {/* Contract End Marker */}
                        {contractMarkerLeft !== null && 
                         contractInfo.status !== 'permanent' && 
                         contractInfo.status !== 'expired' && (
                          <ContractMarker
                            leftPx={contractMarkerLeft}
                            status={contractInfo.status as 'healthy' | 'warning' | 'critical'}
                            date={resource.contractEndDate!}
                          />
                        )}

                        {/* Locked Zone with Contract End Date */}
                        {contractMarkerLeft !== null && resource.contractEndDate && (
                          <div
                            className={styles.lockedZone}
                            style={{
                              left: contractMarkerLeft,
                              right: 0,
                            }}
                          >
                            <div className={styles.lockedZoneBadge}>
                              Contract ends {new Date(resource.contractEndDate).toLocaleDateString('en-US', { 
                                month: 'short', 
                                day: 'numeric',
                                year: 'numeric'
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ) : (
        // No grouping - flat list
        <div className={styles.timelineBody}>
          {resources.map((resource) => {
            const resourceAllocations = allocationsByResource.get(resource.id) || [];
            const contractInfo = getContractStatus(resource.contractEndDate);
            const contractMarkerLeft = getContractMarkerPosition(resource.contractEndDate);
            
            const isRowCritical = contractInfo.status === 'critical';
            const hasNoAllocations = resourceAllocations.length === 0;

            return (
              <div
                key={resource.id}
                className={cn(
                  styles.timelineRow,
                  isRowCritical && styles.rowCritical,
                  hasNoAllocations && styles.rowAvailable
                )}
              >
                {/* Resource Column */}
                <div className={styles.resourceColumn}>
                  <ResourceAvatar
                    initials={getInitials(resource.name)}
                    contractEndDate={resource.contractEndDate}
                  />
                  <div className={styles.resourceInfo}>
                    <div className={styles.textResourceName}>{resource.name}</div>
                    <div className={styles.textResourceRole}>{resource.role || 'Team Member'}</div>
                  </div>
                </div>

                {/* Timeline Cells */}
                <div className={styles.timelineCells}>
                  {/* Month grid cells */}
                  {months.map(month => {
                    const hasAlloc = hasAllocationInMonth(resource.id, month);
                    const isLocked = isMonthLocked(resource.contractEndDate, month);
                    
                    return (
                      <div
                        key={month.key}
                        className={cn(
                          styles.timelineCell,
                          month.isCurrent && styles.timelineCellCurrent
                        )}
                      >
                        {/* Show available cell only if no allocation and not locked */}
                        {!hasAlloc && !isLocked && (
                          <AvailableCell onClick={() => onEditResource?.(resource.id)} />
                        )}
                      </div>
                    );
                  })}

                  {/* Allocation Bars - Draggable */}
                  {resourceAllocations.map((alloc, idx) => {
                    return (
                      <DraggableAllocationBar
                        key={alloc.id || idx}
                        allocation={{
                          id: alloc.id,
                          start_date: alloc.start_date,
                          end_date: alloc.end_date,
                          allocation_percent: alloc.allocation_percent,
                          assignment_name: alloc.assignment_name,
                          profile_id: alloc.profile_id,
                        }}
                        timelineStartDate={timelineStartDate}
                        timelineEndDate={timelineEndDate}
                        totalWidth={totalWidth}
                        rowIndex={idx}
                        totalBars={resourceAllocations.length}
                        onDragStart={() => setIsDraggingAny(true)}
                        onDragEnd={() => setIsDraggingAny(false)}
                        onClick={() => onEditResource?.(resource.id)}
                      />
                    );
                  })}

                  {/* Contract End Marker */}
                  {contractMarkerLeft !== null && 
                   contractInfo.status !== 'permanent' && 
                   contractInfo.status !== 'expired' && (
                    <ContractMarker
                      leftPx={contractMarkerLeft}
                      status={contractInfo.status as 'healthy' | 'warning' | 'critical'}
                      date={resource.contractEndDate!}
                    />
                  )}

                  {/* Locked Zone with Contract End Date */}
                  {contractMarkerLeft !== null && resource.contractEndDate && (
                    <div
                      className={styles.lockedZone}
                      style={{
                        left: contractMarkerLeft,
                        right: 0,
                      }}
                    >
                      <div className={styles.lockedZoneBadge}>
                        Contract ends {new Date(resource.contractEndDate).toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Legend */}
      <div className={styles.legend}>
        <div className={styles.legendItem}>
          <div className={cn(styles.legendDot, styles.legendDotCritical)} />
          <span>Critical (&lt;30d)</span>
        </div>
        <div className={styles.legendItem}>
          <div className={cn(styles.legendDot, styles.legendDotWarning)} />
          <span>Warning (30-60d)</span>
        </div>
        <div className={styles.legendItem}>
          <div className={cn(styles.legendDot, styles.legendDotHealthy)} />
          <span>Healthy (60+d)</span>
        </div>
        <div className={styles.legendItem}>
          <div className={cn(styles.legendDot, styles.legendDotPermanent)} />
          <span>Permanent</span>
        </div>
        <div className={styles.legendItem}>
          <div className={styles.legendStripes} />
          <span>Locked</span>
        </div>
        <div className={styles.legendHint}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <path d="M3 9h18" />
          </svg>
          Hover bars for details
        </div>
      </div>
    </div>
    </SyncStatusProvider>
  );
}

export default EnhancedTimelineView;

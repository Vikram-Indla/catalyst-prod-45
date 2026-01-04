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

import React, { useMemo, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { CATALYST_COLORS, getContractStatus, getTimelineBarStyle } from '@/lib/constants/catalyst-colors';
import styles from './Timeline.module.css';
import type { ResourceAllocation } from '@/modules/capacity-planner/types';

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

interface EnhancedTimelineViewProps {
  resources: ResourceMetric[];
  allocations?: ResourceAllocation[];
  year?: number;
  onEditResource?: (id: string) => void;
  className?: string;
}

// ═══════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════

const MONTH_WIDTH = 120; // pixels per month
const RESOURCE_COLUMN_WIDTH = 224;

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
  
  // Determine bar class based on project
  const getBarClass = () => {
    const name = projectName.toLowerCase();
    if (name.includes('bau') || name.includes('ops') || name.includes('platform')) {
      return styles.barPrimary;
    }
    if (name.includes('innovation') || name.includes('alpha') || name.includes('tahommena')) {
      return styles.barTeal;
    }
    if (name.includes('website') || name.includes('design') || name.includes('review')) {
      return styles.barWarning;
    }
    if (name.includes('inspection') || name.includes('international') || name.includes('mim')) {
      return styles.barTeal;
    }
    if (name.includes('sectorial') || name.includes('strategy')) {
      return styles.barSlate;
    }
    return styles.barPrimary;
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Calculate vertical position - stack bars within the row without overflow
  // Row height is 72px, bar height is 32px, we need ~6px padding
  // For single bar: center it (top: 50%, transform: -50%)
  // For multiple bars: stack them evenly with smaller gaps
  const barHeight = 28; // Slightly smaller for multiple bars
  const rowHeight = 72;
  const padding = 6;
  const availableHeight = rowHeight - (padding * 2);
  
  let topPx: number;
  if (totalBars === 1) {
    // Single bar - center it
    topPx = (rowHeight - 32) / 2;
  } else {
    // Multiple bars - stack them with even spacing
    const totalBarSpace = totalBars * barHeight;
    const gap = Math.max(2, (availableHeight - totalBarSpace) / (totalBars + 1));
    topPx = padding + gap + (rowIndex * (barHeight + gap));
  }

  return (
    <div
      className={cn(styles.allocationBar, getBarClass())}
      style={{
        left: leftPx,
        width: Math.max(widthPx, 80),
        top: topPx,
        height: totalBars > 1 ? barHeight : 32,
        transform: 'none', // Remove the transform since we're calculating exact position
      }}
      onClick={onClick}
      title={`${projectName}: ${allocation.allocation_percent}%`}
    >
      <span className="truncate">
        {projectName} ({allocation.allocation_percent}%)
      </span>
      <div className={styles.barTooltip}>
        <div className="font-semibold mb-1">{projectName}</div>
        <div className="text-gray-300 text-[11px]">
          {formatDate(allocation.start_date)} – {formatDate(allocation.end_date)}
        </div>
        <div className="mt-1">
          <span className="text-gray-400">Allocation:</span>{' '}
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
}: EnhancedTimelineViewProps) {
  
  // Generate months for timeline (9 months starting from January)
  const months = useMemo((): TimelinePeriod[] => {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    
    return Array.from({ length: 9 }, (_, index) => {
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
  const timelineEndDate = months[months.length - 1]?.end || new Date(year, 8, 30);

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

  return (
    <div className={cn(styles.timelineContainer, className)}>
      {/* Header */}
      <div className={styles.timelineHeader}>
        <div className={styles.resourceColumnHeader}>Resource</div>
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
      </div>

      {/* Body */}
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

                {/* Allocation Bars - rendered on top */}
                {resourceAllocations.map((alloc, idx) => {
                  const position = calculateBarPosition(alloc);
                  if (!position) return null;
                  
                  return (
                    <AllocationBar
                      key={alloc.id || idx}
                      allocation={alloc}
                      leftPx={position.leftPx}
                      widthPx={position.widthPx}
                      rowIndex={idx}
                      totalBars={resourceAllocations.length}
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
  );
}

export default EnhancedTimelineView;

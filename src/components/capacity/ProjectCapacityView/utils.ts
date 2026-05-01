/**
 * Utility functions for Project Capacity View - Catalyst View 2
 * Pro-rating logic and period calculations
 */

import { 
  startOfWeek, endOfWeek, startOfMonth, endOfMonth,
  addWeeks, addMonths, subWeeks, subMonths,
  format, differenceInDays, max, min, isWithinInterval
} from 'date-fns';
import type { 
  PeriodType, PeriodRange, ProjectAllocation, 
  ProjectAssignment, ProjectUtilization, ResourceInPeriod 
} from './types';

/**
 * Get the period range based on current date and period type
 */
export function getPeriodRange(currentDate: Date, periodType: PeriodType): PeriodRange {
  if (periodType === 'weekly') {
    const start = startOfWeek(currentDate, { weekStartsOn: 0 }); // Sunday
    const end = endOfWeek(currentDate, { weekStartsOn: 0 });
    const days = differenceInDays(end, start) + 1;
    
    return {
      start,
      end,
      label: `${format(start, 'MMM d')} - ${format(end, 'MMM d, yyyy')}`,
      shortLabel: `${format(start, 'MMM d')} - ${format(end, 'd')}`,
      days
    };
  } else {
    const start = startOfMonth(currentDate);
    const end = endOfMonth(currentDate);
    const days = differenceInDays(end, start) + 1;
    
    return {
      start,
      end,
      label: format(currentDate, 'MMMM yyyy'),
      shortLabel: format(currentDate, 'MMM yyyy'),
      days
    };
  }
}

/**
 * Navigate to the next or previous period
 */
export function navigatePeriod(currentDate: Date, periodType: PeriodType, direction: 1 | -1): Date {
  if (periodType === 'weekly') {
    return direction === 1 ? addWeeks(currentDate, 1) : subWeeks(currentDate, 1);
  } else {
    return direction === 1 ? addMonths(currentDate, 1) : subMonths(currentDate, 1);
  }
}

/**
 * Calculate the pro-rated allocation percentage for a specific period
 * This is the core pro-rating logic from the Catalyst View 2 spec
 */
export function calculateResourceAllocationInPeriod(
  allocation: ProjectAllocation,
  periodStart: Date,
  periodEnd: Date
): { committed: number; forecast: number } {
  const allocStart = new Date(allocation.start_date);
  const allocEnd = new Date(allocation.end_date);
  
  // Check if allocation overlaps with period at all
  if (allocEnd < periodStart || allocStart > periodEnd) {
    return { committed: 0, forecast: 0 };
  }
  
  // Calculate overlap
  const overlapStart = max([allocStart, periodStart]);
  const overlapEnd = min([allocEnd, periodEnd]);
  const overlapDays = differenceInDays(overlapEnd, overlapStart) + 1;
  const periodDays = differenceInDays(periodEnd, periodStart) + 1;
  
  // Pro-rate the allocation
  const proRatedPercent = Math.round((overlapDays / periodDays) * allocation.allocation_percent);
  
  // Determine if committed or forecast
  const isCommitted = allocation.allocation_type !== 'forecast';
  
  return {
    committed: isCommitted ? proRatedPercent : 0,
    forecast: isCommitted ? 0 : proRatedPercent
  };
}

/**
 * Get utilization data for a project within a specific period
 */
export function getProjectUtilizationForPeriod(
  project: ProjectAssignment,
  allocations: ProjectAllocation[],
  periodStart: Date,
  periodEnd: Date
): ProjectUtilization {
  // Filter allocations for this project
  const projectAllocations = allocations.filter(
    a => a.assignment_name === project.name || a.assignment_id === project.id
  );
  
  // Group by resource and calculate pro-rated allocations
  const resourceMap = new Map<string, ResourceInPeriod>();
  const deptBreakdown: Record<string, number> = {};
  
  let totalCommitted = 0;
  let totalForecast = 0;
  
  projectAllocations.forEach(alloc => {
    const { committed, forecast } = calculateResourceAllocationInPeriod(alloc, periodStart, periodEnd);
    
    // Skip if no allocation in this period
    if (committed === 0 && forecast === 0) return;
    
    const resourceId = alloc.resource_id || alloc.profile_id || 'unknown';
    const resourceName = alloc.resource_name || alloc.profile_name || 'Unknown';
    
    if (resourceMap.has(resourceId)) {
      const existing = resourceMap.get(resourceId)!;
      existing.committed += committed;
      existing.forecast += forecast;
      existing.total = existing.committed + existing.forecast;
    } else {
      resourceMap.set(resourceId, {
        resource_id: resourceId,
        resource_name: resourceName,
        role_name: alloc.role_name,
        department: alloc.department,
        committed,
        forecast,
        total: committed + forecast
      });
      
      // Track department breakdown (count unique resources per dept)
      const dept = alloc.department || 'Unassigned';
      deptBreakdown[dept] = (deptBreakdown[dept] || 0) + 1;
    }
    
    totalCommitted += committed;
    totalForecast += forecast;
  });
  
  const totalFTE = (totalCommitted + totalForecast) / 100;
  const requiredFTE = project.required_fte || 1; // Default to 1 FTE if not specified
  
  // Determine staffing status
  let status: 'full' | 'partial' | 'under' | 'over';
  if (totalFTE >= requiredFTE * 1.1) {
    status = 'over';
  } else if (totalFTE >= requiredFTE * 0.9) {
    status = 'full';
  } else if (totalFTE > 0) {
    status = 'partial';
  } else {
    status = 'under';
  }
  
  return {
    project,
    totalCommitted,
    totalForecast,
    totalFTE,
    requiredFTE,
    resources: Array.from(resourceMap.values()),
    deptBreakdown,
    status
  };
}

/**
 * Get color for staffing status
 */
export function getStaffingStatusConfig(status: 'full' | 'partial' | 'under' | 'over') {
  // Catalyst V5 compliant colors (Blue, Teal, Gray only)
  const configs = {
    full: {
      label: 'Fully Staffed',
      color: '#0d9488',
      bgClass: 'bg-[#f0fdfa] dark:bg-teal-950/30',
      textClass: 'text-[#0d9488] dark:text-teal-400',
      borderClass: 'border-[#0d9488] dark:border-teal-600',
      dotClass: 'bg-[#0d9488]'
    },
    partial: {
      label: 'Partial',
      color: '#6b7280',
      bgClass: 'bg-[var(--ds-surface-sunken,var(--ds-surface-sunken, #f8fafc))] dark:bg-slate-950/30',
      textClass: 'text-[#6b7280] dark:text-slate-400',
      borderClass: 'border-[#6b7280] dark:border-slate-600',
      dotClass: 'bg-[#6b7280]'
    },
    under: {
      label: 'Understaffed',
      color: 'var(--ds-text-brand, var(--ds-text-brand, #2563eb))',
      bgClass: 'bg-[var(--ds-background-selected,var(--ds-background-selected, #eff6ff))] dark:bg-blue-950/30',
      textClass: 'text-[var(--ds-text-brand,var(--ds-text-brand, #2563eb))] dark:text-blue-400',
      borderClass: 'border-[var(--ds-text-brand,var(--ds-text-brand, #2563eb))] dark:border-blue-600',
      dotClass: 'bg-[var(--ds-text-brand,var(--ds-text-brand, #2563eb))]'
    },
    over: {
      label: 'Over-Allocated',
      color: '#0d9488',
      bgClass: 'bg-[#f0fdfa] dark:bg-teal-950/30',
      textClass: 'text-[#0d9488] dark:text-teal-400',
      borderClass: 'border-[#0d9488] dark:border-teal-600',
      dotClass: 'bg-[#0d9488]'
    }
  };
  
  return configs[status];
}

/**
 * Format FTE number for display
 */
export function formatFTE(value: number): string {
  if (value === 0) return '0';
  if (value >= 1) return value.toFixed(1).replace(/\.0$/, '');
  return value.toFixed(2).replace(/\.?0+$/, '');
}

/**
 * Get project color with deterministic fallback
 */
const PROJECT_COLORS = [
  'var(--ds-text-brand, var(--ds-text-brand, #2563eb))', // Blue
  '#0d9488', // Teal
  '#10b981', // Green
  '#6366f1', // Indigo
  '#8b5cf6', // Violet
  '#0891b2', // Cyan
  '#059669', // Emerald
  'var(--ds-text-brand, var(--ds-text-brand, #3b82f6))', // Light Blue
];

export function getProjectColor(name: string, existingColor?: string): string {
  if (existingColor) return existingColor;
  
  // Deterministic hash based on name
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = ((hash << 5) - hash) + name.charCodeAt(i);
    hash = hash & hash;
  }
  
  return PROJECT_COLORS[Math.abs(hash) % PROJECT_COLORS.length];
}

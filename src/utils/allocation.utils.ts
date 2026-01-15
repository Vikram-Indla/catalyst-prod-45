/**
 * Allocation Utility Functions
 * Helper functions for resource allocation calculations
 */

import { 
  format, 
  startOfWeek, 
  endOfWeek, 
  addWeeks, 
  addDays,
  getISOWeek,
  isBefore,
  isAfter,
  isSameWeek,
  parseISO,
  startOfDay
} from 'date-fns';
import type { 
  Allocation, 
  AllocationStatus,
  VisualState, 
  WeekColumn, 
  WeekValidation,
  ValidationResult,
  Assignment
} from '@/types/resource-allocation.types';
import { ASSIGNMENT_COLORS } from '@/types/resource-allocation.types';

/**
 * Determine visual state based on allocation and current date
 */
export function getVisualState(
  allocation: Allocation, 
  today: Date = new Date()
): VisualState {
  const weekStart = parseISO(allocation.weekStart);
  const todayStart = startOfDay(today);
  
  // Past + Committed = Actual (locked)
  if (allocation.status === 'committed' && isBefore(weekStart, startOfWeek(todayStart, { weekStartsOn: 1 }))) {
    return 'actual';
  }
  
  return allocation.status; // 'committed' or 'forecast'
}

/**
 * Check if a cell is editable
 */
export function isCellEditable(
  weekStart: Date, 
  today: Date = new Date()
): boolean {
  const todayStart = startOfDay(today);
  const currentWeekStart = startOfWeek(todayStart, { weekStartsOn: 1 });
  
  // Past weeks are never editable
  if (isBefore(weekStart, currentWeekStart)) return false;
  
  // Current and future weeks are editable
  return true;
}

/**
 * Calculate week validation
 */
export function validateWeek(
  allocations: Allocation[], 
  weekStart: string
): WeekValidation {
  const weekAllocations = allocations.filter(a => a.weekStart === weekStart);
  
  const committedTotal = weekAllocations
    .filter(a => a.status === 'committed')
    .reduce((sum, a) => sum + a.percentage, 0);
  
  const forecastTotal = weekAllocations
    .filter(a => a.status === 'forecast')
    .reduce((sum, a) => sum + a.percentage, 0);
  
  const grandTotal = committedTotal + forecastTotal;
  
  return {
    weekStart,
    committedTotal,
    forecastTotal,
    grandTotal,
    available: Math.max(0, 100 - committedTotal),
    isOverCommitted: committedTotal > 100,
    isOverForecasted: grandTotal > 100 && committedTotal <= 100,
  };
}

/**
 * Validate all allocations before save
 */
export function validateBeforeSave(allocations: Allocation[]): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Group by week
  const byWeek = allocations.reduce((acc, alloc) => {
    if (!acc[alloc.weekStart]) acc[alloc.weekStart] = [];
    acc[alloc.weekStart].push(alloc);
    return acc;
  }, {} as Record<string, Allocation[]>);
  
  for (const [weekStart, weekAllocations] of Object.entries(byWeek)) {
    const validation = validateWeek(weekAllocations, weekStart);
    
    // ERROR: Over-committed (blocks save)
    if (validation.isOverCommitted) {
      const weekDate = parseISO(weekStart);
      errors.push(`Week ${getISOWeek(weekDate)} exceeds 100% committed allocation (${validation.committedTotal}%)`);
    }
    
    // WARNING: Over-forecasted (allows save)
    if (validation.isOverForecasted) {
      const weekDate = parseISO(weekStart);
      warnings.push(`Week ${getISOWeek(weekDate)} has overlapping forecasts (${validation.grandTotal}%)`);
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Generate visible weeks (12 weeks from offset)
 */
export function generateVisibleWeeks(
  startDate: Date, 
  forecastBoundary: Date, 
  today: Date = new Date()
): WeekColumn[] {
  const weeks: WeekColumn[] = [];
  const todayStart = startOfDay(today);
  
  for (let i = 0; i < 12; i++) {
    const weekStart = startOfWeek(addWeeks(startDate, i), { weekStartsOn: 1 });
    const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
    
    weeks.push({
      weekNumber: getISOWeek(weekStart),
      weekStart: format(weekStart, 'yyyy-MM-dd'),
      weekEnd: format(weekEnd, 'yyyy-MM-dd'),
      label: `W${getISOWeek(weekStart)}`,
      dateRange: formatDateRange(weekStart, weekEnd),
      isPast: isBefore(weekEnd, startOfWeek(todayStart, { weekStartsOn: 1 })),
      isCurrent: isSameWeek(todayStart, weekStart, { weekStartsOn: 1 }),
      isForecast: !isBefore(weekStart, forecastBoundary),
    });
  }
  
  return weeks;
}

/**
 * Format date range for week column
 */
export function formatDateRange(start: Date, end: Date): string {
  const startMonth = format(start, 'MMM');
  const endMonth = format(end, 'MMM');
  
  if (startMonth === endMonth) {
    return `${format(start, 'd')}-${format(end, 'd')}`;
  }
  
  return `${format(start, 'MMM d')}-${format(end, 'd')}`;
}

/**
 * Get color for assignment
 */
export function getAssignmentColor(color: string): string {
  return ASSIGNMENT_COLORS[color] || ASSIGNMENT_COLORS.primary;
}

/**
 * Assign colors to assignments based on order
 */
export function assignColorsToAssignments(assignments: Assignment[]): Assignment[] {
  const colorOrder: Array<'primary' | 'teal' | 'orange' | 'purple'> = ['primary', 'teal', 'orange', 'purple'];
  
  return assignments.map((assignment, index) => ({
    ...assignment,
    color: assignment.color || colorOrder[index % colorOrder.length],
  }));
}

/**
 * Get allocation for a specific cell
 */
export function getAllocationForCell(
  allocations: Allocation[],
  assignmentId: string,
  weekStart: string
): Allocation | undefined {
  return allocations.find(
    a => a.assignmentId === assignmentId && a.weekStart === weekStart
  );
}

/**
 * Calculate total allocation for a week across all assignments
 */
export function getTotalForWeek(
  allocations: Allocation[],
  weekStart: string
): { committed: number; forecast: number; total: number } {
  const weekAllocations = allocations.filter(a => a.weekStart === weekStart);
  
  const committed = weekAllocations
    .filter(a => a.status === 'committed')
    .reduce((sum, a) => sum + a.percentage, 0);
  
  const forecast = weekAllocations
    .filter(a => a.status === 'forecast')
    .reduce((sum, a) => sum + a.percentage, 0);
  
  return {
    committed,
    forecast,
    total: committed + forecast,
  };
}

/**
 * Get the first Monday of the timeline based on contract start
 */
export function getTimelineStart(contractStart: string, weekOffset: number = 0): Date {
  const contractDate = parseISO(contractStart);
  const firstMonday = startOfWeek(contractDate, { weekStartsOn: 1 });
  return addWeeks(firstMonday, weekOffset);
}

/**
 * Calculate default forecast boundary (e.g., 8 weeks from today)
 * Returns ISO date string
 */
export function getDefaultForecastBoundary(today: Date = new Date()): string {
  return format(addWeeks(startOfWeek(today, { weekStartsOn: 1 }), 8), 'yyyy-MM-dd');
}

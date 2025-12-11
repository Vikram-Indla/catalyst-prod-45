/**
 * Epic Time Utilities - Phase II Step 3: Time & Roadmap Alignment
 * 
 * Provides derived time values for Epics using:
 * - initiation_date (start)
 * - target_completion_date (end)
 * 
 * NO PI/Portfolio dependencies.
 */

import { differenceInDays, isAfter, isBefore, startOfQuarter, endOfQuarter, addMonths, format } from 'date-fns';

/**
 * Calculate duration in days between initiation and target completion
 */
export function getEpicDuration(initiationDate: string | null, targetCompletionDate: string | null): number | null {
  if (!initiationDate || !targetCompletionDate) return null;
  
  const start = new Date(initiationDate);
  const end = new Date(targetCompletionDate);
  
  return differenceInDays(end, start);
}

/**
 * Derive quarter label from target_completion_date
 * Returns format: "Q1 2025", "Q2 2025", etc.
 */
export function getQuarterLabel(date: string | null): string | null {
  if (!date) return null;
  
  const d = new Date(date);
  const quarter = Math.ceil((d.getMonth() + 1) / 3);
  const year = d.getFullYear();
  
  return `Q${quarter} ${year}`;
}

/**
 * Get quarter number (1-4) from a date
 */
export function getQuarterNumber(date: Date): number {
  return Math.ceil((date.getMonth() + 1) / 3);
}

/**
 * Get year and quarter key for grouping: "2025-Q1"
 */
export function getQuarterKey(date: string | null): string | null {
  if (!date) return null;
  
  const d = new Date(date);
  const quarter = getQuarterNumber(d);
  const year = d.getFullYear();
  
  return `${year}-Q${quarter}`;
}

/**
 * Check if an Epic is overdue
 * Overdue = target_completion_date < today AND status not in (done, cancelled, accepted)
 */
export function isEpicOverdue(
  targetCompletionDate: string | null, 
  status: string | null | undefined
): boolean {
  if (!targetCompletionDate) return false;
  
  const completedStatuses = ['done', 'cancelled', 'accepted', 'closed'];
  if (status && completedStatuses.includes(status.toLowerCase())) return false;
  
  const target = new Date(targetCompletionDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  return isBefore(target, today);
}

/**
 * Check if an Epic is due this quarter
 */
export function isEpicDueThisQuarter(targetCompletionDate: string | null): boolean {
  if (!targetCompletionDate) return false;
  
  const target = new Date(targetCompletionDate);
  const today = new Date();
  
  const quarterStart = startOfQuarter(today);
  const quarterEnd = endOfQuarter(today);
  
  return target >= quarterStart && target <= quarterEnd;
}

/**
 * Get the current quarter info
 */
export function getCurrentQuarter(): { quarter: number; year: number; label: string } {
  const today = new Date();
  const quarter = getQuarterNumber(today);
  const year = today.getFullYear();
  
  return {
    quarter,
    year,
    label: `Q${quarter} ${year}`,
  };
}

/**
 * Generate quarters for the next N years starting from current
 */
export function generateQuarterOptions(yearsAhead: number = 2): Array<{ value: string; label: string }> {
  const quarters: Array<{ value: string; label: string }> = [];
  const currentYear = new Date().getFullYear();
  
  for (let year = currentYear; year <= currentYear + yearsAhead; year++) {
    for (let q = 1; q <= 4; q++) {
      quarters.push({ 
        value: `Q${q} ${year}`, 
        label: `Q${q} ${year}` 
      });
    }
  }
  
  return quarters;
}

/**
 * Get quarter date range
 */
export function getQuarterDateRange(quarter: number, year: number): { start: Date; end: Date } {
  const quarterStartMonth = (quarter - 1) * 3;
  const start = new Date(year, quarterStartMonth, 1);
  const end = endOfQuarter(start);
  
  return { start, end };
}

/**
 * Parse a quarter string "Q1 2025" into components
 */
export function parseQuarterString(quarterStr: string): { quarter: number; year: number } | null {
  const match = quarterStr.match(/Q(\d)\s*(\d{4})/);
  if (!match) return null;
  
  return {
    quarter: parseInt(match[1], 10),
    year: parseInt(match[2], 10),
  };
}

/**
 * Check if a date falls within a specific quarter
 */
export function isDateInQuarter(date: string | null, quarterStr: string): boolean {
  if (!date) return false;
  
  const parsed = parseQuarterString(quarterStr);
  if (!parsed) return false;
  
  const { start, end } = getQuarterDateRange(parsed.quarter, parsed.year);
  const d = new Date(date);
  
  return d >= start && d <= end;
}

/**
 * Time-based filter options for Epic Backlog
 */
export type TimeframeFilter = 
  | 'all'
  | 'this_month'
  | 'next_3_months'
  | 'this_quarter'
  | 'next_quarter'
  | 'overdue';

/**
 * Get date range for a timeframe filter
 */
export function getTimeframeRange(filter: TimeframeFilter): { start: Date; end: Date } | null {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  switch (filter) {
    case 'this_month': {
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      return { start, end };
    }
    case 'next_3_months': {
      const start = today;
      const end = addMonths(today, 3);
      return { start, end };
    }
    case 'this_quarter': {
      return { start: startOfQuarter(today), end: endOfQuarter(today) };
    }
    case 'next_quarter': {
      const nextQ = addMonths(startOfQuarter(today), 3);
      return { start: nextQ, end: endOfQuarter(nextQ) };
    }
    case 'overdue': {
      // For overdue, we check against today (handled separately)
      return null;
    }
    case 'all':
    default:
      return null;
  }
}

/**
 * Filter epics by timeframe
 */
export function filterEpicsByTimeframe<T extends { target_completion_date?: string | null; status?: string | null }>(
  epics: T[],
  filter: TimeframeFilter
): T[] {
  if (filter === 'all') return epics;
  
  if (filter === 'overdue') {
    return epics.filter(epic => isEpicOverdue(epic.target_completion_date || null, epic.status));
  }
  
  const range = getTimeframeRange(filter);
  if (!range) return epics;
  
  return epics.filter(epic => {
    if (!epic.target_completion_date) return false;
    const target = new Date(epic.target_completion_date);
    return target >= range.start && target <= range.end;
  });
}

/**
 * Sort options for time-based sorting
 */
export type TimeSortOption = 
  | 'target_date_asc'
  | 'target_date_desc'
  | 'overdue_first'
  | 'quarter';

/**
 * Sort epics by time
 */
export function sortEpicsByTime<T extends { target_completion_date?: string | null; status?: string | null }>(
  epics: T[],
  sortOption: TimeSortOption
): T[] {
  const sorted = [...epics];
  
  switch (sortOption) {
    case 'target_date_asc':
      return sorted.sort((a, b) => {
        if (!a.target_completion_date) return 1;
        if (!b.target_completion_date) return -1;
        return new Date(a.target_completion_date).getTime() - new Date(b.target_completion_date).getTime();
      });
      
    case 'target_date_desc':
      return sorted.sort((a, b) => {
        if (!a.target_completion_date) return 1;
        if (!b.target_completion_date) return -1;
        return new Date(b.target_completion_date).getTime() - new Date(a.target_completion_date).getTime();
      });
      
    case 'overdue_first':
      return sorted.sort((a, b) => {
        const aOverdue = isEpicOverdue(a.target_completion_date || null, a.status);
        const bOverdue = isEpicOverdue(b.target_completion_date || null, b.status);
        if (aOverdue && !bOverdue) return -1;
        if (!aOverdue && bOverdue) return 1;
        // Then sort by target date ascending
        if (!a.target_completion_date) return 1;
        if (!b.target_completion_date) return -1;
        return new Date(a.target_completion_date).getTime() - new Date(b.target_completion_date).getTime();
      });
      
    case 'quarter':
      return sorted.sort((a, b) => {
        const qA = getQuarterKey(a.target_completion_date || null);
        const qB = getQuarterKey(b.target_completion_date || null);
        if (!qA) return 1;
        if (!qB) return -1;
        return qA.localeCompare(qB);
      });
      
    default:
      return sorted;
  }
}

/**
 * Group epics by quarter
 */
export function groupEpicsByQuarter<T extends { target_completion_date?: string | null }>(
  epics: T[]
): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  
  epics.forEach(epic => {
    const key = getQuarterKey(epic.target_completion_date || null) || 'Unscheduled';
    const existing = groups.get(key) || [];
    groups.set(key, [...existing, epic]);
  });
  
  // Sort groups by quarter key
  const sortedGroups = new Map(
    Array.from(groups.entries()).sort(([a], [b]) => {
      if (a === 'Unscheduled') return 1;
      if (b === 'Unscheduled') return -1;
      return a.localeCompare(b);
    })
  );
  
  return sortedGroups;
}

import { format, addDays, startOfWeek, differenceInDays, isWeekend as dateIsWeekend, getDay } from 'date-fns';

/**
 * Check if a date is a GCC weekend (Friday or Saturday)
 */
export function isGCCWeekend(date: Date): boolean {
  const day = getDay(date);
  return day === 5 || day === 6; // Friday = 5, Saturday = 6
}

/**
 * Generate date columns for the Gantt timeline
 */
export function generateDateColumns(startDate: Date, weeks: number): Date[] {
  const days = weeks * 7;
  const columns: Date[] = [];
  
  for (let i = 0; i < days; i++) {
    columns.push(addDays(startDate, i));
  }
  
  return columns;
}

/**
 * Format date for display in column header
 */
export function formatColumnDate(date: Date): string {
  return format(date, 'd');
}

/**
 * Format date for display in tooltips
 */
export function formatFullDate(date: Date): string {
  return format(date, 'MMM d, yyyy');
}

/**
 * Get week start for GCC (Sunday)
 */
export function getGCCWeekStart(date: Date): Date {
  return startOfWeek(date, { weekStartsOn: 0 }); // Sunday
}

/**
 * Calculate days between two dates
 */
export function getDaysBetween(start: Date, end: Date): number {
  return differenceInDays(end, start) + 1;
}

/**
 * Get day position in timeline
 */
export function getDayPosition(date: Date, timelineStart: Date): number {
  return differenceInDays(date, timelineStart);
}

/**
 * Check if date is today
 */
export function isToday(date: Date): boolean {
  const today = new Date();
  return format(date, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd');
}

/**
 * Check if date is in the past
 */
export function isPast(date: Date): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date < today;
}

/**
 * Get month label for a date
 */
export function getMonthLabel(date: Date): string {
  return format(date, 'MMM yyyy');
}

/**
 * Group dates by month
 */
export function groupDatesByMonth(dates: Date[]): Map<string, Date[]> {
  const groups = new Map<string, Date[]>();
  
  dates.forEach(date => {
    const key = getMonthLabel(date);
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(date);
  });
  
  return groups;
}

/**
 * Timeline utility functions
 */

import { 
  startOfMonth, 
  endOfMonth, 
  startOfQuarter, 
  endOfQuarter, 
  startOfYear, 
  endOfYear,
  addMonths,
  addQuarters,
  addYears,
  format,
  differenceInDays,
  isWithinInterval,
  isSameMonth,
  isSameQuarter,
  isSameYear,
} from 'date-fns';
import type { TimelinePeriod, TimelineZoom, TimelineConfig } from '../types/roadmap';

/**
 * Generate timeline periods based on zoom level
 */
export function generateTimelinePeriods(config: TimelineConfig): TimelinePeriod[] {
  const { startDate, endDate, zoom } = config;
  const periods: TimelinePeriod[] = [];
  
  let current = new Date(startDate);
  const end = new Date(endDate);
  const today = new Date();

  while (current <= end) {
    let periodStart: Date;
    let periodEnd: Date;
    let label: string;
    let sublabel: string | undefined;
    let key: string;

    switch (zoom) {
      case 'month':
        periodStart = startOfMonth(current);
        periodEnd = endOfMonth(current);
        label = format(current, 'MMM');
        sublabel = format(current, 'yyyy');
        key = format(current, 'yyyy-MM');
        current = addMonths(current, 1);
        break;

      case 'quarter':
        periodStart = startOfQuarter(current);
        periodEnd = endOfQuarter(current);
        const quarter = Math.floor(current.getMonth() / 3) + 1;
        label = `Q${quarter}`;
        sublabel = format(current, 'yyyy');
        key = `${format(current, 'yyyy')}-Q${quarter}`;
        current = addQuarters(current, 1);
        break;

      case 'year':
        periodStart = startOfYear(current);
        periodEnd = endOfYear(current);
        label = format(current, 'yyyy');
        key = format(current, 'yyyy');
        current = addYears(current, 1);
        break;

      default:
        periodStart = startOfQuarter(current);
        periodEnd = endOfQuarter(current);
        label = `Q${Math.floor(current.getMonth() / 3) + 1}`;
        sublabel = format(current, 'yyyy');
        key = `${format(current, 'yyyy')}-Q${Math.floor(current.getMonth() / 3) + 1}`;
        current = addQuarters(current, 1);
    }

    const isCurrent = isWithinInterval(today, { start: periodStart, end: periodEnd });

    periods.push({
      key,
      label,
      sublabel,
      startDate: periodStart,
      endDate: periodEnd,
      isCurrent,
    });
  }

  return periods;
}

/**
 * Calculate the position and width of a timeline bar as percentages
 */
export function calculateBarPosition(
  startDate: string | null,
  endDate: string | null,
  timelineStart: Date,
  timelineEnd: Date
): { left: number; width: number } | null {
  if (!startDate || !endDate) return null;

  const barStart = new Date(startDate);
  const barEnd = new Date(endDate);
  
  // If bar is completely outside timeline, return null
  if (barEnd < timelineStart || barStart > timelineEnd) return null;

  const totalDays = differenceInDays(timelineEnd, timelineStart);
  if (totalDays <= 0) return null;

  // Clamp dates to timeline bounds
  const clampedStart = barStart < timelineStart ? timelineStart : barStart;
  const clampedEnd = barEnd > timelineEnd ? timelineEnd : barEnd;

  const startOffset = differenceInDays(clampedStart, timelineStart);
  const duration = differenceInDays(clampedEnd, clampedStart) + 1; // +1 to include end date

  const left = (startOffset / totalDays) * 100;
  const width = (duration / totalDays) * 100;

  return { left: Math.max(0, left), width: Math.max(1, Math.min(100 - left, width)) };
}

/**
 * Calculate the position of the "today" marker as a percentage
 */
export function calculateTodayPosition(
  timelineStart: Date,
  timelineEnd: Date
): number | null {
  const today = new Date();
  
  if (today < timelineStart || today > timelineEnd) return null;

  const totalDays = differenceInDays(timelineEnd, timelineStart);
  if (totalDays <= 0) return null;

  const daysFromStart = differenceInDays(today, timelineStart);
  return (daysFromStart / totalDays) * 100;
}

/**
 * Get the date from a percentage position on the timeline
 */
export function getDateFromPosition(
  percentage: number,
  timelineStart: Date,
  timelineEnd: Date
): Date {
  const totalDays = differenceInDays(timelineEnd, timelineStart);
  const daysFromStart = Math.round((percentage / 100) * totalDays);
  
  const result = new Date(timelineStart);
  result.setDate(result.getDate() + daysFromStart);
  return result;
}

/**
 * Format a date range for display
 */
export function formatDateRange(
  startDate: string | null,
  endDate: string | null
): string {
  if (!startDate && !endDate) return 'No dates';
  if (!startDate) return `Until ${format(new Date(endDate!), 'MMM d, yyyy')}`;
  if (!endDate) return `From ${format(new Date(startDate), 'MMM d, yyyy')}`;
  
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  if (isSameMonth(start, end)) {
    return `${format(start, 'MMM d')} - ${format(end, 'd, yyyy')}`;
  }
  
  if (isSameYear(start, end)) {
    return `${format(start, 'MMM d')} - ${format(end, 'MMM d, yyyy')}`;
  }
  
  return `${format(start, 'MMM d, yyyy')} - ${format(end, 'MMM d, yyyy')}`;
}

/**
 * Get the duration in days
 */
export function getDurationDays(startDate: string | null, endDate: string | null): number | null {
  if (!startDate || !endDate) return null;
  return differenceInDays(new Date(endDate), new Date(startDate)) + 1;
}

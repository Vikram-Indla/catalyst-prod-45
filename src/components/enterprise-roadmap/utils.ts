// Enterprise Roadmap Utility Functions

import { TimeScale, TimelinePeriod, ItemStatus } from './types';
import { format, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear, addMonths, addQuarters, addYears, isWithinInterval, differenceInDays } from 'date-fns';

// Generate timeline periods based on scale
export function generateTimelinePeriods(
  timeScale: TimeScale,
  startDate: Date,
  periodCount: number = 12
): TimelinePeriod[] {
  const periods: TimelinePeriod[] = [];
  const today = new Date();
  
  for (let i = 0; i < periodCount; i++) {
    let periodStart: Date;
    let periodEnd: Date;
    let label: string;
    let year: string;
    let key: string;
    
    if (timeScale === 'monthly') {
      periodStart = startOfMonth(addMonths(startDate, i));
      periodEnd = endOfMonth(periodStart);
      label = format(periodStart, 'MMM');
      year = format(periodStart, 'yyyy');
      key = format(periodStart, 'yyyy-MM');
    } else if (timeScale === 'quarterly') {
      periodStart = startOfQuarter(addQuarters(startDate, i));
      periodEnd = endOfQuarter(periodStart);
      const quarter = Math.ceil((periodStart.getMonth() + 1) / 3);
      label = `Q${quarter}`;
      year = format(periodStart, 'yyyy');
      key = `${year}-Q${quarter}`;
    } else {
      periodStart = startOfYear(addYears(startDate, i));
      periodEnd = endOfYear(periodStart);
      label = format(periodStart, 'yyyy');
      year = '';
      key = format(periodStart, 'yyyy');
    }
    
    const isCurrent = isWithinInterval(today, { start: periodStart, end: periodEnd });
    
    periods.push({
      key,
      label,
      year,
      startDate: periodStart,
      endDate: periodEnd,
      isCurrent,
    });
  }
  
  return periods;
}

// Calculate bar position and width
export function calculateBarMetrics(
  itemStart: Date,
  itemEnd: Date,
  timelineStart: Date,
  timelineEnd: Date,
  containerWidth: number
): { left: number; width: number; visible: boolean } {
  const totalDays = differenceInDays(timelineEnd, timelineStart);
  const pixelsPerDay = containerWidth / totalDays;
  
  // Clamp to visible range
  const visibleStart = itemStart < timelineStart ? timelineStart : itemStart;
  const visibleEnd = itemEnd > timelineEnd ? timelineEnd : itemEnd;
  
  // Check if bar is visible
  if (itemEnd < timelineStart || itemStart > timelineEnd) {
    return { left: 0, width: 0, visible: false };
  }
  
  const startOffset = differenceInDays(visibleStart, timelineStart);
  const barDays = differenceInDays(visibleEnd, visibleStart);
  
  return {
    left: startOffset * pixelsPerDay,
    width: Math.max(barDays * pixelsPerDay, 4), // Min width of 4px
    visible: true,
  };
}

// Calculate today line position
export function calculateTodayPosition(
  today: Date,
  timelineStart: Date,
  timelineEnd: Date,
  containerWidth: number
): number | null {
  if (today < timelineStart || today > timelineEnd) return null;
  
  const totalDays = differenceInDays(timelineEnd, timelineStart);
  const daysFromStart = differenceInDays(today, timelineStart);
  
  return (daysFromStart / totalDays) * containerWidth;
}

// Status color configuration
export const statusColors: Record<ItemStatus, { dot: string; badge: string }> = {
  'active': {
    dot: 'bg-[#5C7C5C]',
    badge: 'bg-[rgba(92,124,92,0.1)] text-[#5C7C5C] border-[rgba(92,124,92,0.3)] dark:bg-[rgba(92,124,92,0.15)] dark:text-[#7DA37D]'
  },
  'proposed': {
    dot: 'bg-[#8B949E]',
    badge: 'bg-[#F6F8FA] text-[#57606A] border-[#E1E4E8] dark:bg-[#21262D] dark:text-[#8B949E] dark:border-[#30363D]'
  },
  'on-track': {
    dot: 'bg-[#5C7C5C]',
    badge: 'bg-[rgba(92,124,92,0.1)] text-[#5C7C5C] border-[rgba(92,124,92,0.3)] dark:bg-[rgba(92,124,92,0.15)] dark:text-[#7DA37D]'
  },
  'at-risk': {
    dot: 'bg-[#C69C6D]',
    badge: 'bg-[rgba(198,156,109,0.1)] text-[#C69C6D] border-[rgba(198,156,109,0.3)] dark:bg-[rgba(198,156,109,0.15)] dark:text-[#D4B896]'
  },
  'off-track': {
    dot: 'bg-[#B85C5C]',
    badge: 'bg-[rgba(184,92,92,0.1)] text-[#B85C5C] border-[rgba(184,92,92,0.3)] dark:bg-[rgba(184,92,92,0.15)] dark:text-[#D68A8A]'
  },
  'in-progress': {
    dot: 'bg-[#C69C6D]',
    badge: 'bg-[rgba(198,156,109,0.1)] text-[#C69C6D] border-[rgba(198,156,109,0.3)] dark:bg-[rgba(198,156,109,0.15)] dark:text-[#D4B896]'
  },
  'done': {
    dot: 'bg-[#5C7C5C]',
    badge: 'bg-[rgba(92,124,92,0.1)] text-[#5C7C5C] border-[rgba(92,124,92,0.3)] dark:bg-[rgba(92,124,92,0.15)] dark:text-[#7DA37D]'
  }
};

// Item type styles
export const itemTypeStyles = {
  theme: {
    bg: 'bg-gradient-to-r from-[#5C7C5C] to-[#7DA37D]',
    border: 'border-[#5C7C5C]',
    iconBg: 'bg-[rgba(92,124,92,0.1)] dark:bg-[rgba(92,124,92,0.15)]',
    iconColor: 'text-[#5C7C5C] dark:text-[#7DA37D]',
  },
  objective: {
    bg: 'bg-gradient-to-r from-[#C69C6D] to-[#D4B896]',
    border: 'border-[#C69C6D]',
    iconBg: 'bg-[rgba(198,156,109,0.1)] dark:bg-[rgba(198,156,109,0.15)]',
    iconColor: 'text-[#C69C6D] dark:text-[#D4B896]',
  },
  epic: {
    bg: 'bg-gradient-to-r from-[#8B7355] to-[#C4A882]',
    border: 'border-[#8B7355]',
    iconBg: 'bg-[rgba(139,115,85,0.1)] dark:bg-[rgba(139,115,85,0.15)]',
    iconColor: 'text-[#8B7355] dark:text-[#C4A882]',
  },
};

// Format date for display
export function formatRoadmapDate(dateStr: string): string {
  const date = new Date(dateStr);
  return format(date, 'MMM d, yyyy');
}

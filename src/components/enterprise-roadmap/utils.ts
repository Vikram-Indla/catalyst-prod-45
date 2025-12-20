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

// Status color configuration - using CSS variables
export const statusColors: Record<ItemStatus, { dot: string; badge: string }> = {
  'active': {
    dot: 'bg-[var(--status-success)]',
    badge: 'bg-[var(--status-success-bg)] text-[var(--status-success)] border-[var(--status-success-border)]'
  },
  'proposed': {
    dot: 'bg-[var(--status-muted)]',
    badge: 'bg-[var(--status-muted-bg)] text-[var(--status-muted)] border-[var(--status-muted-border)]'
  },
  'on-track': {
    dot: 'bg-[var(--status-success)]',
    badge: 'bg-[var(--status-success-bg)] text-[var(--status-success)] border-[var(--status-success-border)]'
  },
  'at-risk': {
    dot: 'bg-[var(--status-info)]',
    badge: 'bg-[var(--status-info-bg)] text-[var(--status-info)] border-[var(--status-info-border)]'
  },
  'off-track': {
    dot: 'bg-destructive',
    badge: 'bg-destructive/10 text-destructive border-destructive/30'
  },
  'delayed': {
    dot: 'bg-destructive',
    badge: 'bg-destructive/10 text-destructive border-destructive/30'
  },
  'in-progress': {
    dot: 'bg-[var(--status-info)]',
    badge: 'bg-[var(--status-info-bg)] text-[var(--status-info)] border-[var(--status-info-border)]'
  },
  'done': {
    dot: 'bg-[var(--status-success)]',
    badge: 'bg-[var(--status-success-bg)] text-[var(--status-success)] border-[var(--status-success-border)]'
  }
};

// Item type styles - using CSS variables
export const itemTypeStyles = {
  theme: {
    bg: 'bg-gradient-to-r from-[var(--status-success)] to-[var(--status-success-light)]',
    border: 'border-[var(--status-success)]',
    iconBg: 'bg-[var(--status-success-bg)]',
    iconColor: 'text-[var(--status-success)]',
  },
  objective: {
    bg: 'bg-gradient-to-r from-[var(--status-info)] to-[var(--status-warning)]',
    border: 'border-[var(--status-info)]',
    iconBg: 'bg-[var(--status-info-bg)]',
    iconColor: 'text-[var(--status-info)]',
  },
  epic: {
    bg: 'bg-gradient-to-r from-[hsl(var(--secondary-bronze))] to-[hsl(var(--secondary-champagne))]',
    border: 'border-[hsl(var(--secondary-bronze))]',
    iconBg: 'bg-[hsl(var(--secondary-bronze))]/10',
    iconColor: 'text-[hsl(var(--secondary-bronze))]',
  },
};

// Format date for display
export function formatRoadmapDate(dateStr: string): string {
  const date = new Date(dateStr);
  return format(date, 'MMM d, yyyy');
}

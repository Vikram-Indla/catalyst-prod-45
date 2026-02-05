// ═══════════════════════════════════════════════════════════════════════════════
// UTILS: Week Calculations
// Purpose: Calculate week options for advance week planning feature
// ═══════════════════════════════════════════════════════════════════════════════

import { startOfWeek, addWeeks, format, isWithinInterval, isSameDay } from 'date-fns';

export interface WeekOption {
  offset: number;
  label: string;
  weekStart: Date;
  weekEnd: Date;
  dateRange: string;
  isCurrentWeek: boolean;
  isUpcoming: boolean;
}

/**
 * Get week options for the Create List modal
 * Returns 4 options: This Week, Next Week, In 2 Weeks, In 3 Weeks
 */
export function getWeekOptions(): WeekOption[] {
  const today = new Date();
  
  // Get Monday of this week (weekStartsOn: 1 = Monday)
  let thisMonday = startOfWeek(today, { weekStartsOn: 1 });
  
  // If today is Saturday(6) or Sunday(0), "this week" means the coming Monday
  const dayOfWeek = today.getDay();
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    // Move to next Monday
    const daysUntilMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
    thisMonday = new Date(today);
    thisMonday.setDate(today.getDate() + daysUntilMonday);
  }
  
  const options: WeekOption[] = [];
  const labels = ['This Week', 'Next Week', 'In 2 Weeks', 'In 3 Weeks'];
  
  for (let i = 0; i < 4; i++) {
    const weekStart = addWeeks(thisMonday, i);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 4); // Friday
    
    // Check if today falls within this week (Mon-Fri)
    const isCurrentWeek = isWithinInterval(today, { 
      start: weekStart, 
      end: weekEnd 
    }) || isSameDay(today, weekStart) || isSameDay(today, weekEnd);
    
    options.push({
      offset: i,
      label: labels[i],
      weekStart,
      weekEnd,
      dateRange: `${format(weekStart, 'MMM d')} – ${format(weekEnd, 'MMM d')}`,
      isCurrentWeek,
      isUpcoming: !isCurrentWeek && weekStart > today,
    });
  }
  
  return options;
}

/**
 * Format a week range for display
 */
export function formatWeekRange(weekStart: Date, weekEnd: Date): string {
  const startYear = weekStart.getFullYear();
  const endYear = weekEnd.getFullYear();
  
  if (startYear === endYear) {
    return `${format(weekStart, 'MMM d')} – ${format(weekEnd, 'MMM d, yyyy')}`;
  }
  
  // Handle year boundary
  return `${format(weekStart, 'MMM d, yyyy')} – ${format(weekEnd, 'MMM d, yyyy')}`;
}

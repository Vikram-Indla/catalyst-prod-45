// roadmapTimeUtils.ts — Time calculation helpers for ExecutiveRoadmap

import { RoadmapItem } from '@/config/roadmaps/types';
import { TimePeriodSelection, TimeScale, currentYear, currentMonth } from './roadmapConstants';

// Helper to format display key - use item.key if available, otherwise format UUID
export function formatDisplayKey(item: RoadmapItem): string {
  if (item.key) return item.key;
  // Fallback: format UUID as short key (first 4 chars uppercase)
  return item.id.slice(0, 8).toUpperCase();
}

// Helper to get weeks for a specific month in a year
export function getWeeksForMonth(year: number, month: number): { week: number; startDate: Date; label: string }[] {
  const weeks: { week: number; startDate: Date; label: string }[] = [];
  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);

  // Find the first day of the year to calculate week numbers
  const firstDayOfYear = new Date(year, 0, 1);

  // Find all weeks that overlap with this month
  let currentDate = new Date(firstDayOfMonth);

  // Go back to the start of the week containing the first day of month
  const dayOfWeek = currentDate.getDay();
  currentDate.setDate(currentDate.getDate() - dayOfWeek);

  while (currentDate <= lastDayOfMonth) {
    // Calculate week number (ISO-style, week 1 starts Jan 1)
    const daysSinceYearStart = Math.floor((currentDate.getTime() - firstDayOfYear.getTime()) / (24 * 60 * 60 * 1000));
    const weekNum = Math.ceil((daysSinceYearStart + firstDayOfYear.getDay() + 1) / 7);

    // Only include if week overlaps with the selected month
    const weekEnd = new Date(currentDate);
    weekEnd.setDate(weekEnd.getDate() + 6);

    if (weekEnd >= firstDayOfMonth && currentDate <= lastDayOfMonth) {
      weeks.push({
        week: weekNum,
        startDate: new Date(currentDate),
        label: `W${weekNum}`
      });
    }

    currentDate.setDate(currentDate.getDate() + 7);
  }

  return weeks;
}

// Compute visible date range based on selection AND scale
export function getVisibleDateRange(selection: TimePeriodSelection, scale: TimeScale): { start: Date; end: Date } {
  const sortedYears = selection.years.length > 0
    ? [...selection.years].sort((a, b) => a - b)
    : [currentYear];

  const startYear = sortedYears[0];
  const endYear = sortedYears[sortedYears.length - 1];

  if (scale === 'yearly') {
    return {
      start: new Date(startYear, 0, 1),
      end: new Date(endYear, 11, 31)
    };
  }

  if (scale === 'quarterly') {
    const sortedQuarters = selection.quarters.length > 0
      ? [...selection.quarters].sort((a, b) => a - b)
      : [0, 1, 2, 3];
    const startQ = sortedQuarters[0];
    const endQ = sortedQuarters[sortedQuarters.length - 1];
    return {
      start: new Date(startYear, startQ * 3, 1),
      end: new Date(endYear, endQ * 3 + 3, 0)
    };
  }

  if (scale === 'weekly') {
    // Weekly view: use weeklyMonth to determine the range
    if (selection.weeklyMonth !== null) {
      const month = selection.weeklyMonth;
      const weeksInMonth = getWeeksForMonth(startYear, month);

      if (selection.weeks.length > 0 && weeksInMonth.length > 0) {
        // Filter to only selected weeks within the month
        const selectedWeeksInMonth = weeksInMonth.filter(w => selection.weeks.includes(w.week));
        if (selectedWeeksInMonth.length > 0) {
          const firstWeek = selectedWeeksInMonth[0];
          const lastWeek = selectedWeeksInMonth[selectedWeeksInMonth.length - 1];
          const endDate = new Date(lastWeek.startDate);
          endDate.setDate(endDate.getDate() + 6);
          return { start: firstWeek.startDate, end: endDate };
        }
      }

      // If no weeks selected but month is selected, show all weeks of that month
      if (weeksInMonth.length > 0) {
        const firstWeek = weeksInMonth[0];
        const lastWeek = weeksInMonth[weeksInMonth.length - 1];
        const endDate = new Date(lastWeek.startDate);
        endDate.setDate(endDate.getDate() + 6);
        return { start: firstWeek.startDate, end: endDate };
      }
    }

    // Fallback: show current month's weeks if no month selected
    const weeksInCurrentMonth = getWeeksForMonth(startYear, currentMonth);
    if (weeksInCurrentMonth.length > 0) {
      const firstWeek = weeksInCurrentMonth[0];
      const lastWeek = weeksInCurrentMonth[weeksInCurrentMonth.length - 1];
      const endDate = new Date(lastWeek.startDate);
      endDate.setDate(endDate.getDate() + 6);
      return { start: firstWeek.startDate, end: endDate };
    }

    // Ultimate fallback
    return {
      start: new Date(startYear, currentMonth, 1),
      end: new Date(startYear, currentMonth + 1, 0)
    };
  }

  // Monthly - use months
  const sortedMonths = selection.months.length > 0
    ? [...selection.months].sort((a, b) => a - b)
    : [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
  const startMonth = sortedMonths[0];
  const endMonth = sortedMonths[sortedMonths.length - 1];

  return {
    start: new Date(startYear, startMonth, 1),
    end: new Date(endYear, endMonth + 1, 0)
  };
}

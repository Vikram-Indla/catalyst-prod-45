/**
 * Calendar Utility Helpers — date math, grid generation, overlap detection
 */

import type { CalendarEvent } from '@/types/workhub.types';

/** Get array of 42 dates for the month grid (including padding from prev/next month) */
export function getMonthGridDates(year: number, month: number): Date[] {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDayOfWeek = firstDay.getDay(); // 0=Sun
  const dates: Date[] = [];

  // Pad start (previous month days)
  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    dates.push(new Date(year, month, -i));
  }
  // Current month
  for (let d = 1; d <= lastDay.getDate(); d++) {
    dates.push(new Date(year, month, d));
  }
  // Pad end to fill 6 rows (42 cells)
  while (dates.length < 42) {
    dates.push(new Date(year, month + 1, dates.length - lastDay.getDate() - startDayOfWeek + 1));
  }
  return dates;
}

/** Check if date is today */
export function isToday(date: Date): boolean {
  const now = new Date();
  return (
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear()
  );
}

/** Check if date is in the displayed month */
export function isCurrentMonth(date: Date, year: number, month: number): boolean {
  return date.getMonth() === month && date.getFullYear() === year;
}

/** Format date for display (e.g., "Thursday, February 15, 2026") */
export function formatCalendarDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/** Format to YYYY-MM-DD for comparison */
export function toDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Get month name */
export function getMonthName(month: number): string {
  return new Date(2026, month).toLocaleDateString('en-US', { month: 'long' });
}

/** Check if an event overlaps with a specific month */
export function eventOverlapsMonth(event: CalendarEvent, year: number, month: number): boolean {
  const startOfMonth = `${year}-${String(month + 1).padStart(2, '0')}-01`;
  const endOfMonth = toDateString(new Date(year, month + 1, 0));

  if (event.event_start && event.event_end) {
    return event.event_start <= endOfMonth && event.event_end >= startOfMonth;
  }
  if (event.event_date) {
    return event.event_date >= startOfMonth && event.event_date <= endOfMonth;
  }
  return false;
}

/** Get events for a specific date (point or span) */
export function getEventsForDate(events: CalendarEvent[], dateStr: string): CalendarEvent[] {
  return events.filter((e) => {
    if (e.event_date === dateStr) return true;
    if (e.event_start && e.event_end) {
      return dateStr >= e.event_start && dateStr <= e.event_end;
    }
    return false;
  });
}

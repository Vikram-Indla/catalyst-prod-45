// =====================================================
// TIMELINE COORDINATE UTILITIES
// All date-to-pixel math for the Gantt grid
// =====================================================

import type { Granularity } from '@/types/producthub/request';
import { addDays, startOfQuarter, format, differenceInDays, eachMonthOfInterval, eachWeekOfInterval, eachDayOfInterval, startOfMonth, endOfMonth, startOfWeek, endOfWeek, getQuarter, getYear, isSameMonth } from 'date-fns';

// Fixed timeline range
export const TIMELINE_START = new Date(2025, 5, 1); // June 1, 2025
export const TIMELINE_END = new Date(2026, 11, 31); // Dec 31, 2026

export const COLUMN_WIDTHS: Record<Granularity, number> = {
  day: 40,
  week: 120,
  month: 180,
  quarter: 240,
};

/** Get column boundaries for a given granularity */
export function getColumns(granularity: Granularity): { start: Date; end: Date; label: string; parentLabel: string }[] {
  const columns: { start: Date; end: Date; label: string; parentLabel: string }[] = [];

  switch (granularity) {
    case 'day': {
      const days = eachDayOfInterval({ start: TIMELINE_START, end: TIMELINE_END });
      for (const d of days) {
        columns.push({
          start: d,
          end: addDays(d, 1),
          label: format(d, 'd'),
          parentLabel: format(d, 'MMM yyyy'),
        });
      }
      break;
    }
    case 'week': {
      const weeks = eachWeekOfInterval({ start: TIMELINE_START, end: TIMELINE_END }, { weekStartsOn: 0 });
      for (let i = 0; i < weeks.length; i++) {
        const ws = weeks[i];
        const we = i < weeks.length - 1 ? weeks[i + 1] : TIMELINE_END;
        const weekNum = Math.ceil(differenceInDays(ws, startOfMonth(ws)) / 7) + 1;
        columns.push({
          start: ws,
          end: we,
          label: `W${weekNum} · ${format(ws, 'MMM d')}`,
          parentLabel: format(ws, 'MMM yyyy'),
        });
      }
      break;
    }
    case 'month': {
      const months = eachMonthOfInterval({ start: TIMELINE_START, end: TIMELINE_END });
      for (const m of months) {
        columns.push({
          start: m,
          end: endOfMonth(m),
          label: format(m, 'MMM'),
          parentLabel: format(m, 'yyyy'),
        });
      }
      break;
    }
    case 'quarter': {
      // Generate quarters from Q3 2025 to Q4 2026
      let current = startOfQuarter(TIMELINE_START);
      while (current < TIMELINE_END) {
        const q = getQuarter(current);
        const y = getYear(current);
        const nextQ = new Date(current);
        nextQ.setMonth(nextQ.getMonth() + 3);
        columns.push({
          start: current,
          end: nextQ > TIMELINE_END ? TIMELINE_END : nextQ,
          label: `Q${q}`,
          parentLabel: `${y}`,
        });
        current = nextQ;
      }
      break;
    }
  }

  return columns;
}

/** Get total width of the timeline in pixels */
export function getTotalWidth(granularity: Granularity): number {
  return getColumns(granularity).length * COLUMN_WIDTHS[granularity];
}

/** Convert a date to X pixel position */
export function dateToX(date: Date, granularity: Granularity): number {
  const totalWidth = getTotalWidth(granularity);
  const totalMs = TIMELINE_END.getTime() - TIMELINE_START.getTime();
  const ms = Math.max(0, Math.min(date.getTime() - TIMELINE_START.getTime(), totalMs));
  return (ms / totalMs) * totalWidth;
}

/** Convert an X pixel position to a date */
export function xToDate(x: number, granularity: Granularity): Date {
  const totalWidth = getTotalWidth(granularity);
  const totalMs = TIMELINE_END.getTime() - TIMELINE_START.getTime();
  const ms = (x / totalWidth) * totalMs;
  return new Date(TIMELINE_START.getTime() + ms);
}

/** Get parent group labels (for row 1 of time header) */
export function getParentGroups(granularity: Granularity): { label: string; span: number }[] {
  const cols = getColumns(granularity);
  const groups: { label: string; span: number }[] = [];
  let currentLabel = '';
  let currentSpan = 0;

  for (const col of cols) {
    if (col.parentLabel !== currentLabel) {
      if (currentLabel) groups.push({ label: currentLabel, span: currentSpan });
      currentLabel = col.parentLabel;
      currentSpan = 1;
    } else {
      currentSpan++;
    }
  }
  if (currentLabel) groups.push({ label: currentLabel, span: currentSpan });

  return groups;
}

/** Check if a date falls in the current period */
export function isCurrentPeriod(date: Date, granularity: Granularity): boolean {
  const now = new Date();
  switch (granularity) {
    case 'day':
      return date.toDateString() === now.toDateString();
    case 'week': {
      const ws = startOfWeek(now);
      const we = endOfWeek(now);
      return date >= ws && date <= we;
    }
    case 'month':
      return isSameMonth(date, now);
    case 'quarter':
      return getQuarter(date) === getQuarter(now) && getYear(date) === getYear(now);
  }
}

/** Get bar position from request data */
export function getBarPosition(
  request: { kickoff_date: string | null; business_ask_date: string | null; target_complete: string | null; target_quarter: string | null },
  granularity: Granularity
): { left: number; width: number } {
  let startDate: Date;
  let endDate: Date;

  // Determine start
  if (request.kickoff_date) {
    startDate = new Date(request.kickoff_date);
  } else if (request.business_ask_date) {
    startDate = new Date(request.business_ask_date);
  } else if (request.target_quarter) {
    // Parse "Q1 2026" → start of that quarter
    const match = request.target_quarter.match(/Q(\d)\s*(\d{4})/);
    if (match) {
      const q = parseInt(match[1]);
      const y = parseInt(match[2]);
      startDate = new Date(y, (q - 1) * 3, 1);
    } else {
      startDate = new Date(); // fallback to today
    }
  } else {
    startDate = new Date();
  }

  // Determine end
  if (request.target_complete) {
    endDate = new Date(request.target_complete);
  } else {
    endDate = addDays(startDate, 90);
  }

  // Ensure end > start
  if (endDate <= startDate) {
    endDate = addDays(startDate, 30);
  }

  const left = dateToX(startDate, granularity);
  const right = dateToX(endDate, granularity);
  const width = Math.max(24, right - left); // min 24px

  return { left, width };
}

/** Check if request is overdue */
export function isOverdue(request: { target_complete: string | null; progress: number; status: string }): boolean {
  if (!request.target_complete) return false;
  if (['done', 'cancelled'].includes(request.status)) return false;
  if (request.progress >= 100) return false;
  return new Date(request.target_complete) < new Date();
}

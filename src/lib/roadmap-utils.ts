/**
 * Catalyst Enterprise Roadmap Utilities
 */

import { format, differenceInDays, startOfMonth, endOfMonth, startOfWeek, endOfWeek, startOfQuarter, endOfQuarter, addMonths, addWeeks, addQuarters } from 'date-fns';
import type { TimesliceMode, TimelineConfig } from '@/types/roadmap';

/**
 * Calculate horizontal position percentage for a date within timeline
 */
export function dateToPosition(date: Date | string, config: TimelineConfig): number {
  const d = typeof date === 'string' ? new Date(date) : date;
  const total = config.end.getTime() - config.start.getTime();
  const pos = d.getTime() - config.start.getTime();
  return Math.max(0, Math.min(100, (pos / total) * 100));
}

/**
 * Calculate date from horizontal position percentage
 */
export function positionToDate(percent: number, config: TimelineConfig): Date {
  const total = config.end.getTime() - config.start.getTime();
  const ms = config.start.getTime() + (percent / 100) * total;
  return new Date(ms);
}

/**
 * Generate time units for the header based on slice mode
 */
export function generateTimeUnits(
  config: TimelineConfig,
  slice: TimesliceMode
): { label: string; width: number; isCurrent: boolean; isQuarterStart?: boolean }[] {
  const units: { label: string; width: number; isCurrent: boolean; isQuarterStart?: boolean }[] = [];
  const total = differenceInDays(config.end, config.start);
  let current = new Date(config.start);

  while (current < config.end) {
    let unitEnd: Date;
    let label: string;
    let isQuarterStart = false;

    if (slice === 'weekly') {
      unitEnd = endOfWeek(current, { weekStartsOn: 0 });
      label = format(current, 'MMM d');
    } else if (slice === 'monthly') {
      unitEnd = endOfMonth(current);
      label = format(current, 'MMM');
      isQuarterStart = current.getMonth() % 3 === 0;
    } else {
      unitEnd = endOfQuarter(current);
      label = `Q${Math.ceil((current.getMonth() + 1) / 3)} ${current.getFullYear()}`;
    }

    if (unitEnd > config.end) unitEnd = config.end;

    const days = differenceInDays(unitEnd, current) + 1;
    const width = (days / total) * 100;
    const isCurrent = current <= config.today && unitEnd >= config.today;

    units.push({ label, width, isCurrent, isQuarterStart });

    if (slice === 'weekly') {
      current = addWeeks(current, 1);
      current = startOfWeek(current, { weekStartsOn: 0 });
    } else if (slice === 'monthly') {
      current = addMonths(startOfMonth(current), 1);
    } else {
      current = addQuarters(startOfQuarter(current), 1);
    }
  }

  return units;
}

/**
 * Generate quarter headers for the timeline
 */
export function generateQuarters(config: TimelineConfig): { label: string; width: number; isPast: boolean }[] {
  const quarters: { label: string; width: number; isPast: boolean }[] = [];
  const total = differenceInDays(config.end, config.start);
  let current = startOfQuarter(config.start);

  while (current < config.end) {
    const qEnd = endOfQuarter(current);
    const effectiveStart = current < config.start ? config.start : current;
    const effectiveEnd = qEnd > config.end ? config.end : qEnd;

    const days = differenceInDays(effectiveEnd, effectiveStart) + 1;
    const width = (days / total) * 100;
    const isPast = effectiveEnd < config.today;
    const label = `Q${Math.ceil((current.getMonth() + 1) / 3)} ${current.getFullYear()}`;

    quarters.push({ label, width, isPast });
    current = addQuarters(current, 1);
  }

  return quarters;
}

/**
 * Snap date to grid based on slice mode
 */
export function snapToGrid(date: Date, slice: TimesliceMode): Date {
  if (slice === 'weekly') {
    return startOfWeek(date, { weekStartsOn: 0 });
  } else if (slice === 'monthly') {
    return startOfMonth(date);
  } else {
    return startOfQuarter(date);
  }
}

/**
 * Format date range for display
 */
export function formatDateRange(start: string, end: string): string {
  const s = new Date(start);
  const e = new Date(end);
  return `${format(s, 'MMM d')} - ${format(e, 'MMM d, yyyy')}`;
}

/**
 * Calculate bar position and width
 */
export function calculateBarPosition(
  start: string,
  end: string,
  config: TimelineConfig
): { left: number; width: number } {
  const left = dateToPosition(start, config);
  const right = dateToPosition(end, config);
  return { left, width: Math.max(right - left, 2) };
}

/**
 * Get status label from status key
 */
export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    'on-track': 'On Track',
    'at-risk': 'At Risk',
    'blocked': 'Blocked',
    'pending': 'Pending',
  };
  return labels[status] || status;
}

/**
 * Get owner initials from name
 */
export function getInitials(name: string): string {
  if (name.length <= 2) return name.toUpperCase();
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

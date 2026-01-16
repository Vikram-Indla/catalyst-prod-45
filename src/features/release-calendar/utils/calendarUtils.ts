/**
 * Calendar Utility Functions
 */

import { addDays, addMonths, addWeeks, startOfWeek, startOfMonth, startOfQuarter, endOfWeek, endOfMonth, endOfQuarter, differenceInDays, format, isWithinInterval, isSameDay, eachDayOfInterval, eachWeekOfInterval } from 'date-fns';
import { TimeScale, CalendarRelease, ConflictWarning, CalendarInsight } from '../types';

export interface BarPosition {
  left: string;
  width: string;
  extendsLeft: boolean;
  extendsRight: boolean;
}

export function getViewBounds(date: Date, scale: TimeScale): { start: Date; end: Date } {
  switch (scale) {
    case 'week':
      return {
        start: startOfWeek(date, { weekStartsOn: 1 }),
        end: endOfWeek(date, { weekStartsOn: 1 }),
      };
    case 'month':
      return {
        start: startOfMonth(date),
        end: endOfMonth(date),
      };
    case 'quarter':
      return {
        start: startOfQuarter(date),
        end: endOfQuarter(date),
      };
  }
}

export function navigateView(date: Date, scale: TimeScale, direction: 'prev' | 'next'): Date {
  const delta = direction === 'next' ? 1 : -1;
  switch (scale) {
    case 'week':
      return addWeeks(date, delta);
    case 'month':
      return addMonths(date, delta);
    case 'quarter':
      return addMonths(date, delta * 3);
  }
}

export function calculateBarPosition(
  releaseStart: Date,
  releaseEnd: Date,
  viewStart: Date,
  viewEnd: Date
): BarPosition {
  const viewDuration = viewEnd.getTime() - viewStart.getTime();
  const clampedStart = Math.max(releaseStart.getTime(), viewStart.getTime());
  const clampedEnd = Math.min(releaseEnd.getTime(), viewEnd.getTime());

  const leftPercent = ((clampedStart - viewStart.getTime()) / viewDuration) * 100;
  const widthPercent = ((clampedEnd - clampedStart) / viewDuration) * 100;

  return {
    left: `${Math.max(0, leftPercent)}%`,
    width: `${Math.min(100 - leftPercent, Math.max(2, widthPercent))}%`,
    extendsLeft: releaseStart < viewStart,
    extendsRight: releaseEnd > viewEnd,
  };
}

export function getColumnHeaders(viewStart: Date, viewEnd: Date, scale: TimeScale): { date: Date; label: string; isWeekend?: boolean }[] {
  switch (scale) {
    case 'week':
      return eachDayOfInterval({ start: viewStart, end: viewEnd }).map(date => ({
        date,
        label: format(date, 'EEE d'),
        isWeekend: date.getDay() === 0 || date.getDay() === 6,
      }));
    case 'month':
      return eachWeekOfInterval({ start: viewStart, end: viewEnd }, { weekStartsOn: 1 }).map(weekStart => ({
        date: weekStart,
        label: `W${format(weekStart, 'w')} (${format(weekStart, 'MMM d')})`,
      }));
    case 'quarter':
      const months: { date: Date; label: string }[] = [];
      let current = viewStart;
      while (current <= viewEnd) {
        months.push({
          date: current,
          label: format(current, 'MMMM yyyy'),
        });
        current = addMonths(current, 1);
      }
      return months;
  }
}

export function getTodayPosition(viewStart: Date, viewEnd: Date): number | null {
  const today = new Date();
  if (!isWithinInterval(today, { start: viewStart, end: viewEnd })) {
    return null;
  }
  const viewDuration = viewEnd.getTime() - viewStart.getTime();
  return ((today.getTime() - viewStart.getTime()) / viewDuration) * 100;
}

export function detectOverlappingReleases(releases: CalendarRelease[]): { releaseId: string; row: number }[] {
  const sorted = [...releases].sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
  const rows: { endDate: Date; releaseId: string }[][] = [];

  return sorted.map(release => {
    const releaseStart = new Date(release.startDate);
    const releaseEnd = new Date(release.targetDate);

    for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
      const lastInRow = rows[rowIndex][rows[rowIndex].length - 1];
      if (lastInRow.endDate <= releaseStart) {
        rows[rowIndex].push({ endDate: releaseEnd, releaseId: release.id });
        return { releaseId: release.id, row: rowIndex };
      }
    }

    rows.push([{ endDate: releaseEnd, releaseId: release.id }]);
    return { releaseId: release.id, row: rows.length - 1 };
  });
}

export function detectConflicts(releases: CalendarRelease[]): ConflictWarning[] {
  const conflicts: ConflictWarning[] = [];
  
  // Check for overlapping releases
  for (let i = 0; i < releases.length; i++) {
    for (let j = i + 1; j < releases.length; j++) {
      const a = releases[i];
      const b = releases[j];
      const aStart = new Date(a.startDate);
      const aEnd = new Date(a.targetDate);
      const bStart = new Date(b.startDate);
      const bEnd = new Date(b.targetDate);

      if (aEnd > bStart && aStart < bEnd) {
        conflicts.push({
          type: 'overlap',
          severity: 'warning',
          releaseIds: [a.id, b.id],
          message: `${a.version} and ${b.version} overlap`,
          suggestion: 'Review resource allocation or adjust dates',
        });
      }
    }
  }

  // Check for cluster conflicts (more than 3 releases in same week)
  const weekClusters: Record<string, CalendarRelease[]> = {};
  releases.forEach(r => {
    const weekKey = format(startOfWeek(new Date(r.targetDate), { weekStartsOn: 1 }), 'yyyy-ww');
    if (!weekClusters[weekKey]) weekClusters[weekKey] = [];
    weekClusters[weekKey].push(r);
  });

  Object.entries(weekClusters).forEach(([weekKey, clusteredReleases]) => {
    if (clusteredReleases.length > 3) {
      conflicts.push({
        type: 'cluster',
        severity: 'warning',
        releaseIds: clusteredReleases.map(r => r.id),
        message: `High release density: ${clusteredReleases.length} releases scheduled in week ${weekKey.split('-')[1]}`,
        suggestion: 'Consider spreading releases',
      });
    }
  });

  return conflicts;
}

export function generateInsights(releases: CalendarRelease[]): CalendarInsight[] {
  const insights: CalendarInsight[] = [];
  const today = new Date();

  releases.forEach(r => {
    const daysRemaining = differenceInDays(new Date(r.targetDate), today);

    if (r.healthScore < 70 && daysRemaining < 14 && daysRemaining > 0) {
      insights.push({
        type: 'risk',
        message: `${r.version} at risk: ${r.healthScore}% health, ${daysRemaining} days remaining`,
        action: 'Escalate or adjust scope',
        releaseIds: [r.id],
      });
    }

    if (new Date(r.startDate) < today && r.status === 'planning') {
      insights.push({
        type: 'overdue',
        message: `${r.version} start date has passed but still in Planning`,
        action: 'Update status or reschedule',
        releaseIds: [r.id],
      });
    }
  });

  return insights;
}

export function formatViewTitle(date: Date, scale: TimeScale): string {
  switch (scale) {
    case 'week':
      const weekStart = startOfWeek(date, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(date, { weekStartsOn: 1 });
      return `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d, yyyy')}`;
    case 'month':
      return format(date, 'MMMM yyyy');
    case 'quarter':
      const q = Math.floor(date.getMonth() / 3) + 1;
      return `Q${q} ${format(date, 'yyyy')}`;
  }
}

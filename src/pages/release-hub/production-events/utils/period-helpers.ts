import type { PcPeriodType } from '../types/production-events.types';
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, addWeeks, subWeeks, addMonths, subMonths, addQuarters, subQuarters, format } from 'date-fns';

export function getCurrentPeriod(type: PcPeriodType): { start: Date; end: Date } {
  const now = new Date();
  switch (type) {
    case 'weekly':
      return { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) };
    case 'monthly':
      return { start: startOfMonth(now), end: endOfMonth(now) };
    case 'quarterly':
      return { start: startOfQuarter(now), end: endOfQuarter(now) };
  }
}

export function navigatePeriod(type: PcPeriodType, current: Date, direction: 'prev' | 'next'): { start: Date; end: Date } {
  const fn = direction === 'next'
    ? type === 'weekly' ? addWeeks : type === 'monthly' ? addMonths : addQuarters
    : type === 'weekly' ? subWeeks : type === 'monthly' ? subMonths : subQuarters;
  const newDate = fn(current, 1);
  switch (type) {
    case 'weekly':
      return { start: startOfWeek(newDate, { weekStartsOn: 1 }), end: endOfWeek(newDate, { weekStartsOn: 1 }) };
    case 'monthly':
      return { start: startOfMonth(newDate), end: endOfMonth(newDate) };
    case 'quarterly':
      return { start: startOfQuarter(newDate), end: endOfQuarter(newDate) };
  }
}

export function formatPeriodLabel(type: PcPeriodType, start: Date, end: Date): string {
  switch (type) {
    case 'weekly':
      return `Week of ${format(start, 'd MMMM yyyy')}`;
    case 'monthly':
      return format(start, 'MMMM yyyy');
    case 'quarterly': {
      const q = Math.ceil((start.getMonth() + 1) / 3);
      return `Q${q} ${format(start, 'yyyy')} · ${format(start, 'MMMM')} – ${format(end, 'MMMM')}`;
    }
  }
}

export function formatDeploymentDate(dateStr: string): string {
  return format(new Date(dateStr), 'd MMMM yyyy');
}

export function formatDateISO(d: Date): string {
  return format(d, 'yyyy-MM-dd');
}

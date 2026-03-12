import { differenceInHours, differenceInCalendarDays, addDays, isBefore, isAfter, isToday, startOfWeek } from 'date-fns';
import type { ChangeSummary } from '@/types/releasehub';

export const getDaysRemaining = (targetDate: string): number =>
  differenceInCalendarDays(new Date(targetDate), new Date());

export const isOverdue = (targetDate: string, status: string): boolean =>
  getDaysRemaining(targetDate) < 0 && !['done', 'archived'].includes(status);

export const getSignoffWaitTime = (waitStartedAt: string): string => {
  const hours = differenceInHours(new Date(), new Date(waitStartedAt));
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  const rem = hours % 24;
  return rem > 0 ? `${days}d ${rem}h` : `${days}d`;
};

export type ChangeSection = 'past' | 'today' | 'this_week' | 'upcoming' | 'future';

export const classifyChangeDate = (deploymentDate: string | null | undefined, status?: string): ChangeSection => {
  // Override: deployed changes are always past
  if (status === 'in_production') return 'past';
  if (!deploymentDate) return 'future';
  const d = new Date(deploymentDate);
  const today = new Date();
  if (isToday(d)) return 'today';
  if (isBefore(d, today)) return 'past';
  const nextWeek = addDays(today, 7);
  if (isAfter(d, today) && isBefore(d, nextWeek)) return 'this_week';
  const next30 = addDays(today, 30);
  if (isAfter(d, today) && isBefore(d, next30)) return 'upcoming';
  return 'future';
};

export const groupChangesBySection = (changes: any[]) => {
  const sections: Record<ChangeSection, any[]> = {
    past: [], today: [], this_week: [], upcoming: [], future: []
  };
  changes.forEach(c => {
    const section = classifyChangeDate(c.deployment_date, c.status);
    sections[section].push(c);
  });
  Object.values(sections).forEach(arr =>
    arr.sort((a: any, b: any) => new Date(a.deployment_date || '9999').getTime() - new Date(b.deployment_date || '9999').getTime())
  );
  return sections;
};

export const isSaudiWorkDay = (date: Date): boolean => {
  const day = date.getDay();
  return day >= 0 && day <= 4;
};

export const getSaudiWeekDays = (weekDate: Date): Date[] => {
  const start = startOfWeek(weekDate, { weekStartsOn: 0 });
  return [0, 1, 2, 3, 4].map(d => addDays(start, d));
};

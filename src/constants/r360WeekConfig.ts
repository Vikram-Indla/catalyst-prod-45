/**
 * R360 Saudi Work Week Configuration
 * Sunday is the FIRST day of the work week. NOT Monday.
 * Work week: Sunday → Thursday (5 days)
 * Weekend: Friday + Saturday
 */

export const R360_WEEK_CONFIG = {
  firstDayOfWeek: 0,          // 0 = Sunday (JS Date.getDay())
  lastDayOfWeek: 4,           // 4 = Thursday
  weekendDays: [5, 6],        // Friday, Saturday
  workDays: [0, 1, 2, 3, 4],  // Sun, Mon, Tue, Wed, Thu
  dayNames: {
    en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'],
    ar: ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس']
  },
  dayTags: {
    en: { first: 'Week Start', peak: 'Most Active', close: 'Closure Day', quiet: 'Waiting', last: 'Week End' },
    ar: { first: 'بداية الأسبوع', peak: 'الأكثر نشاطًا', close: 'يوم الإغلاقات', quiet: 'انتظار', last: 'نهاية الأسبوع' }
  }
} as const;

export function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day); // roll back to Sunday
  d.setHours(0, 0, 0, 0);
  return d;
}

export function getWeekEnd(date: Date): Date {
  const start = getWeekStart(date);
  const end = new Date(start);
  end.setDate(end.getDate() + 4); // Sunday + 4 = Thursday
  end.setHours(23, 59, 59, 999);
  return end;
}

export function isWorkDay(date: Date): boolean {
  return R360_WEEK_CONFIG.workDays.includes(date.getDay() as 0 | 1 | 2 | 3 | 4);
}

export function getWeekNumber(date: Date): number {
  const start = getWeekStart(date);
  const yearStart = new Date(start.getFullYear(), 0, 1);
  // Find first Sunday of year
  while (yearStart.getDay() !== 0) yearStart.setDate(yearStart.getDate() + 1);
  const diff = start.getTime() - yearStart.getTime();
  return Math.floor(diff / (7 * 24 * 60 * 60 * 1000)) + 1;
}

export function formatWeekRange(date: Date): string {
  const start = getWeekStart(date);
  const end = getWeekEnd(date);
  const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return `${fmt(start)} – ${fmt(end)}, ${end.getFullYear()}`;
}

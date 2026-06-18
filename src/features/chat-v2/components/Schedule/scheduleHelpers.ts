/**
 * Schedule-send helpers — compute "Later today / Next Monday" suggestions,
 * format human labels, generate 15-minute time slots.
 */

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS_LONG = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function ordinal(n: number): string {
  const v = n % 100;
  if (v >= 11 && v <= 13) return `${n}th`;
  switch (n % 10) {
    case 1: return `${n}st`;
    case 2: return `${n}nd`;
    case 3: return `${n}rd`;
    default: return `${n}th`;
  }
}

export interface ScheduleSuggestion {
  id: string;
  label: string;
  detail: string;
  iso: string;
}

function format12h(d: Date): string {
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

/** "Later today at 9:00 AM" if before 9am, otherwise "Tomorrow at 9:00 AM". */
function buildLaterTodaySuggestion(now: Date): ScheduleSuggestion {
  const target = new Date(now);
  target.setHours(9, 0, 0, 0);
  if (target.getTime() <= now.getTime()) {
    target.setDate(target.getDate() + 1);
    return {
      id: 'tomorrow-9',
      label: 'Tomorrow',
      detail: `Tomorrow at ${format12h(target)}`,
      iso: target.toISOString(),
    };
  }
  return {
    id: 'later-today-9',
    label: 'Later today',
    detail: `Later today at ${format12h(target)}`,
    iso: target.toISOString(),
  };
}

/** Next Monday at 9:00 AM. If today is Monday and before 9am, today. */
function buildMondaySuggestion(now: Date): ScheduleSuggestion {
  const target = new Date(now);
  const dayOfWeek = target.getDay(); // 0..6
  const offset = (1 + 7 - dayOfWeek) % 7 || 7; // skip-today = always next Monday
  target.setDate(target.getDate() + offset);
  target.setHours(9, 0, 0, 0);
  return {
    id: 'monday-9',
    label: 'Monday',
    detail: `Monday at ${format12h(target)}`,
    iso: target.toISOString(),
  };
}

export function getQuickSuggestions(now: Date = new Date()): ScheduleSuggestion[] {
  return [buildLaterTodaySuggestion(now), buildMondaySuggestion(now)];
}

/** Format like "June 20th, 2026". */
export function formatLongDate(d: Date): string {
  return `${MONTHS_LONG[d.getMonth()]} ${ordinal(d.getDate())}, ${d.getFullYear()}`;
}

/** Format like "Today" / "Tomorrow" / "June 20th, 2026". */
export function formatRelativeDate(d: Date, now: Date = new Date()): string {
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const target = new Date(d);
  target.setHours(0, 0, 0, 0);
  const diffDays = Math.round((target.getTime() - today.getTime()) / (24 * 3600 * 1000));
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays === -1) return 'Yesterday';
  return formatLongDate(d);
}

/** Build 15-minute time slots for the full 24 hours starting at midnight. */
export function buildTimeSlots(): Array<{ value: string; label: string }> {
  const slots: Array<{ value: string; label: string }> = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 15) {
      const d = new Date();
      d.setHours(h, m, 0, 0);
      slots.push({
        value: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`,
        label: d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
      });
    }
  }
  return slots;
}

/** Build calendar days for a given month (with leading/trailing blanks). */
export interface CalendarCell {
  date: Date | null;
  inMonth: boolean;
}

export function buildMonthGrid(year: number, month: number): CalendarCell[] {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const startDay = first.getDay();
  const grid: CalendarCell[] = [];
  for (let i = 0; i < startDay; i++) grid.push({ date: null, inMonth: false });
  for (let d = 1; d <= last.getDate(); d++) {
    grid.push({ date: new Date(year, month, d), inMonth: true });
  }
  while (grid.length % 7 !== 0) grid.push({ date: null, inMonth: false });
  return grid;
}

export const WEEKDAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
export const MONTH_LABELS = MONTHS_LONG;

export function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate();
}

export function isFutureOrSameDay(a: Date, today: Date): boolean {
  const dayA = new Date(a); dayA.setHours(0, 0, 0, 0);
  const dayT = new Date(today); dayT.setHours(0, 0, 0, 0);
  return dayA.getTime() >= dayT.getTime();
}

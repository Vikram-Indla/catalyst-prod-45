/**
 * Pure date helpers for the Calendar primitive. No timezone gymnastics —
 * Calendar deals in *calendar* days (year/month/day triples) so DST
 * shifts and locale-specific midnight quirks don't matter.
 *
 * Months are zero-indexed (Jan = 0, Dec = 11). Day-of-week for
 * `getFirstDayOfMonth` follows JS convention (Sun = 0, Sat = 6).
 */

export type Ymd = { year: number; month: number; day: number };

// ----------------------------------------------------------------------------
// ISO date strings (YYYY-MM-DD)
// ----------------------------------------------------------------------------

/** Pad a number to 2 digits (3 → "03"). */
function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

/** Format `{year, month, day}` as an ISO date string (YYYY-MM-DD). */
export function formatISO({ year, month, day }: Ymd): string {
  return `${year}-${pad2(month + 1)}-${pad2(day)}`;
}

/** Parse an ISO date string. Returns `null` if the input doesn't match. */
export function parseISO(s: string): Ymd | null {
  const m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s);
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]) - 1;
  const day = Number(m[3]);
  if (
    year < 0 ||
    month < 0 ||
    month > 11 ||
    day < 1 ||
    day > getDaysInMonth(year, month)
  ) {
    return null;
  }
  return { year, month, day };
}

// ----------------------------------------------------------------------------
// Calendar math
// ----------------------------------------------------------------------------

/** Number of days in the given month. */
export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

/** Day-of-week of the 1st of the given month (Sun=0 … Sat=6). */
export function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

/** Add (or subtract) months. Returns normalised `{year, month}`. */
export function addMonths(
  year: number,
  month: number,
  delta: number,
): { year: number; month: number } {
  const total = year * 12 + month + delta;
  return { year: Math.floor(total / 12), month: ((total % 12) + 12) % 12 };
}

/** Add days to a date. */
export function addDays({ year, month, day }: Ymd, delta: number): Ymd {
  const d = new Date(year, month, day + delta);
  return { year: d.getFullYear(), month: d.getMonth(), day: d.getDate() };
}

/** True when both dates point at the same calendar day. */
export function isSameDay(a: Ymd, b: Ymd): boolean {
  return a.year === b.year && a.month === b.month && a.day === b.day;
}

/** Inclusive range check: `min ≤ date ≤ max`. */
export function isInRange(
  date: Ymd,
  min: Ymd | null,
  max: Ymd | null,
): boolean {
  const value = date.year * 10000 + date.month * 100 + date.day;
  if (min) {
    const lo = min.year * 10000 + min.month * 100 + min.day;
    if (value < lo) return false;
  }
  if (max) {
    const hi = max.year * 10000 + max.month * 100 + max.day;
    if (value > hi) return false;
  }
  return true;
}

/** Compare two dates: -1 if a < b, 0 if equal, 1 if a > b. */
export function compareDays(a: Ymd, b: Ymd): -1 | 0 | 1 {
  const av = a.year * 10000 + a.month * 100 + a.day;
  const bv = b.year * 10000 + b.month * 100 + b.day;
  if (av < bv) return -1;
  if (av > bv) return 1;
  return 0;
}

// ----------------------------------------------------------------------------
// Grid (6×7 day cells, including overflow days from prev / next month)
// ----------------------------------------------------------------------------

export type CalendarCell = Ymd & {
  /** True when this cell is in the active month (false for overflow days). */
  inCurrentMonth: boolean;
};

/**
 * Build the 6-row × 7-column grid of cells for a given month, factoring
 * in the consumer's preferred week start day (0 = Sun, 1 = Mon, …).
 * Always returns 42 cells; overflow days carry `inCurrentMonth: false`.
 */
export function buildGrid(
  year: number,
  month: number,
  weekStartDay: number,
): CalendarCell[] {
  const firstWeekday = getFirstDayOfMonth(year, month);
  const daysInMonth = getDaysInMonth(year, month);
  const offset = (firstWeekday - weekStartDay + 7) % 7;
  const start = addDays({ year, month, day: 1 }, -offset);
  const cells: CalendarCell[] = [];
  for (let i = 0; i < 42; i++) {
    const d = addDays(start, i);
    cells.push({ ...d, inCurrentMonth: d.month === month && d.year === year });
  }
  return cells;
}

// ----------------------------------------------------------------------------
// Locale labels (Intl.DateTimeFormat — no extra deps)
// ----------------------------------------------------------------------------

/** Long month + year label, e.g. "May 2026". */
export function getMonthLabel(
  year: number,
  month: number,
  locale: string,
): string {
  return new Date(year, month, 1).toLocaleDateString(locale, {
    month: "long",
    year: "numeric",
  });
}

/**
 * Day-of-week labels in display order (length 7), starting at the
 * consumer's `weekStartDay`. Uses the `narrow` style for compactness
 * (e.g. ["S","M","T","W","T","F","S"] for en-US starting Sunday).
 *
 * For full names (used as `aria-label` on the column headers), pass
 * `style="long"`.
 */
export function getDayLabels(
  weekStartDay: number,
  locale: string,
  style: "narrow" | "short" | "long" = "narrow",
): string[] {
  const formatter = new Intl.DateTimeFormat(locale, { weekday: style });
  const labels: string[] = [];
  // Sunday 1970-01-04 (a known Sunday) anchors the cycle.
  const baseDate = new Date(Date.UTC(1970, 0, 4));
  for (let i = 0; i < 7; i++) {
    const dayIndex = (weekStartDay + i) % 7;
    const date = new Date(baseDate);
    date.setUTCDate(baseDate.getUTCDate() + dayIndex);
    labels.push(formatter.format(date));
  }
  return labels;
}

/** Long, locale-aware label for a single date. Used for `aria-label`. */
export function getDayAriaLabel(
  { year, month, day }: Ymd,
  locale: string,
): string {
  return new Date(year, month, day).toLocaleDateString(locale, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

// ----------------------------------------------------------------------------
// "Today" helper — kept here so consumers can override via prop for tests
// ----------------------------------------------------------------------------

/** `Ymd` for the current calendar day. */
export function getToday(): Ymd {
  const d = new Date();
  return { year: d.getFullYear(), month: d.getMonth(), day: d.getDate() };
}

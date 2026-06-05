/**
 * Jira-style time parser. Accepts the same surface as Jira's
 * "Time Spent" field: combinations of weeks, days, hours, minutes
 * with the suffixes `w` `d` `h` `m`. Whitespace and case are
 * ignored. Decimals are allowed on each unit.
 *
 *   "2h 30m"  → 150 minutes
 *   "1d"      → 480 minutes (Jira's default 8h workday)
 *   "1w"      → 2400 minutes (5d × 8h)
 *   "45m"     → 45
 *   "1.5h"    → 90
 *   "2h30m"   → 150 (no space required)
 *   "1d 4h"   → 720
 *
 * Returns null when the input is empty or unparseable so the form
 * can surface an inline error without trying to insert a junk row.
 */

const UNIT_MINUTES = {
  w: 60 * 8 * 5, // 1 week = 5 working days
  d: 60 * 8,     // 1 day  = 8 working hours
  h: 60,         // 1 hour = 60 minutes
  m: 1,
} as const;

type Unit = keyof typeof UNIT_MINUTES;

export function parseJiraTime(input: string): number | null {
  if (!input) return null;
  const cleaned = input.trim().toLowerCase().replace(/\s+/g, '');
  if (!cleaned) return null;

  // Reject anything outside `\d.wdhm` — keeps the parser strict
  // (Jira's behaviour) so typos like "2hr 30min" surface as errors.
  if (!/^([0-9]+(?:\.[0-9]+)?[wdhm])+$/.test(cleaned)) return null;

  const re = /([0-9]+(?:\.[0-9]+)?)([wdhm])/g;
  let total = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(cleaned)) !== null) {
    const value = parseFloat(m[1]);
    const unit = m[2] as Unit;
    total += value * UNIT_MINUTES[unit];
  }
  // Round to the nearest minute — Jira stores integers.
  const rounded = Math.round(total);
  return rounded > 0 ? rounded : null;
}

/**
 * Inverse of parseJiraTime — turns minutes into the canonical
 * `2h 30m` display string. Used for rendering existing worklog
 * entries in the list and as the initial value when editing.
 */
export function formatJiraTime(minutes: number): string {
  if (!minutes || minutes <= 0) return '0m';
  const w = Math.floor(minutes / UNIT_MINUTES.w);
  let rest = minutes - w * UNIT_MINUTES.w;
  const d = Math.floor(rest / UNIT_MINUTES.d);
  rest -= d * UNIT_MINUTES.d;
  const h = Math.floor(rest / UNIT_MINUTES.h);
  rest -= h * UNIT_MINUTES.h;
  const m = rest;
  const parts: string[] = [];
  if (w) parts.push(`${w}w`);
  if (d) parts.push(`${d}d`);
  if (h) parts.push(`${h}h`);
  if (m) parts.push(`${m}m`);
  return parts.join(' ');
}

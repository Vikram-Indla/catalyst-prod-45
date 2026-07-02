/**
 * Sprint auto-naming (CAT-SPRINTS-NATIVE-20260702-002 S1.3a, D-003).
 *
 * Format: `<KEY>-Sprint <M>.<W> - <DD Mon YY>`
 *   M  = start month (1-12, no padding)
 *   W  = ceil(startDay / 7)  — week-of-month from the start date
 *   date = sprint END date: start+4d (1 week) / start+11d (2 weeks), Sun→Thu
 *
 * SQL mirror: public.sprint_autoname() (migration 20260703210000) — keep in sync.
 * All arithmetic is UTC; inputs are ISO `yyyy-mm-dd` strings, so no locale or
 * DST traps. Uniqueness/dedupe (`-2`, `-3` suffix) is enforced DB-side.
 */

export type SprintLengthWeeks = 1 | 2;

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;

function parseIsoDateUTC(iso: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
  if (!m) throw new Error(`sprintAutoName: expected yyyy-mm-dd, got "${iso}"`);
  return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
}

/** Sprint end date (ISO yyyy-mm-dd): start+4d for 1 week, start+11d for 2 weeks. */
export function sprintEndDate(startDate: string, lengthWeeks: SprintLengthWeeks): string {
  const d = parseIsoDateUTC(startDate);
  d.setUTCDate(d.getUTCDate() + (lengthWeeks === 2 ? 11 : 4));
  const y = d.getUTCFullYear();
  const mo = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${mo}-${day}`;
}

/** `<KEY>-Sprint <M>.<W> - <DD Mon YY>` — M/W from start date, date shown is the end date. */
export function sprintAutoName(
  projectKey: string,
  startDate: string,
  lengthWeeks: SprintLengthWeeks,
): string {
  const start = parseIsoDateUTC(startDate);
  const month = start.getUTCMonth() + 1;
  const week = Math.ceil(start.getUTCDate() / 7);

  const end = parseIsoDateUTC(sprintEndDate(startDate, lengthWeeks));
  const dd = String(end.getUTCDate()).padStart(2, '0');
  const mon = MONTHS[end.getUTCMonth()];
  const yy = String(end.getUTCFullYear() % 100).padStart(2, '0');

  return `${projectKey}-Sprint ${month}.${week} - ${dd} ${mon} ${yy}`;
}

/**
 * sidebar-clock — pure timezone resolution for the Home sidebar footer clock.
 *
 * Product rule (Vikram, 2026-06-18):
 *   - Riyadh time is ALWAYS shown (the app is built for Saudi Arabia).
 *   - If the user's local offset equals Riyadh's (UTC+3), the two clocks would
 *     render an identical time — so collapse to ONE chip (Riyadh only). Never
 *     duplicate the same time.
 *   - If the user is in any other zone, show TWO chips: their local time AND
 *     Riyadh. Riyadh is mandatory.
 *
 * Riyadh (Asia/Riyadh) observes no DST — fixed UTC+3 year-round. The local
 * zone's DST is handled automatically by Intl, so no offsets are hardcoded.
 */

export const RIYADH_TZ = 'Asia/Riyadh';

/** Wall-clock offset of `timeZone` from UTC, in minutes, at instant `at`. */
export function tzOffsetMinutes(timeZone: string, at: Date): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(at);

  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  const asUTC = Date.UTC(
    get('year'),
    get('month') - 1,
    get('day'),
    get('hour'),
    get('minute'),
    get('second'),
  );
  return Math.round((asUTC - at.getTime()) / 60000);
}

/** Short timezone abbreviation (e.g. "GMT+5:30", "GST") for `timeZone` at `at`. */
export function tzAbbr(timeZone: string, at: Date): string {
  try {
    const part = new Intl.DateTimeFormat('en-US', { timeZone, timeZoneName: 'short' })
      .formatToParts(at)
      .find((p) => p.type === 'timeZoneName');
    return part?.value ?? '';
  } catch {
    return '';
  }
}

/** 24h "HH:MM" for `timeZone` at `at`. */
export function tzTime(timeZone: string, at: Date): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(at);
}

/** "Wed 18 Jun" for `timeZone` at `at`. */
export function tzDate(timeZone: string, at: Date): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone,
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(at);
}

export interface ClockZone {
  time: string;
  abbr: string;
}

export interface ClockZones {
  /** True when the local zone differs from Riyadh — render both chips. */
  showLocal: boolean;
  /** Local zone clock; null when collapsed (local IS Riyadh-equivalent). */
  local: ClockZone | null;
  /** Riyadh clock — always present. */
  riyadh: ClockZone;
  /** Date label, taken from the user's local zone (their calendar day). */
  dateLabel: string;
}

/**
 * Resolve which clocks to show for a user in `localTimeZone` at instant `at`.
 * Collapses to Riyadh-only when the local offset equals Riyadh's.
 */
export function resolveClockZones(
  localTimeZone: string,
  at: Date = new Date(),
): ClockZones {
  const sameAsRiyadh =
    tzOffsetMinutes(localTimeZone, at) === tzOffsetMinutes(RIYADH_TZ, at);

  const riyadh: ClockZone = { time: tzTime(RIYADH_TZ, at), abbr: 'AST' };

  return {
    showLocal: !sameAsRiyadh,
    local: sameAsRiyadh
      ? null
      : { time: tzTime(localTimeZone, at), abbr: tzAbbr(localTimeZone, at) },
    riyadh,
    dateLabel: tzDate(sameAsRiyadh ? RIYADH_TZ : localTimeZone, at),
  };
}

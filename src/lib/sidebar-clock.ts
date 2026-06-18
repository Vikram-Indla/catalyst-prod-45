/**
 * sidebar-clock — pure timezone resolution for the Home sidebar footer clock.
 *
 * Product rule (Vikram, 2026-06-18):
 *   - Riyadh time (the work / HQ zone) is ALWAYS shown — the app is built for
 *     Saudi Arabia. Its row is labelled "Riyadh".
 *   - The resource's HOME time (their base country, from resource_inventory →
 *     resource_countries) is shown as a second row — but ONLY when it is a
 *     different zone. When the resource's home is also UTC+3 (Saudi, Jordan…)
 *     the two rows would render an identical time, so collapse to the single
 *     Riyadh row. Never duplicate the same time.
 *   - There is no device-"Local" row. Home comes from the admin record, not
 *     the browser.
 *
 * Riyadh (Asia/Riyadh) observes no DST — fixed UTC+3. The home zone's DST is
 * handled automatically by Intl, so no offsets are hardcoded.
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

/** 12h "11:46 AM" / "2:16 AM" for `timeZone` at `at`. No timezone suffix. */
export function tzTime(timeZone: string, at: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(at);
}

/** "Thursday, 18 June 2026" for `timeZone` at `at`. */
export function tzDate(timeZone: string, at: Date): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(at);
}

export interface ClockRow {
  /** City/country name shown in the row (e.g. "Riyadh", "India"). */
  label: string;
  /** 12h time, e.g. "11:46 AM" — no timezone suffix. */
  time: string;
}

export interface ClockZones {
  /** One row per distinct zone. Always starts with Riyadh. */
  rows: ClockRow[];
  /** Day + date, anchored to Riyadh (the always-present work zone). */
  dateLabel: string;
}

/**
 * Resolve the clock rows for a resource whose home is `homeTimeZone`
 * (label `homeLabel`, e.g. country name) at instant `at`.
 *
 * Riyadh is always row 0. A Home row is appended only when `homeTimeZone` is
 * present AND its offset differs from Riyadh — otherwise the identical time is
 * suppressed. Pass `homeTimeZone = null` when the resource's home cannot be
 * resolved; the widget then shows Riyadh only (never a fabricated home).
 */
export function resolveClockZones(
  homeTimeZone: string | null,
  homeLabel: string | null,
  at: Date = new Date(),
): ClockZones {
  const rows: ClockRow[] = [
    { label: 'Riyadh', time: tzTime(RIYADH_TZ, at) },
  ];

  if (
    homeTimeZone &&
    tzOffsetMinutes(homeTimeZone, at) !== tzOffsetMinutes(RIYADH_TZ, at)
  ) {
    rows.push({
      label: homeLabel ?? 'Home',
      time: tzTime(homeTimeZone, at),
    });
  }

  return { rows, dateLabel: tzDate(RIYADH_TZ, at) };
}

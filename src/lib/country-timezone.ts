/**
 * country-timezone — maps a resource's home country NAME (from
 * resource_countries.name) to an IANA timezone for the sidebar clock's
 * "Home" row.
 *
 * Why name, not ISO code: `resource_countries.code` is NULL for every row
 * (probed 2026-06-18). The only populated identifier is `name`.
 *
 * Only single-timezone countries are mapped. Multi-zone countries (US, Russia,
 * etc.) are intentionally absent — a single national timezone would be a lie.
 * An unmapped or null name returns null, and the caller renders NO Home row
 * (silence beats a wrong time — CLAUDE.md zero-assumption rule).
 *
 * DST is handled by Intl at format time; no offsets are hardcoded here.
 */

const COUNTRY_TZ: Record<string, string> = {
  // 7 active resource_countries (probed 2026-06-18)
  albania: 'Europe/Tirane',
  egypt: 'Africa/Cairo',
  india: 'Asia/Kolkata',
  jordan: 'Asia/Amman',
  pakistan: 'Asia/Karachi',
  'saudi arabia': 'Asia/Riyadh',
  sudan: 'Africa/Khartoum',
  kosovo: 'Europe/Belgrade',
  // Common single-zone neighbours, so newly-added resources resolve too.
  bahrain: 'Asia/Bahrain',
  kuwait: 'Asia/Kuwait',
  qatar: 'Asia/Qatar',
  oman: 'Asia/Muscat',
  yemen: 'Asia/Aden',
  'united arab emirates': 'Asia/Dubai',
  uae: 'Asia/Dubai',
  lebanon: 'Asia/Beirut',
  syria: 'Asia/Damascus',
  iraq: 'Asia/Baghdad',
  bangladesh: 'Asia/Dhaka',
  nepal: 'Asia/Kathmandu',
  'sri lanka': 'Asia/Colombo',
  philippines: 'Asia/Manila',
};

/** Resolve a country name to an IANA timezone, or null when unknown. */
export function countryToTimezone(name: string | null | undefined): string | null {
  if (!name) return null;
  return COUNTRY_TZ[name.trim().toLowerCase()] ?? null;
}

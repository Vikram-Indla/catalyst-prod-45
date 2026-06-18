import { describe, it, expect } from 'vitest';
import {
  RIYADH_TZ,
  tzOffsetMinutes,
  resolveClockZones,
} from './sidebar-clock';
import { countryToTimezone } from './country-timezone';

// Fixed instant — 2026-06-18T12:00:00Z. Riyadh has no DST (always UTC+3).
const AT = new Date('2026-06-18T12:00:00Z');

describe('tzOffsetMinutes', () => {
  it('returns +180 for Riyadh (UTC+3, no DST)', () => {
    expect(tzOffsetMinutes(RIYADH_TZ, AT)).toBe(180);
  });
  it('returns +330 for India (IST, UTC+5:30)', () => {
    expect(tzOffsetMinutes('Asia/Kolkata', AT)).toBe(330);
  });
});

describe('countryToTimezone', () => {
  it('maps the 7 active resource countries', () => {
    expect(countryToTimezone('Albania')).toBe('Europe/Tirane');
    expect(countryToTimezone('Egypt')).toBe('Africa/Cairo');
    expect(countryToTimezone('India')).toBe('Asia/Kolkata');
    expect(countryToTimezone('Jordan')).toBe('Asia/Amman');
    expect(countryToTimezone('Pakistan')).toBe('Asia/Karachi');
    expect(countryToTimezone('Saudi Arabia')).toBe('Asia/Riyadh');
    expect(countryToTimezone('Sudan')).toBe('Africa/Khartoum');
    expect(countryToTimezone('Kosovo')).toBe('Europe/Belgrade');
  });
  it('is case- and whitespace-insensitive', () => {
    expect(countryToTimezone('  india ')).toBe('Asia/Kolkata');
    expect(countryToTimezone('SAUDI ARABIA')).toBe('Asia/Riyadh');
  });
  it('returns null for an unknown country (no lie)', () => {
    expect(countryToTimezone('Atlantis')).toBeNull();
    expect(countryToTimezone(null)).toBeNull();
    expect(countryToTimezone('')).toBeNull();
  });
});

describe('resolveClockZones', () => {
  const TIME_12H = /^\d{1,2}:\d{2}\s(AM|PM)$/;

  it('always shows a Riyadh row, even with no home', () => {
    const z = resolveClockZones(null, null, AT);
    expect(z.rows).toHaveLength(1);
    expect(z.rows[0].label).toBe('Riyadh');
    expect(z.rows[0].time).toMatch(TIME_12H);
    expect(z.dateLabel).toBeTruthy();
  });

  it('adds a Home row labelled with the country name (no "Home ·" prefix)', () => {
    const z = resolveClockZones('Asia/Kolkata', 'India', AT);
    expect(z.rows).toHaveLength(2);
    expect(z.rows[0].label).toBe('Riyadh');
    expect(z.rows[1].label).toBe('India');
    expect(z.rows[1].time).toMatch(TIME_12H);
  });

  it('collapses to a single Riyadh row when home is also UTC+3 (no duplicate)', () => {
    expect(resolveClockZones('Asia/Riyadh', 'Saudi Arabia', AT).rows).toHaveLength(1);
    // Jordan is fixed UTC+3 too → still one row.
    expect(resolveClockZones('Asia/Amman', 'Jordan', AT).rows).toHaveLength(1);
  });

  it('never invents a home zone when unresolved', () => {
    const z = resolveClockZones(null, 'India', AT); // label present, tz missing
    expect(z.rows).toHaveLength(1);
    expect(z.rows[0].label).toBe('Riyadh');
  });
});

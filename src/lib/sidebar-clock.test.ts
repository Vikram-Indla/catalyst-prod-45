import { describe, it, expect } from 'vitest';
import { RIYADH_TZ, tzOffsetMinutes, resolveClockZones } from './sidebar-clock';

// Fixed instant — 2026-06-18T12:00:00Z. Riyadh has no DST (always UTC+3).
const AT = new Date('2026-06-18T12:00:00Z');

describe('tzOffsetMinutes', () => {
  it('returns +180 for Riyadh (UTC+3, no DST)', () => {
    expect(tzOffsetMinutes(RIYADH_TZ, AT)).toBe(180);
  });

  it('returns +330 for India (IST, UTC+5:30)', () => {
    expect(tzOffsetMinutes('Asia/Kolkata', AT)).toBe(330);
  });

  it('returns 0 for UTC', () => {
    expect(tzOffsetMinutes('UTC', AT)).toBe(0);
  });
});

describe('resolveClockZones', () => {
  it('collapses to Riyadh-only when local IS Riyadh', () => {
    const r = resolveClockZones('Asia/Riyadh', AT);
    expect(r.showLocal).toBe(false);
    expect(r.riyadh.time).toMatch(/^\d{2}:\d{2}$/);
  });

  it('collapses to Riyadh-only for another UTC+3 zone (no duplicate identical time)', () => {
    // Kuwait is also UTC+3 — local time would equal Riyadh, so show one.
    const r = resolveClockZones('Asia/Kuwait', AT);
    expect(r.showLocal).toBe(false);
  });

  it('shows two zones when away from Riyadh, Riyadh mandatory', () => {
    const r = resolveClockZones('Asia/Kolkata', AT);
    expect(r.showLocal).toBe(true);
    expect(r.local).not.toBeNull();
    expect(r.local!.abbr).toBeTruthy();
    expect(r.riyadh.time).toMatch(/^\d{2}:\d{2}$/);
  });

  it('always carries a Riyadh time regardless of locale', () => {
    expect(resolveClockZones('America/New_York', AT).riyadh.time).toMatch(/^\d{2}:\d{2}$/);
    expect(resolveClockZones('Asia/Riyadh', AT).riyadh.time).toMatch(/^\d{2}:\d{2}$/);
  });
});

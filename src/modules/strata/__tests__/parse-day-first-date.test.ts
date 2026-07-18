import { describe, it, expect } from 'vitest';
import { parseDayFirstDate } from '../components/vmoAuthoring';

// PB-DEF-005 — a valid day-first date must never be silently dropped.
describe('parseDayFirstDate (gate scheduling, day-first)', () => {
  const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  it('parses the reproduction date 31/12/2026 day-first', () => {
    expect(iso(parseDayFirstDate('31/12/2026'))).toBe('2026-12-31');
  });

  it('accepts 1-digit day/month and - or . separators', () => {
    expect(iso(parseDayFirstDate('1/2/2026'))).toBe('2026-02-01');
    expect(iso(parseDayFirstDate('05-06-2026'))).toBe('2026-06-05');
    expect(iso(parseDayFirstDate('09.10.2026'))).toBe('2026-10-09');
  });

  it('rejects US month-first / overflow / junk as Invalid Date (never a wrong date)', () => {
    // 13 is not a valid month → would be a US-first read of 13/12; must not silently accept.
    expect(Number.isNaN(parseDayFirstDate('13/13/2026').getTime())).toBe(true);
    expect(Number.isNaN(parseDayFirstDate('31/02/2026').getTime())).toBe(true); // Feb 31 rolls over
    expect(Number.isNaN(parseDayFirstDate('not a date').getTime())).toBe(true);
    expect(Number.isNaN(parseDayFirstDate('').getTime())).toBe(true);
  });
});

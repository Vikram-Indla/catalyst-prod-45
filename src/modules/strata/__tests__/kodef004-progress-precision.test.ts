// CAT-STRATA-THEMEOKR-20260719-001 — KO-DEF-004 guard: the KR progress grid must never expose a
// raw floating-point fraction in visible or accessibility text. krProgressFraction keeps full
// precision for evidence; krProgressPercent is the authoritative whole-percent used for display + aria.
import { describe, it, expect } from 'vitest';
import { krProgressFraction, krProgressPercent } from '../components/shared';

const kr = (o: Record<string, unknown>) =>
  ({ id: 'k', okr_id: 'o', kpi_id: null, name: '', unit: null, status: '', direction: 'higher_better', ...o }) as never;

describe('KO-DEF-004 — KR progress precision', () => {
  it('krProgressFraction keeps full precision for internal/evidence use', () => {
    expect(krProgressFraction(kr({ baseline: 22, target: 75, current_value: 48 }))).toBeCloseTo(26 / 53, 12);
  });

  it('krProgressPercent is always a whole integer — no raw float can reach display/a11y text', () => {
    const p = krProgressPercent(kr({ baseline: 22, target: 75, current_value: 48 }));
    expect(p).toBe(49);
    expect(Number.isInteger(p as number)).toBe(true);
    expect(String(p)).not.toContain('.');
  });

  it('rounds the three documented KO-DEF-004 evidence cases to whole percent', () => {
    // raw floats seen on "Investor Digital Adoption FY2026": 0.49056603773584906 / 0.3684210526315789 / 0.5555555555555556
    expect(krProgressPercent(kr({ baseline: 22, target: 75, current_value: 48 }))).toBe(49);
    expect(krProgressPercent(kr({ baseline: 1200, target: 5000, current_value: 2600 }))).toBe(37);
    expect(krProgressPercent(kr({ baseline: 14, target: 5, current_value: 9, direction: 'lower_better' }))).toBe(56);
  });

  it('returns null when progress is incomputable (no fabricated value)', () => {
    expect(krProgressPercent(kr({ baseline: 10, target: 10, current_value: 10 }))).toBeNull();
    expect(krProgressPercent(kr({ baseline: 0, target: null, current_value: 5 }))).toBeNull();
  });
});

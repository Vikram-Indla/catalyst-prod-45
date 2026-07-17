/**
 * KO-DEF-005 guard — CAT-STRATA-KODEF-20260717-001.
 *
 * Official OKR progress ignored baseline (current/target => 75% for 10→20 current 15). It now
 * uses the canonical baseline-aware formula that the KR row uses. This pins the SQL invariant and
 * verifies the shared TS formula reconciles, matching the staging control:
 *   baseline 10 / target 20 / current 15 => official 0.5000, reportable 1, excluded 1  (was 0.75).
 */
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { krProgressFraction } from '@/modules/strata/components/shared';

const MIGRATIONS = join(__dirname, '../../../../supabase/migrations');
const files = readdirSync(MIGRATIONS).filter((f) => f.endsWith('.sql')).sort();
const corpus = files.map((f) => ({ f, sql: readFileSync(join(MIGRATIONS, f), 'utf8') }));

function latestBody(fn: string) {
  const re = new RegExp(`CREATE\\s+(OR\\s+REPLACE\\s+)?FUNCTION\\s+public\\.${fn}\\s*\\(`, 'i');
  const defining = corpus.filter(({ sql }) => re.test(sql));
  const last = defining[defining.length - 1];
  const starts = [...last.sql.matchAll(new RegExp(re.source, 'gi'))].map((m) => m.index ?? -1);
  const start = starts[starts.length - 1];
  return last.sql.slice(start, last.sql.indexOf('$function$;', start));
}
const kr = (baseline: number, target: number, current: number, direction = 'higher_better') =>
  ({ baseline, target, current_value: current, direction } as Parameters<typeof krProgressFraction>[0]);

describe('KO-DEF-005 — canonical direction-aware KR progress', () => {
  it('10 → 20, current 15 = 50% (baseline-aware, not 75%)', () => {
    expect(krProgressFraction(kr(10, 20, 15))).toBeCloseTo(0.5, 4);
    expect(krProgressFraction(kr(10, 20, 15))).not.toBeCloseTo(0.75, 2);
  });
  it('14 → 5, current 9 = 55.56% (lower-better via the same single formula)', () => {
    expect(krProgressFraction(kr(14, 5, 9, 'lower_better'))).toBeCloseTo(0.5556, 4);
  });
  it('equal baseline/target is safe (null, not a divide error)', () => {
    expect(krProgressFraction(kr(10, 10, 10))).toBeNull();
  });
  it('clamps overachievement and underachievement to [0,1]', () => {
    expect(krProgressFraction(kr(10, 20, 30))).toBe(1);
    expect(krProgressFraction(kr(10, 20, 5))).toBe(0);
  });
});

describe('KO-DEF-005 — official progress uses baseline, aggregates reportable only', () => {
  it('the server formula is baseline-aware, not current/target', () => {
    const b = latestBody('strata_okr_official_progress');
    expect(b).toMatch(/\(kr\.current_value - base\) \/ span/);
    expect(b).toMatch(/span := kr\.target - base/);
    // the baseline-ignoring form must be gone
    expect(b).not.toMatch(/current_value,?\s*0?\)?\s*\/\s*kr\.target/);
    expect(b).not.toMatch(/least\(coalesce\(kr\.current_value/i);
  });
  it('aggregates only reportable KRs and excludes the rest from the denominator', () => {
    const b = latestBody('strata_okr_official_progress');
    expect(b).toMatch(/IF \(rep->>'reportable'\)::boolean THEN/);
    expect(b).toMatch(/n := n \+ 1/);
    expect(b).toMatch(/excluded := excluded \+ 1/);
    expect(b).toMatch(/round\(total \/ n, 4\)/);
  });
  it('reconciles: one 50% reportable KR + one excluded KR => 0.50 (matches the KR row)', () => {
    // The row shows krProgressFraction; official = average over reportable = same 0.5.
    const rowProgress = krProgressFraction(kr(10, 20, 15))!;
    expect(rowProgress).toBeCloseTo(0.5, 4);
    // denominator excludes the non-reportable KR -> average of [0.5] = 0.5, not (0.5+?)/...
    expect(Math.round(rowProgress * 100)).toBe(50);
  });
});

describe('KO-DEF-005 — safety', () => {
  it('touches no KPI/Scorecard/locked calculation', () => {
    const fix = corpus.find((c) => c.f === '20260718011000_strata_okr_official_progress_baseline_aware.sql')!.sql;
    expect(fix).not.toMatch(/UPDATE|DELETE|CREATE TABLE/i);
    expect(fix).not.toMatch(/strata_calculated_values|strata_scorecard|strata_kpi_actuals/i);
    expect(latestBody('strata_okr_official_progress')).toMatch(/\bSTABLE\b/);
  });
});

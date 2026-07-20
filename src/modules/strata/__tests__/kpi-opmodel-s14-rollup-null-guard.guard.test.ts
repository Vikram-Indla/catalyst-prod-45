/**
 * KPI-OPMODEL S14 — null as_of guard on the aggregation path.
 * Browser testing revealed the UI calls the roll-up with p_as_of := null, which made
 * `as_of_date <= NULL` always false -> included 0. Applied + verified on staging (result 72).
 */
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const DIR = join(__dirname, '..', '..', '..', '..', 'supabase', 'migrations');
const FILES = readdirSync(DIR).filter((f) => f.endsWith('.sql')).sort();
const MIGRATIONS = FILES.map((f) => ({ f, sql: readFileSync(join(DIR, f), 'utf8') }));
function latestBody(fn: string): string {
  let body = '';
  for (const { sql } of MIGRATIONS) {
    const re = new RegExp(`CREATE (?:OR REPLACE )?FUNCTION public\\.${fn}\\s*\\(([\\s\\S]*?)\\$(?:function)?\\$;`, 'g');
    let m: RegExpExecArray | null; while ((m = re.exec(sql)) !== null) body = m[0];
  }
  expect(body, `no def for ${fn}`).not.toBe(''); return body;
}
describe('KPI-OPMODEL S14 — null as_of guard', () => {
  it('roll-up coalesces p_as_of to current_date', () => {
    expect(latestBody('strata_calc_assignment_rollup')).toMatch(/p_as_of := COALESCE\(p_as_of, current_date\)/);
  });
  it('observation resolver coalesces p_as_of to current_date', () => {
    expect(latestBody('strata_resolve_assignment_observation')).toMatch(/p_as_of := COALESCE\(p_as_of, current_date\)/);
  });
});

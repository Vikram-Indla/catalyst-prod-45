/**
 * KPI-OPMODEL Slices S6+S8 — retirement impact / audit / formula date-scope guard.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const DIR = join(__dirname, '..', '..', '..', '..', 'supabase', 'migrations');
const FILES = readdirSync(DIR).filter((f) => f.endsWith('.sql')).sort();
const MIGRATIONS = FILES.map((f) => ({ f, sql: readFileSync(join(DIR, f), 'utf8') }));
const S6 = MIGRATIONS.find((m) => m.f === '20260720126000_strata_s6_retirement_impact_audit.sql');
const S8 = MIGRATIONS.find((m) => m.f === '20260720127000_strata_s8_formula_effective_resolution.sql');

function latestBody(fn: string): string {
  let body = '';
  for (const { sql } of MIGRATIONS) {
    const re = new RegExp(`CREATE (?:OR REPLACE )?FUNCTION public\\.${fn}\\s*\\(([\\s\\S]*?)\\$(?:function)?\\$;`, 'g');
    let m: RegExpExecArray | null;
    while ((m = re.exec(sql)) !== null) body = m[0];
  }
  expect(body, `no definition found for ${fn}`).not.toBe('');
  return body;
}

describe('KPI-OPMODEL S6 — dependency impact + retire guard + audit', () => {
  it('STRATA-KPI-047/048: dependency impact now counts the new spine', () => {
    const body = latestBody('strata_kpi_dependency_impact');
    for (const key of ["'kpi_assignments'", "'contribution_mappings'", "'assignment_backed_krs'", "'assignment_observations'"]) {
      expect(body, `impact missing ${key}`).toContain(key);
    }
    // new active entities enter active_total
    expect(body).toMatch(/active_total.*as_cur \+ cm_cur \+ krlink_cur/s);
  });
  it('STRATA-KPI-049: element retire guard blocks on approved assignments/alignments', () => {
    const body = latestBody('strata_guard_element_retire');
    expect(body).toContain('RETIREMENT_BLOCKED');
    expect(body).toContain('strata_kpi_assignments');
    expect(body).toContain('strata_project_objective_alignments');
  });
  it('STRATA-KPI-051: audit triggers attached to the new governed tables', () => {
    const sql = S6!.sql;
    expect(sql).toContain('strata_audit()');
    for (const t of ['strata_kpi_assignments', 'strata_kpi_assignment_observations', 'strata_kpi_contribution_mappings', 'strata_project_objective_alignments']) {
      expect(sql).toContain(t);
    }
  });
});

describe('KPI-OPMODEL S8 — formula date-scoped resolution (STRATA-KPI-003)', () => {
  it('adds effective dating + overlap exclusion + resolver', () => {
    const sql = S8!.sql;
    expect(sql).toMatch(/ADD COLUMN IF NOT EXISTS effective_from timestamptz/);
    expect(sql).toContain('strata_formula_no_overlap');
    expect(sql).toContain('EXCLUDE USING gist');
  });
  it('resolver picks the effective window, falls back to latest approved', () => {
    const body = latestBody('strata_resolve_kpi_formula');
    expect(body).toMatch(/effective_from <= p_as_of AND \(effective_to IS NULL OR effective_to > p_as_of\)/);
    expect(body).toMatch(/ORDER BY version DESC LIMIT 1/);
  });
  it('backfill is additive + non-overlapping (only approved rows, windows closed)', () => {
    // hardened backfill: CTE over approved rows, closes superseded windows via lead(),
    // only touches not-yet-backfilled rows — safe even with multiple approved versions.
    expect(S8!.sql).toMatch(/WHERE status = 'approved'/);
    expect(S8!.sql).toMatch(/lead\(COALESCE\(effective_from, approved_at, created_at\)\)/);
    expect(S8!.sql).toMatch(/WHERE f\.id = o\.id AND f\.effective_from IS NULL/);
  });
});

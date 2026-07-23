/**
 * S20 — enterprise governed rollup read model (CAT-STRATA-KPI-OPMODEL-20260720-001).
 * Executive Reporting/Command Center read model must use the EXACT S19 aggregation rule
 * (approved, currently-effective direct_component only) and be one set-based query (no per-card
 * N+1). Applied + runtime-verified on staging (20260722110000): parent d0d522d2 => 1 aggregating
 * (direct_component) + 1 non-aggregating (driver). Guard asserts the SQL contract statically.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const DIR = join(__dirname, '..', '..', '..', '..', 'supabase', 'migrations');
const SQL = readFileSync(join(DIR, '20260722110000_strata_s20_executive_governed_rollup.sql'), 'utf8');

describe('S20 — executive governed rollup read model', () => {
  it('exposes strata_executive_governed_rollup, granted to authenticated', () => {
    expect(SQL).toContain('FUNCTION public.strata_executive_governed_rollup');
    expect(SQL).toMatch(/GRANT EXECUTE ON FUNCTION public\.strata_executive_governed_rollup/);
  });

  it('aggregates ONLY approved, currently-effective direct_component (S19 rule)', () => {
    expect(SQL).toMatch(/relationship_type='direct_component'\s+AND\s+cm\.status='approved'/);
    expect(SQL).toMatch(/COALESCE\(cm\.effective_from, now\(\)\)<=now\(\)/);
    expect(SQL).toMatch(/cm\.effective_to IS NULL OR cm\.effective_to > now\(\)/);
  });

  it('separates aggregating from non-aggregating (registry reuse / driver never rolls up)', () => {
    expect(SQL).toMatch(/count\(\*\) FILTER \(WHERE aggregates\) AS agg_count/);
    expect(SQL).toMatch(/count\(\*\) FILTER \(WHERE NOT aggregates\) AS non_agg_count/);
  });

  it('is a single set-based query (no per-card loop / no PERFORM-per-card)', () => {
    expect(SQL).toContain('LANGUAGE sql');
    expect(SQL).not.toMatch(/FOR\s+\w+\s+IN\s+SELECT/i); // no row-by-row loop
    expect(SQL).not.toMatch(/strata_project_kpi_trace/); // does not call the per-card RPC N times
  });

  it('links KRs via the real contract column, not a fabricated basis', () => {
    expect(SQL).toMatch(/kr\.strategic_assignment_id = s\.strategic_assignment_id/);
  });
});

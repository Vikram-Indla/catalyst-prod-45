/**
 * EXECMODEL S18 — KPI assignment repair verb (CAT-STRATA-EXECMODEL-20260721-001, #14).
 * A merged-form draft missing owner/period/target(band) was permanently stuck: the validator blocked
 * submit and no update path existed. strata_update_kpi_assignment lets a draft/rejected assignment be
 * repaired before submit; approved assignments stay versioned (not edited). D-4: assignment
 * kr_eligible may only NARROW the KPI Definition designation. Applied on staging (20260721110814).
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const DIR = join(__dirname, '..', '..', '..', '..', 'supabase', 'migrations');
const SQL = readFileSync(join(DIR, '20260721110814_strata_s18_kpi_assignment_repair.sql'), 'utf8');

describe('EXECMODEL S18 — assignment repair verb', () => {
  it('adds strata_update_kpi_assignment, granted to authenticated', () => {
    expect(SQL).toContain('FUNCTION public.strata_update_kpi_assignment');
    expect(SQL).toMatch(/GRANT EXECUTE ON FUNCTION public\.strata_update_kpi_assignment/);
  });

  it('edits only draft/rejected assignments (approved are versioned, not edited)', () => {
    expect(SQL).toMatch(/status NOT IN \('draft','rejected'\)[\s\S]*INVALID_TRANSITION/);
  });

  it('is role-gated and optimistic-locked', () => {
    expect(SQL).toMatch(/strata_has_role\(ARRAY\['strategy_office','kpi_owner','okr_owner'\]\)/);
    expect(SQL).toContain('STALE_WRITE');
    expect(SQL).toMatch(/p_lock_version <> a\.lock_version/);
  });

  it('enforces D-4: assignment kr_eligible may only narrow the KPI definition', () => {
    expect(SQL).toMatch(/COALESCE\(p_kr_eligible, a\.kr_eligible\) AND NOT kpi\.kr_eligible[\s\S]*INVALID_KR_ELIGIBLE/);
  });

  it('repairs the stuck-draft fields (owner/target/band/period) but not identity (kpi/scope/element)', () => {
    expect(SQL).toMatch(/owner_id\s*=\s*COALESCE\(p_owner, owner_id\)/);
    expect(SQL).toMatch(/start_period_id\s*=\s*COALESCE\(p_start_period, start_period_id\)/);
    expect(SQL).not.toMatch(/kpi_id\s*=\s*COALESCE/);
    expect(SQL).not.toMatch(/scope_type\s*=\s*COALESCE/);
    expect(SQL).not.toMatch(/element_id\s*=\s*COALESCE/);
  });
});

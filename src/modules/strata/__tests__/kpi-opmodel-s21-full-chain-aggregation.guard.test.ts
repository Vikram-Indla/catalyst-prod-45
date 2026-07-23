/**
 * S21 — full-chain governed aggregation eligibility (CAT-STRATA-KPI-OPMODEL-20260720-001).
 * Aiden's acceptance found S19/S20 returned aggregates=true without the approved Project Objective
 * Alignment. S21 introduces strata_contribution_aggregates (single source of truth) requiring the
 * COMPLETE chain, and redefines the trace + rollup to call it. Applied + runtime-verified on staging
 * (20260722120000): same mapping = false without alignment, true with approved matching alignment;
 * driver = false; temporal (as_of before effective) = false.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const DIR = join(__dirname, '..', '..', '..', '..', 'supabase', 'migrations');
const SQL = readFileSync(join(DIR, '20260722120000_strata_s21_full_chain_aggregation_eligibility.sql'), 'utf8');
const helper = SQL.slice(SQL.indexOf('FUNCTION public.strata_contribution_aggregates'), SQL.indexOf('COMMENT ON FUNCTION'));

describe('S21 — full-chain governed aggregation eligibility', () => {
  it('defines a single-source helper the trace AND rollup both call (no duplicated invariant)', () => {
    expect(SQL).toContain('FUNCTION public.strata_contribution_aggregates');
    // both consumers delegate to the helper
    expect(SQL).toMatch(/'aggregates', public\.strata_contribution_aggregates\(cm\.id, v_as_of\)/);
    expect(SQL).toMatch(/public\.strata_contribution_aggregates\(cm\.id, now\(\)\) AS aggregates/);
  });

  it('direct_component complete chain => true requires the typed mapping', () => {
    expect(helper).toMatch(/cm\.relationship_type = 'direct_component'/);
    expect(helper).toMatch(/cm\.status = 'approved'/);
  });

  it('driver / supporting_evidence / none => false (only direct_component qualifies)', () => {
    // the ONLY relationship_type permitted is direct_component; nothing else is whitelisted
    expect(helper).not.toMatch(/relationship_type\s*(=|IN)\s*.*driver/);
    expect(helper).not.toMatch(/relationship_type\s*(=|IN)\s*.*supporting/);
  });

  it('unapproved/expired CHILD assignment => false', () => {
    expect(helper).toMatch(/child\.status = 'approved'/);
    expect(helper).toMatch(/COALESCE\(child\.effective_from, p_as_of\) <= p_as_of/);
    expect(helper).toMatch(/child\.effective_to IS NULL OR child\.effective_to > p_as_of/);
  });

  it('unapproved/expired PARENT assignment => false', () => {
    expect(helper).toMatch(/parent\.status = 'approved'/);
    expect(helper).toMatch(/parent\.effective_to IS NULL OR parent\.effective_to > p_as_of/);
  });

  it('missing alignment => false; mismatched Strategic Objective => false', () => {
    // requires an APPROVED alignment connecting the child project objective to the parent strategic objective
    expect(helper).toMatch(/strata_project_objective_alignments al/);
    expect(helper).toMatch(/al\.status = 'approved'/);
    expect(helper).toMatch(/al\.project_objective_id = child\.project_objective_id/);
    expect(helper).toMatch(/al\.strategic_objective_id = parent\.element_id/);
  });

  it('does not rewrite S9/S19/S20 history (forward-only)', () => {
    expect(SQL).toMatch(/S9, S19 and S20 migration files are NOT edited/);
    expect(SQL).not.toMatch(/DROP FUNCTION/);
  });
});

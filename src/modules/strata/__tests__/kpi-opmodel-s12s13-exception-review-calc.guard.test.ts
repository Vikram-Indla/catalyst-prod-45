/**
 * KPI-OPMODEL S12/S13 — governed alignment exception (038), review evidence (046),
 * notification wiring (052), formula-resolver calc wiring (003).
 * Applied + execution-verified on catalyst-staging.
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
    let m: RegExpExecArray | null;
    while ((m = re.exec(sql)) !== null) body = m[0];
  }
  expect(body, `no definition for ${fn}`).not.toBe('');
  return body;
}

describe('KPI-OPMODEL S12 — exception / review / notify', () => {
  it('038: alignment validator honours a governed exception', () => {
    const b = latestBody('strata_alignment_validate');
    expect(b).toMatch(/exception_approved_by IS NULL/);
    expect(b).toContain('exception_applied');
    expect(latestBody('strata_grant_alignment_exception')).toContain('strategy_office');
  });
  it('046: retiring an approved contribution mapping requires review evidence', () => {
    expect(latestBody('strata_guard_mapping_review_evidence')).toContain('REVIEW_REQUIRED');
    expect(latestBody('strata_retire_contribution_mapping')).toContain('REVIEW_REQUIRED');
  });
  it('052: approving a KPI assignment notifies the owner', () => {
    expect(latestBody('strata_approve_kpi_assignment')).toMatch(/strata_notify\([\s\S]*kpi_assignment_approved/);
  });
});

describe('KPI-OPMODEL S13 — calc uses the date-scoped formula resolver (003)', () => {
  it('strata_calc_kpi_achievement resolves the effective formula, not latest-approved', () => {
    const b = latestBody('strata_calc_kpi_achievement');
    expect(b).toMatch(/id = public\.strata_resolve_kpi_formula\(v_resolved, v_as_of\)/);
    // the old "latest approved" formula select must be gone from the latest definition
    expect(b).not.toMatch(/kpi_id = v_resolved AND status = 'approved'\s*\n\s*ORDER BY version DESC LIMIT 1/);
  });
});

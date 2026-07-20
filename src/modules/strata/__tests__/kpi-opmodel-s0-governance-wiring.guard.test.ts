/**
 * KPI-OPMODEL Slice S0 — migration guard for the OKR/KR governance wiring
 * (CAT-STRATA-KPI-OPMODEL-20260720-001).
 *
 * Pattern-A guard: asserts the LATEST definition of each shipped function still
 * carries the S0 wiring, so a later migration cannot silently unwire the KR
 * contract enforcement (KPI-010), the material-edit lock (KPI-021), or the
 * explicit weighting policy (KPI-020) without this file failing.
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
    const re = new RegExp(
      `CREATE (?:OR REPLACE )?FUNCTION public\\.${fn}\\s*\\(([\\s\\S]*?)\\$(?:function)?\\$;`,
      'g',
    );
    let m: RegExpExecArray | null;
    while ((m = re.exec(sql)) !== null) body = m[0];
  }
  expect(body, `no definition found for ${fn}`).not.toBe('');
  return body;
}

describe('KPI-OPMODEL S0 — STRATA-KPI-010: OKR activation requires valid KR contracts', () => {
  it('strata_okr_validate invokes strata_kr_validate_contract at approve stage', () => {
    const body = latestBody('strata_okr_validate');
    expect(body).toContain('strata_kr_validate_contract');
    expect(body).toContain('KR_CONTRACT_INVALID');
    expect(body).toMatch(/p_stage\s*=\s*'approve'/);
  });
  it('draft/submit is not gated by KR-contract validity (approve-only)', () => {
    const body = latestBody('strata_okr_validate');
    // the contract check must be inside the p_stage='approve' guard, not unconditional
    const idxGuard = body.indexOf("p_stage = 'approve'");
    const idxCheck = body.indexOf('KR_CONTRACT_INVALID');
    expect(idxGuard).toBeGreaterThan(-1);
    expect(idxCheck).toBeGreaterThan(idxGuard);
  });
});

describe('KPI-OPMODEL S0 — STRATA-KPI-021: material KR edits locked after draft', () => {
  it('strata_kr_assert_editable blocks when parent OKR is not draft/rejected', () => {
    const body = latestBody('strata_kr_assert_editable');
    expect(body).toMatch(/status\s+NOT IN\s*\('draft','rejected'\)/);
    expect(body).toContain('INVALID_TRANSITION');
  });
  it.each(['strata_configure_kr_source', 'strata_configure_kr_formula', 'strata_configure_kr_phasing'])(
    '%s calls strata_kr_assert_editable',
    (fn) => {
      expect(latestBody(fn)).toContain('strata_kr_assert_editable');
    },
  );
});

describe('KPI-OPMODEL S0 — STRATA-KPI-020: explicit versioned weighting policy', () => {
  it('official progress reads weighting_policy mode and exposes it', () => {
    const body = latestBody('strata_okr_official_progress_v2');
    expect(body).toContain("weighting_policy->>'mode'");
    expect(body).toContain('weighting_policy_mode');
    // additive per D-1: null/auto preserves prior behavior
    expect(body).toMatch(/COALESCE\(ver\.weighting_policy->>'mode','auto'\)/);
    expect(body).toMatch(/policy_mode\s*=\s*'equal'/);
    expect(body).toMatch(/policy_mode\s+IN\s*\('weighted','auto'\)/);
  });
});

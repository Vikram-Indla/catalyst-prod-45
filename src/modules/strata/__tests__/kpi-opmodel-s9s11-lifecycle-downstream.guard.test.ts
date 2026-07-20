/**
 * KPI-OPMODEL Slices S9–S11 — lifecycle completeness, downstream reads,
 * snapshot/notify/review, and the observation-period E2E fix.
 * (CAT-STRATA-KPI-OPMODEL-20260720-001) — applied + verified on catalyst-staging.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const DIR = join(__dirname, '..', '..', '..', '..', 'supabase', 'migrations');
const FILES = readdirSync(DIR).filter((f) => f.endsWith('.sql')).sort();
const MIGRATIONS = FILES.map((f) => ({ f, sql: readFileSync(join(DIR, f), 'utf8') }));
const S9 = MIGRATIONS.find((m) => m.f === '20260720130000_strata_s9_lifecycle_completeness.sql');
const S10 = MIGRATIONS.find((m) => m.f === '20260720131000_strata_s10_snapshot_notify_review.sql');
const S11 = MIGRATIONS.find((m) => m.f === '20260720132000_strata_s11_observation_period_default.sql');

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

describe('KPI-OPMODEL S9 — lifecycle completeness', () => {
  it('011: changes_requested state + request RPC + submit accepts it', () => {
    expect(S9!.sql).toMatch(/'changes_requested'/);
    expect(latestBody('strata_request_okr_changes')).toContain('OWNER_SOD_CONFLICT');
    expect(latestBody('strata_submit_okr')).toMatch(/'draft','rejected','changes_requested'/);
  });
  it('009: approve_okr approves KR versions atomically', () => {
    expect(latestBody('strata_approve_okr')).toMatch(/UPDATE public\.strata_kr_versions[\s\S]*status='approved'/);
  });
  it('012: version impact preview', () => {
    expect(latestBody('strata_okr_version_impact_preview')).toContain('next_version');
  });
  it('023: assigned-approver enforcement on approve_kpi', () => {
    const b = latestBody('strata_approve_kpi');
    expect(b).toContain('APPROVER_REQUIRED');
    expect(b).toContain('APPROVER_MISMATCH');
  });
  it('041/042/044: downstream read functions present', () => {
    expect(latestBody('strata_element_okr_readiness')).toContain('reportable');
    expect(latestBody('strata_element_health_from_kr')).toContain('outcome_health');
    expect(latestBody('strata_project_kpi_trace')).toContain('project_kpi_assignments');
  });
});

describe('KPI-OPMODEL S10 — snapshot / notify / review', () => {
  it('050: immutable governance snapshot table + trigger', () => {
    expect(S10!.sql).toMatch(/CREATE TABLE IF NOT EXISTS public\.strata_governance_snapshots/);
    expect(latestBody('strata_guard_govsnap_immutable')).toContain('IMMUTABLE');
  });
  it('052: notification rules + stale + retirement-impact notifiers', () => {
    expect(S10!.sql).toContain("'kpi_assignment_stale'");
    expect(latestBody('strata_notify_stale_measurements')).toContain('strata_notify');
    expect(latestBody('strata_notify_retirement_impact')).toContain('dependency_impact');
  });
  it('046: review_id provenance columns', () => {
    expect(S10!.sql).toMatch(/strata_kpi_contribution_mappings ADD COLUMN IF NOT EXISTS review_id/);
  });
});

describe('KPI-OPMODEL S11 — observation period default (E2E fix)', () => {
  it('observation inherits the assignment period so period-scoped resolution matches', () => {
    expect(latestBody('strata_submit_assignment_observation')).toMatch(/COALESCE\(p_period, a\.start_period_id\)/);
  });
});

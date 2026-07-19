/**
 * CAT-STRATA-GOVFRAMEWORK-20260719-001 — Strategy Framework governance guard.
 *
 * These invariants are enforced in SQL, so the regression test lives at the migration layer
 * (same approach as kodef001 / scdef002). They pin the domain-correction contract so a future
 * migration cannot quietly undo it:
 *   - framework identity/version/member tables + the 100%-total validator exist;
 *   - one-effective + one-open partial unique indexes exist;
 *   - governance is dedicated RPCs with both-sided maker-checker + a status-guard GUC;
 *   - the generic governance whitelist (strata_governed_tables) is NOT mutated (principle #9);
 *   - the backfill selects by status (no hardcoded UUIDs), asserts total 100, and marks v1
 *     legacy_unverified with a NULL approver (never invents provenance).
 */
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const MIGRATIONS = join(__dirname, '../../../../supabase/migrations');
const files = readdirSync(MIGRATIONS).filter((f) => f.endsWith('.sql')).sort();
const byName = (needle: string) => {
  const hit = files.find((f) => f.includes(needle));
  expect(hit, `migration containing "${needle}" not found`).toBeTruthy();
  return readFileSync(join(MIGRATIONS, hit as string), 'utf8');
};
const corpus = files.map((f) => readFileSync(join(MIGRATIONS, f), 'utf8')).join('\n');

describe('Slice 1 — framework foundation', () => {
  const sql = byName('strata_strategy_framework_foundation');
  it('creates the three framework tables', () => {
    expect(sql).toMatch(/CREATE TABLE public\.strata_strategy_frameworks/);
    expect(sql).toMatch(/CREATE TABLE public\.strata_strategy_framework_versions/);
    expect(sql).toMatch(/CREATE TABLE public\.strata_strategy_framework_members/);
  });
  it('enforces one effective + one open version per framework', () => {
    expect(sql).toMatch(/CREATE UNIQUE INDEX strata_sfv_one_effective[\s\S]*status = 'approved' AND effective_to IS NULL/);
    expect(sql).toMatch(/CREATE UNIQUE INDEX strata_sfv_one_open[\s\S]*status IN \('draft','changes_requested','pending_approval'\)/);
  });
  it('members: unique perspective, unique order, weight 0–100', () => {
    expect(sql).toMatch(/strata_sfm_unique_perspective UNIQUE \(framework_version_id, perspective_id\)/);
    expect(sql).toMatch(/strata_sfm_unique_order UNIQUE \(framework_version_id, order_index\)/);
    expect(sql).toMatch(/strata_sfm_weight_range CHECK \(weight >= 0 AND weight <= 100\)/);
  });
  it('has the authoritative validator returning the 100% contract', () => {
    expect(sql).toMatch(/FUNCTION public\.strata_validate_strategy_framework_version\(p_version uuid\)/);
    expect(sql).toContain("'FRAMEWORK_WEIGHTS_UNDER_100'");
    expect(sql).toContain("'FRAMEWORK_WEIGHTS_OVER_100'");
    expect(sql).toMatch(/'valid',\s*\(jsonb_array_length\(v_blockers\) = 0\)/);
  });
  it('deprecates perspective operational columns without dropping them', () => {
    expect(sql).toMatch(/COMMENT ON COLUMN public\.strata_perspectives\.default_weight IS[\s\S]*DEPRECATED/);
    expect(sql).toMatch(/COMMENT ON COLUMN public\.strata_perspectives\.order_index IS[\s\S]*DEPRECATED/);
    expect(sql).not.toMatch(/ALTER TABLE public\.strata_perspectives\s+DROP COLUMN/);
  });
});

describe('Slice 2 — framework governance', () => {
  const sql = byName('strata_strategy_framework_governance');
  it('provides every dedicated lifecycle RPC', () => {
    for (const fn of [
      'strata_create_strategy_framework', 'strata_create_framework_draft_version',
      'strata_update_framework_draft', 'strata_replace_framework_members',
      'strata_submit_framework_version', 'strata_withdraw_framework_version',
      'strata_assign_framework_approver', 'strata_request_framework_changes',
      'strata_approve_framework_version', 'strata_reject_framework_version',
      'strata_retire_strategy_framework_version', 'strata_framework_dependency_impact',
    ]) {
      expect(sql, `missing RPC ${fn}`).toContain(`FUNCTION public.${fn}(`);
    }
  });
  it('guards status transitions with a lifecycle GUC', () => {
    expect(sql).toMatch(/FUNCTION public\.strata_guard_framework_version_status/);
    expect(sql).toContain("current_setting('strata.framework_lifecycle', true)");
  });
  it('enforces both-sided maker-checker in approve', () => {
    expect(sql).toMatch(/assigned_approver_id <> auth\.uid\(\)/);
    expect(sql).toMatch(/submitted_by IS NOT DISTINCT FROM auth\.uid\(\)[\s\S]*cannot approve/);
    expect(sql).toMatch(/created_by IS NOT DISTINCT FROM auth\.uid\(\)[\s\S]*cannot approve their own record/);
  });
  it('does NOT mutate the generic governance whitelist (principle #9)', () => {
    expect(sql).not.toMatch(/CREATE OR REPLACE FUNCTION public\.strata_governed_tables/);
    expect(sql).not.toMatch(/strata_strategy_framework_versions'[\s\S]*strata_governed_tables/);
  });
});

describe('Slice 3 — perspective revision + model provenance', () => {
  const sql = byName('perspective_revision_and_model_provenance');
  it('adds a governed perspective revision RPC', () => {
    expect(sql).toContain('FUNCTION public.strata_create_perspective_draft_version(');
  });
  it('adds nullable framework provenance columns to scorecard models', () => {
    expect(sql).toMatch(/ALTER TABLE public\.strata_scorecard_models\s+ADD COLUMN IF NOT EXISTS framework_version_id uuid/);
    expect(sql).toMatch(/ADD COLUMN IF NOT EXISTS weight_source text/);
    expect(sql).toMatch(/weight_source IN \('framework_default','model_override'\)/);
  });
  it('preserves create_model_draft_version behaviour while copying provenance', () => {
    expect(sql).toContain('FUNCTION public.strata_create_model_draft_version(');
    expect(sql).toMatch(/new versions are created from the approved version/); // original guard retained
    expect(sql).toMatch(/perspective_id, weight, order_index, weight_source/); // provenance copied
  });
});

describe('Slice 4 — deterministic backfill', () => {
  const sql = byName('backfill_corporate_framework_v1');
  it('selects members by status, never hardcoded UUIDs', () => {
    expect(sql).toMatch(/FROM public\.strata_perspectives WHERE status = 'approved'/);
    expect(sql).not.toMatch(/a5a1a000/); // staging perspective ids must never be baked in
  });
  it('asserts the source totals 100 and refuses silent redistribution', () => {
    expect(sql).toMatch(/abs\(v_total - 100\) > 0\.01/);
    expect(sql).toMatch(/Refusing to redistribute silently/);
  });
  it('marks v1 legacy_unverified with a NULL approver (no invented provenance)', () => {
    expect(sql).toMatch(/'legacy_unverified'/);
    expect(sql).toMatch(/approved_by intentionally NULL|approved_by, approved_at[\s\S]*NULL, now\(\)/);
  });
  it('is idempotent and re-validates before finishing', () => {
    expect(sql).toMatch(/framework_key = 'corporate'/);
    expect(sql).toMatch(/strata_validate_strategy_framework_version\(v_ver\)/);
  });
});

describe('cross-cutting', () => {
  it('framework version tables appear exactly once across all migrations', () => {
    const creates = (corpus.match(/CREATE TABLE public\.strata_strategy_framework_versions\b/g) ?? []).length;
    expect(creates).toBe(1);
  });
});

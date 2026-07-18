/**
 * SC-GOVAPPROVAL — migration guard for the governed scorecard approval workflow
 * (CAT-STRATA-SC-GOVAPPROVAL-20260718-001).
 *
 * Pattern-A guard: reads supabase/migrations/*.sql and asserts the LATEST
 * definition of each workflow RPC still carries the server-side rules the
 * contract requires. A green suite here means the transition matrix, SoD,
 * validation rerun, task invariants and concurrency guards cannot be silently
 * dropped by a later migration without this file noticing.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const DIR = join(__dirname, '..', '..', '..', '..', 'supabase', 'migrations');
const FILES = readdirSync(DIR).filter((f) => f.endsWith('.sql')).sort();
const MIGRATIONS = FILES.map((f) => ({ f, sql: readFileSync(join(DIR, f), 'utf8') }));

/** Body of the LAST definition of a function across all migrations. */
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

const latestMatching = (needle: string): string => {
  const hits = MIGRATIONS.filter(({ sql }) => sql.includes(needle));
  expect(hits.length, `no migration contains: ${needle}`).toBeGreaterThan(0);
  return hits[hits.length - 1].sql;
};

describe('SC-GOVAPPROVAL — schema invariants', () => {
  it('status CHECK includes changes_requested and rejected', () => {
    const sql = latestMatching('strata_scorecard_models_status_check');
    expect(sql).toMatch(/'changes_requested'/);
    expect(sql).toMatch(/'rejected'/);
  });

  it('exactly one open approval task per version is DB-enforced (partial unique index)', () => {
    const sql = latestMatching('strata_sc_approval_one_open');
    expect(sql).toMatch(/UNIQUE INDEX[\s\S]*strata_sc_approval_one_open[\s\S]*\(model_id\)\s*WHERE status = 'open'/);
  });

  it('lifecycle status changes are trigger-guarded against direct UPDATE', () => {
    const body = latestBody('strata_guard_scorecard_model_status');
    expect(body).toMatch(/strata\.scorecard_lifecycle/);
    expect(body).toMatch(/RAISE EXCEPTION/);
  });

  it('child-table RLS grants writes in draft AND changes_requested only', () => {
    const p = latestMatching('strata_scorecard_model_perspectives_write');
    expect(p).toMatch(/strata_scorecard_model_perspectives_write[\s\S]*IN \('draft','changes_requested'\)/);
    const m = latestMatching('strata_model_measures_write');
    expect(m).toMatch(/strata_model_measures_write[\s\S]*IN \('draft','changes_requested'\)/);
  });
});

describe('SC-GOVAPPROVAL — submit/resubmit', () => {
  const body = () => latestBody('strata_submit_scorecard_model');

  it('locks the row, restricts source states, and enforces author-or-admin', () => {
    expect(body()).toMatch(/FOR UPDATE/);
    expect(body()).toMatch(/NOT IN \('draft','changes_requested'\)/);
    expect(body()).toMatch(/only the version author \(or an admin\) may submit/);
  });

  it('reruns the ONE shared validator and refuses on blockers', () => {
    expect(body()).toMatch(/strata_validate_scorecard_model\(p_model\)/);
    expect(body()).toMatch(/submission blocked/);
  });

  it('revalidates approver eligibility server-side (chooser is never trusted)', () => {
    expect(body()).toMatch(/strata_assert_scorecard_approver_eligible/);
  });

  it('creates the open task, increments the attempt, and keeps the SAME version (no version bump)', () => {
    expect(body()).toMatch(/INSERT INTO public\.strata_scorecard_approval_tasks/);
    expect(body()).toMatch(/submission_attempt \+ 1/);
    expect(body()).not.toMatch(/version\s*=\s*.*\+\s*1/);
  });

  it('honours the optimistic concurrency token', () => {
    expect(body()).toMatch(/p_expected_updated_at IS NOT NULL AND m\.updated_at <> p_expected_updated_at/);
  });

  it('audits with actor identity and notifies the assignee', () => {
    expect(body()).toMatch(/strata_audit_events[\s\S]*auth\.uid\(\)/);
    expect(body()).toMatch(/strata_notify\([\s\S]*scorecard_submitted/);
  });
});

describe('SC-GOVAPPROVAL — approve', () => {
  const body = () => latestBody('strata_approve_scorecard_model');

  it('only the CURRENT assigned approver may decide — admin alone is not authority', () => {
    expect(body()).toMatch(/assigned_approver_id <> auth\.uid\(\)/);
    expect(body()).toMatch(/only the assigned approver may decide/);
    expect(body()).not.toMatch(/strata_is_admin\(\)\s*THEN\s*RETURN/);
  });

  it('maker-checker both ways, re-checked at decision time', () => {
    expect(body()).toMatch(/submitted_by IS NOT DISTINCT FROM auth\.uid\(\)/);
    expect(body()).toMatch(/created_by IS NOT DISTINCT FROM auth\.uid\(\)/);
  });

  it('reruns validation at approval (dependency broken after submission cannot activate)', () => {
    expect(body()).toMatch(/strata_validate_scorecard_model\(p_model\)/);
    expect(body()).toMatch(/approval blocked/);
  });

  it('completes the single open task as the serialization point (no double decision)', () => {
    expect(body()).toMatch(/status = 'completed', outcome = 'approved'[\s\S]*WHERE model_id = p_model AND status = 'open'/);
    expect(body()).toMatch(/decision conflict/);
  });

  it('activation cutover and supersede are in the SAME function (atomic transaction)', () => {
    expect(body()).toMatch(/status = 'approved'/);
    expect(body()).toMatch(/status = 'superseded'/);
    expect(body()).toMatch(/WHERE id = m\.supersedes_id/);
  });

  it('guards the state transition in the UPDATE predicate and honours the concurrency token', () => {
    expect(body()).toMatch(/WHERE id = p_model AND status = 'pending_approval'/);
    expect(body()).toMatch(/p_expected_updated_at IS NOT NULL AND m\.updated_at <> p_expected_updated_at/);
  });
});

describe('SC-GOVAPPROVAL — request changes / reject / withdraw', () => {
  it('request changes: assigned approver only, non-empty comment, SAME version, notify submitter', () => {
    const body = latestBody('strata_request_scorecard_changes');
    expect(body).toMatch(/a comment is required/);
    expect(body).toMatch(/assigned_approver_id <> auth\.uid\(\)/);
    expect(body).toMatch(/status = 'changes_requested'/);
    expect(body).not.toMatch(/version\s*=\s*.*\+\s*1/);
    expect(body).toMatch(/strata_notify\([\s\S]*scorecard_changes_requested/);
  });

  it('reject: assigned approver only, non-empty reason, terminal state, notify submitter', () => {
    const body = latestBody('strata_reject_scorecard_model');
    expect(body).toMatch(/a reason is required/);
    expect(body).toMatch(/assigned_approver_id <> auth\.uid\(\)/);
    expect(body).toMatch(/status = 'rejected'/);
    expect(body).toMatch(/strata_notify\([\s\S]*scorecard_rejected/);
  });

  it('withdraw: submitter-or-admin, cancels the open task, returns the SAME version to draft', () => {
    const body = latestBody('strata_withdraw_scorecard_model');
    expect(body).toMatch(/only the submitter \(or an admin\) may withdraw/);
    expect(body).toMatch(/status = 'cancelled'/);
    expect(body).toMatch(/status = 'draft'/);
    expect(body).not.toMatch(/version\s*=\s*.*\+\s*1/);
  });
});

describe('SC-GOVAPPROVAL — bypass paths are closed', () => {
  it('generic submit_record refuses scorecard models (no orphan pending without assignee)', () => {
    const body = latestBody('strata_submit_record');
    expect(body).toMatch(/p_table = 'strata_scorecard_models'[\s\S]*RAISE EXCEPTION/);
  });

  it('generic approve_record refuses scorecard models', () => {
    const body = latestBody('strata_approve_record');
    expect(body).toMatch(/p_table = 'strata_scorecard_models'[\s\S]*RAISE EXCEPTION/);
  });

  it('set_model_measures writes only in draft/changes_requested (immutable otherwise)', () => {
    const body = latestBody('strata_set_model_measures');
    expect(body).toMatch(/NOT IN \('draft','changes_requested'\)/);
    expect(body).toMatch(/immutable/);
  });

  it('draft versions clone only from the APPROVED version; open set includes changes_requested; version numbers stay monotonic', () => {
    const body = latestBody('strata_create_model_draft_version');
    expect(body).toMatch(/new versions are created from the approved version/);
    expect(body).toMatch(/IN \('draft','pending_approval','changes_requested'\)/);
    expect(body).toMatch(/GREATEST\(/);
  });
});

describe('SC-GOVAPPROVAL — validator and notifications', () => {
  it('validator reports the FOUR distinct measure-coverage states as BLOCKERS/passed', () => {
    const body = latestBody('strata_validate_scorecard_model');
    // 1. zero measures — distinct from an underweight total.
    expect(body).toMatch(/has no measures assigned/);
    // 2. underweight (< 100): remaining amount named.
    expect(body).toMatch(/measure weights total %s — assign the remaining %s/);
    // 3. overweight (> 100): excess amount named.
    expect(body).toMatch(/measure weights total %s — remove %s/);
    // 4. valid (= 100 ± tolerance): a passed entry, tolerance mirrors the client (0.01).
    expect(body).toMatch(/measure weights total 100/);
    expect(body).toMatch(/100 - 0\.01/);
    expect(body).toMatch(/100 \+ 0\.01/);
    expect(body).toMatch(/'blockers'/);
    expect(body).toMatch(/'warnings'/);
    expect(body).toMatch(/'passed'/);
  });

  it('saving stays ungated on totals — set_model_measures has NO 100-total check', () => {
    // Incomplete drafts must be saveable; only submit/approve consume the
    // validator's blockers (the contract's "block submission, not save"). The
    // validator may be CALLED for the returned payload, but never to refuse.
    const body = latestBody('strata_set_model_measures');
    expect(body).not.toMatch(/total 100/);
    expect(body).not.toMatch(/must total/);
    expect(body).not.toMatch(/approval blocked|submission blocked/);
  });

  it('measure saves are optimistic-concurrency-safe: required token, row lock, stale refusal, token bump', () => {
    const body = latestBody('strata_set_model_measures');
    // The model row's updated_at is the token; the row is locked for the check.
    expect(body).toMatch(/p_expected_updated_at timestamptz/);
    expect(body).toMatch(/FOR UPDATE/);
    // Missing and stale tokens are refused BEFORE any mutation.
    expect(body).toMatch(/p_expected_updated_at IS NULL[\s\S]*RAISE EXCEPTION/);
    expect(body).toMatch(/IS DISTINCT FROM p_expected_updated_at[\s\S]*RAISE EXCEPTION/);
    // Success bumps the token atomically and returns the STORED value (RETURNING
    // survives touch triggers) with persisted validation.
    expect(body).toMatch(/SET updated_at = clock_timestamp\(\)/);
    expect(body).toMatch(/RETURNING updated_at INTO v_new/);
    expect(body).toMatch(/'updated_at', v_new/);
    expect(body).toMatch(/'validation', public\.strata_validate_scorecard_model/);
    // The token-less 2-arg overload is dropped (no unprotected path remains).
    const migration = latestMatching('p_expected_updated_at timestamptz');
    expect(migration).toMatch(/DROP FUNCTION IF EXISTS public\.strata_set_model_measures\(uuid, jsonb\);/);
  });

  it('all six workflow notification rules are seeded', () => {
    const sql = latestMatching("'scorecard_submitted'");
    for (const ev of [
      'scorecard_submitted', 'scorecard_withdrawn', 'scorecard_changes_requested',
      'scorecard_rejected', 'scorecard_approved', 'scorecard_approver_assigned',
    ]) {
      expect(sql).toContain(`'${ev}'`);
    }
  });

  it('the SoD registry projects the new scorecard rule onto strategy_office', () => {
    const body = latestBody('strata_check_role_sod');
    expect(body).toMatch(/the submitter cannot approve their own scorecard submission/);
  });
});

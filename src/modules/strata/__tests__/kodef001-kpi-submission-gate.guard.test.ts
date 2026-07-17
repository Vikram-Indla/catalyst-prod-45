/**
 * KO-DEF-001 server guard — CAT-STRATA-KODEF-20260717-001.
 *
 * Repro: `J KPI Full Pass 20260717-1707` reached Pending Approval with no association, owners,
 * source, formula or target; approval then failed on the accountable owner ALONE, because every
 * prerequisite lived in strata_approve_kpi and each was its own RAISE.
 *
 * The gate is SQL, so the regression test belongs at the migration layer (same approach as
 * linkage.guard.test.ts / srdef002 / scdef002). It pins the invariants that the live staging
 * negative control demonstrated, so a future migration cannot quietly undo them:
 *
 *   (1) blockers n=6: accountable owner | data owner | reporter | validator |
 *                     approved target | strategy element
 *       REFUSED=[submission blocked — 6 prerequisite(s) not met: ...]  status stayed draft
 *   (1b) validator == submitter                 -> CAUGHT
 *   (2) all prerequisites satisfied -> SUBMIT OK, status=pending_approval
 *   (3) strata_perspectives submit -> generic path intact ([record not found])
 *   (4) APPROVED_KPIS_UNCHANGED=t   LOCKED_ROWS 32 -> 32
 */
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const MIGRATIONS = join(__dirname, '../../../../supabase/migrations');
const files = readdirSync(MIGRATIONS).filter((f) => f.endsWith('.sql')).sort();
const corpus = files.map((f) => ({ f, sql: readFileSync(join(MIGRATIONS, f), 'utf8') }));

/** Body of the LAST definition of `fn` in migration order — what the database actually runs. */
function latestBody(fn: string): { file: string; body: string } {
  const re = new RegExp(`CREATE\\s+(OR\\s+REPLACE\\s+)?FUNCTION\\s+public\\.${fn}\\s*\\(`, 'i');
  const defining = corpus.filter(({ sql }) => re.test(sql));
  expect(defining.length, `no migration defines ${fn}`).toBeGreaterThan(0);
  const last = defining[defining.length - 1];
  const starts = [...last.sql.matchAll(new RegExp(re.source, 'gi'))].map((m) => m.index ?? -1);
  const start = starts[starts.length - 1];
  const end = last.sql.indexOf('$function$;', start);
  expect(end, `unterminated body for ${fn} in ${last.f}`).toBeGreaterThan(start);
  return { file: last.f, body: last.sql.slice(start, end) };
}

const FIX = '20260718006000_strata_kpi_submission_prereqs_aligned.sql';

describe('KO-DEF-001 — incomplete KPI cannot reach Pending Approval', () => {
  it('the aligned gate is the latest definition of the blockers function and of approve', () => {
    expect(latestBody('strata_kpi_submission_blockers').file).toBe(FIX);
    expect(latestBody('strata_approve_kpi').file).toBe(FIX);
  });

  it('submit refuses a KPI with outstanding prerequisites, before the status UPDATE', () => {
    const { body } = latestBody('strata_submit_record');
    // The gate must run BEFORE the row is moved to pending_approval, or the refusal would
    // leave a submitted record behind (the defect). Same transaction = atomic.
    const gateAt = body.search(/strata_kpi_submission_blockers/);
    const updateAt = body.search(/UPDATE public\.%I SET status = ''pending_approval''/);
    expect(gateAt, 'submit does not consult the blockers function').toBeGreaterThan(-1);
    expect(updateAt).toBeGreaterThan(-1);
    expect(gateAt, 'blocker gate must precede the status UPDATE').toBeLessThan(updateAt);
    expect(body).toMatch(/RAISE EXCEPTION 'submission blocked/);
  });

  it('returns the COMPLETE blocker list, not the first failure', () => {
    const { body } = latestBody('strata_kpi_submission_blockers');
    // Each PREREQUISITE appends to an array; only the caller raises. A per-check RAISE here
    // would reproduce the "failed only on accountable owner" symptom.
    // (`IF k.id IS NULL THEN RAISE 'KPI not found'` is exempt on purpose: a nonexistent KPI is
    // an error, not an unmet prerequisite.)
    expect(body).not.toMatch(
      /IF k\.(accountable_owner_id|data_owner_id|reporter_id|validator_id|escalation_owner_id|data_source_id) IS NULL THEN RAISE EXCEPTION/,
    );
    expect((body.match(/array_append\(v,/g) ?? []).length).toBeGreaterThanOrEqual(9);
    expect(latestBody('strata_submit_record').body).toContain('array_to_string(v_blockers');
  });

  it('covers every governed prerequisite in the established policy', () => {
    const { body } = latestBody('strata_kpi_submission_blockers');
    const required: Array<[string, RegExp]> = [
      ['accountable owner', /accountable_owner_id IS NULL/],
      ['data owner', /data_owner_id IS NULL/],
      ['reporter', /reporter_id IS NULL/],
      ['validator', /validator_id IS NULL/],
      ['validator <> accountable owner', /validator_id = k\.accountable_owner_id/],
      ['validator <> submitter', /validator_id = p_submitter/],
      ['escalation owner when the governed definition requires it', /mandatory_metadata \? 'escalation_owner'/],
      ['governed source when upload-fed', /entry_method = 'upload' AND k\.data_source_id IS NULL/],
      ['approved formula when not manual', /strata_kpi_formula_versions[\s\S]{0,120}status = 'approved'/],
      ['approved target', /strata_kpi_targets[\s\S]{0,120}status = 'approved'/],
      ['governed strategy association when strategic', /is_strategic AND NOT EXISTS[\s\S]{0,80}strata_element_kpis/],
    ];
    for (const [label, re] of required) {
      expect(body, `prerequisite not enforced: ${label}`).toMatch(re);
    }
  });

  it('rejects validator equal to the submitter', () => {
    const { body } = latestBody('strata_kpi_submission_blockers');
    expect(body).toMatch(/p_submitter IS NOT NULL AND k\.validator_id IS NOT NULL AND k\.validator_id = p_submitter/);
    expect(body).toContain('submitting for approval');
    // submit passes auth.uid() implicitly via the parameter default.
    expect(body).toMatch(/p_submitter uuid DEFAULT auth\.uid\(\)/);
  });

  it('leaves unrelated governed tables unaffected', () => {
    const { body } = latestBody('strata_submit_record');
    // The gate is entered ONLY for KPIs. A table-agnostic check would break the other eight
    // governed tables, none of which have these columns.
    expect(body).toMatch(/IF p_table = 'strata_kpis' THEN/);
    expect(body).toContain('strata_governed_tables()');
  });

  it('drops the 1-arg overload so the submit call cannot bind past the new gates', () => {
    // Load-bearing: CREATE OR REPLACE with the 2-arg signature leaves the old (uuid) function
    // alive, and strata_submit_record's 1-arg call binds to the exact-arity match — silently
    // bypassing every prerequisite added here.
    const fix = corpus.find((c) => c.f === FIX);
    expect(fix, `${FIX} missing`).toBeTruthy();
    expect(fix!.sql).toMatch(/DROP FUNCTION IF EXISTS public\.strata_kpi_submission_blockers\(uuid\);/);
  });
});

describe('KO-DEF-001 — submit and approve cannot drift', () => {
  it('approve delegates to the same blocker list rather than re-implementing it', () => {
    const { body } = latestBody('strata_approve_kpi');
    expect(body).toContain('strata_kpi_submission_blockers(p_kpi, NULL)');
    // The old per-gate RAISEs are what let a KPI sit in Pending while unapprovable.
    expect(body).not.toMatch(/approval blocked: KPI has no accountable owner/);
    expect(body).toMatch(/RAISE EXCEPTION 'approval blocked/);
    expect(body).toContain('strata_approve_record');
  });
});

describe('KO-DEF-001 — historical safety', () => {
  it('the fix migration never rewrites existing rows', () => {
    const fix = corpus.find((c) => c.f === FIX)!.sql;
    // Approved KPIs, calculations, snapshots and audit history must be untouched: the change
    // only refuses future invalid transitions.
    expect(fix).not.toMatch(/UPDATE\s+public\.strata_kpis/i);
    expect(fix).not.toMatch(/DELETE\s+FROM\s+public\.strata_kpis/i);
    expect(fix).not.toMatch(/UPDATE\s+public\.strata_calculated_values/i);
    expect(fix).not.toMatch(/UPDATE\s+public\.strata_snapshots/i);
    expect(fix).not.toMatch(/DELETE\s+FROM\s+public\.strata_audit_events/i);
  });

  it('the blockers function is read-only', () => {
    const { body } = latestBody('strata_kpi_submission_blockers');
    expect(body).toMatch(/\bSTABLE\b/);
    expect(body).not.toMatch(/\b(INSERT|UPDATE|DELETE)\b\s+(INTO\s+)?public\./i);
  });
});

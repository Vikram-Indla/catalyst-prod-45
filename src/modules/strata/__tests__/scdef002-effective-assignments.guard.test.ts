/**
 * SC-DEF-002 retest guard — CAT-STRATA-SCDEF-20260717-001.
 *
 * `CEO Scorecard · Q2 FY2026` showed `Model measures: —` while eight KPI lines drove the
 * score, because that model has ZERO strata_scorecard_model_measures rows and the instance
 * calculates from strata_scorecard_lines. Sourcing provenance only from model_measures
 * therefore recorded nothing.
 *
 * The invariant lives in the calc RPC, so the regression test belongs at the migration layer
 * (same approach as linkage.guard.test.ts / srdef002). Live proof for this fix:
 * a real recalc at 2026-07-17 12:29:10Z produced schema=3, effective_measure_source=
 * 'instance_lines', 8 assignments, model_measures key ABSENT, score unchanged at 96.541.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const MIGRATIONS = join(__dirname, '../../../../supabase/migrations');
const files = readdirSync(MIGRATIONS).filter((f) => f.endsWith('.sql')).sort();
const corpus = files.map((f) => ({ f, sql: readFileSync(join(MIGRATIONS, f), 'utf8') }));

/** Body of the LAST definition of the calc RPC — what the database actually runs. */
function latestCalcBody(): { file: string; body: string } {
  const re = /CREATE\s+(OR\s+REPLACE\s+)?FUNCTION\s+public\.strata_calc_scorecard_instance\s*\(/i;
  const defining = corpus.filter(({ sql }) => re.test(sql));
  expect(defining.length, 'no migration defines strata_calc_scorecard_instance').toBeGreaterThan(0);
  const last = defining[defining.length - 1];
  const starts = [...last.sql.matchAll(new RegExp(re.source, 'gi'))].map((m) => m.index ?? -1);
  const start = starts[starts.length - 1];
  const end = last.sql.indexOf('$function$;', start);
  expect(end, `unterminated body in ${last.f}`).toBeGreaterThan(start);
  return { file: last.f, body: last.sql.slice(start, end) };
}

describe('SC-DEF-002 — effective measure assignments are recorded', () => {
  it('the retest fix is the latest definition of the calc RPC', () => {
    expect(latestCalcBody().file).toBe('20260718004000_strata_calc_effective_measure_assignments.sql');
  });

  it('records one assignment per contributing line, not only model_measures rows', () => {
    const { body } = latestCalcBody();
    // Built inside the line loop — the only place that knows what actually contributed.
    expect(body).toContain('effective_measure_assignments');
    expect(body).toMatch(/v_assignments\s*:=\s*v_assignments\s*\|\|/);
    expect(body).toContain("'assignment_id', line.id");
  });

  it('carries the full assignment: kpi lineage/version, weight, order, versions', () => {
    const { body } = latestCalcBody();
    for (const field of [
      'kpi_lineage_id', 'kpi_version', 'resolved_kpi_id', 'perspective_id',
      'order_index', 'target_version', 'formula_version', 'threshold_scheme_version',
    ]) {
      expect(body, `assignment must carry ${field}`).toContain(`'${field}'`);
    }
  });

  it('labels the source of every assignment rather than implying it is a model measure', () => {
    const { body } = latestCalcBody();
    expect(body).toContain("'assignment_source'");
    expect(body).toContain("'instance_line'");
    expect(body).toContain("'effective_measure_source'");
  });

  it('never emits an empty model_measures field when measures drove the score', () => {
    // The retest symptom: `Model measures: —`. The key must be OMITTED when the model has no
    // measure rows, not rendered empty beside eight contributing lines.
    const { body } = latestCalcBody();
    expect(body).toMatch(/CASE\s+WHEN\s+v_model_measures\s+IS\s+NULL\s+THEN\s+'\{\}'::jsonb/i);
  });

  it('does not fabricate model-measure-only fields for instance lines', () => {
    // required/aggregation_method have no instance-line equivalent: they must come from a
    // matched model-measure row (v_mm) or stay null — never a default.
    const { body } = latestCalcBody();
    expect(body).toContain("'required', v_mm.required");
    expect(body).toContain("'aggregation_method', v_mm.aggregation_method");
    expect(body).not.toMatch(/'required',\s*(true|false)\b/);
    expect(body).not.toMatch(/'aggregation_method',\s*'weighted_average'/);
  });

  it('is forward-only — no backfill or rewrite of historical provenance', () => {
    const { body } = latestCalcBody();
    expect(body).not.toMatch(/UPDATE\s+public\.strata_calculated_values/i);
    expect(body).not.toMatch(/DELETE\s+FROM\s+public\.strata_calculated_values/i);
    expect(body).not.toMatch(/UPDATE\s+public\.strata_snapshots/i);
    expect(body).not.toMatch(/UPDATE\s+public\.strata_scorecard_models/i);
  });

  it('bumps provenance_schema so legacy rows stay distinguishable', () => {
    expect(latestCalcBody().body).toContain("'provenance_schema', 3");
  });
});

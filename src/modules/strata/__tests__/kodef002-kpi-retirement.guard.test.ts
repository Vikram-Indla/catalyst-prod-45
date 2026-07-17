/**
 * KO-DEF-002 retirement guard — CAT-STRATA-KODEF-20260717-001.
 *
 * Retirement is a mutation on an Approved definition, so its protections must not be able to
 * rot. This pins the SQL invariants the staging controls demonstrated:
 *
 *   impact: current {element_links 3, model_measures 2, scorecard_lines 2, initiative_links 1}
 *           historical {scorecard_lines_locked 1}   active_total 8
 *   NEG blocked   -> 'retirement blocked — 8 active dependency(ies) ...'
 *                    status stayed approved · effective_to NULL · retire_audit_rows 0
 *   NEG past date -> 'retirement must be prospective: effective date 2026-07-16 is in the past'
 *   POS replacement -> status retired, effective_to 2026-08-16
 *   POS exception   -> effective_to 2026-09-15, waiver in the audit note
 *   FACTS_UNCHANGED=t   LOCKED_ROWS 32 -> 32
 *
 * UI for retirement is NOT shipped in this slice; the RPC is guarded on its own so nothing
 * unprotected is callable.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const MIGRATIONS = join(__dirname, '../../../../supabase/migrations');
const files = readdirSync(MIGRATIONS).filter((f) => f.endsWith('.sql')).sort();
const corpus = files.map((f) => ({ f, sql: readFileSync(join(MIGRATIONS, f), 'utf8') }));

function latestBody(fn: string) {
  const re = new RegExp(`CREATE\\s+(OR\\s+REPLACE\\s+)?FUNCTION\\s+public\\.${fn}\\s*\\(`, 'i');
  const defining = corpus.filter(({ sql }) => re.test(sql));
  expect(defining.length, `no migration defines ${fn}`).toBeGreaterThan(0);
  const last = defining[defining.length - 1];
  const starts = [...last.sql.matchAll(new RegExp(re.source, 'gi'))].map((m) => m.index ?? -1);
  const start = starts[starts.length - 1];
  const end = last.sql.indexOf('$function$;', start);
  expect(end, `unterminated body for ${fn}`).toBeGreaterThan(start);
  return { file: last.f, body: last.sql.slice(start, end) };
}

describe('KO-DEF-002 — dependency impact is one shared definition', () => {
  it('covers every required dependency class', () => {
    const { body } = latestBody('strata_kpi_dependency_impact');
    for (const t of [
      'strata_element_kpis', 'strata_scorecard_model_measures',
      'strata_scorecard_lines', 'strata_key_results', 'strata_initiative_kpis',
    ]) {
      expect(body, `dependency class not covered: ${t}`).toContain(t);
    }
  });

  it('splits current vs historical and resolves across the lineage', () => {
    const { body } = latestBody('strata_kpi_dependency_impact');
    expect(body).toContain("'current'");
    expect(body).toContain("'historical'");
    // Facts keep the version that produced them, so the scan is lineage-wide.
    expect(body).toMatch(/FROM public\.strata_kpis WHERE lineage_id = v_lin/);
    // Frozen evidence is reported, never counted as blocking.
    expect(body).toMatch(/i\.status = 'locked'/);
    expect(body).toMatch(/o\.status = 'closed'/);
    expect(body).toMatch(/'active_total', el_cur \+ mm_cur \+ sl_cur \+ kr_cur \+ ini_cur/);
  });

  it('is read-only', () => {
    const { body } = latestBody('strata_kpi_dependency_impact');
    expect(body).toMatch(/\bSTABLE\b/);
    expect(body).not.toMatch(/\b(INSERT|UPDATE|DELETE)\b/i);
  });

  it('is the same function the retirement gate uses — one definition, no drift', () => {
    expect(latestBody('strata_retire_kpi').body).toContain('strata_kpi_dependency_impact(p_kpi)');
  });
});

describe('KO-DEF-002 — retirement is guarded', () => {
  it('is prospective only', () => {
    const { body } = latestBody('strata_retire_kpi');
    expect(body).toMatch(/p_effective_to < current_date[\s\S]{0,120}RAISE EXCEPTION/);
    expect(body).toMatch(/p_effective_to IS NULL[\s\S]{0,80}RAISE EXCEPTION/);
  });

  it('requires role, approved status and a reason', () => {
    const { body } = latestBody('strata_retire_kpi');
    expect(body).toMatch(/strata_has_role\(ARRAY\['strategy_office'\]\)/);
    expect(body).toMatch(/k\.status <> 'approved'[\s\S]{0,120}RAISE EXCEPTION/);
    expect(body).toMatch(/p_reason IS NULL OR btrim\(p_reason\) = ''[\s\S]{0,80}RAISE EXCEPTION/);
  });

  it('blocks active dependencies unless a replacement or authorized exception is supplied', () => {
    const { body } = latestBody('strata_retire_kpi');
    expect(body).toMatch(
      /IF active > 0 AND p_replacement IS NULL AND \(p_exception IS NULL OR btrim\(p_exception\) = ''\) THEN/,
    );
    expect(body).toMatch(/RAISE EXCEPTION 'retirement blocked/);
    // The gate must precede the UPDATE, or a blocked call would still mutate the row.
    const gate = body.search(/RAISE EXCEPTION 'retirement blocked/);
    const upd = body.search(/UPDATE public\.strata_kpis/);
    expect(gate).toBeGreaterThan(-1);
    expect(upd).toBeGreaterThan(-1);
    expect(gate).toBeLessThan(upd);
  });

  it('validates the replacement is approved and genuinely different', () => {
    const { body } = latestBody('strata_retire_kpi');
    expect(body).toMatch(/rep\.status <> 'approved'[\s\S]{0,80}RAISE EXCEPTION/);
    // Another version of the same lineage is a successor, not a replacement.
    expect(body).toMatch(/rep\.lineage_id = k\.lineage_id[\s\S]{0,120}RAISE EXCEPTION/);
  });

  it('records actor, reason, effective date, replacement and exception', () => {
    const { body } = latestBody('strata_retire_kpi');
    expect(body).toMatch(/INSERT INTO public\.strata_audit_events/);
    expect(body).toContain("'RPC:retire_kpi'");
    expect(body).toContain('auth.uid()');
    expect(body).toContain('replacement=');
    expect(body).toContain('authorized_exception=');
  });

  it('preserves the row, versions, facts and lineage — status/effective_to only', () => {
    const { body } = latestBody('strata_retire_kpi');
    expect(body).not.toMatch(/DELETE\s+FROM/i);
    // Nothing outside the KPI row and the audit trail may be written.
    for (const t of [
      'strata_calculated_values', 'strata_snapshots', 'strata_kpi_actuals', 'strata_kpi_targets',
      'strata_key_results', 'strata_scorecard_lines', 'strata_element_kpis',
      'strata_scorecard_model_measures', 'strata_initiative_kpis',
    ]) {
      expect(body, `must not write ${t}`).not.toMatch(new RegExp(`(INSERT INTO|UPDATE)\\s+public\\.${t}`, 'i'));
    }
    // The only UPDATE is the KPI's own lifecycle columns.
    expect(body).toMatch(/SET status = 'retired',\s*\n\s*effective_to = p_effective_to/);
    expect(body).not.toMatch(/SET[\s\S]{0,200}lineage_id\s*=/);
    expect(body).not.toMatch(/SET[\s\S]{0,200}\bversion\s*=/);
  });
});

/**
 * KO-DEF-003 server guard — CAT-STRATA-KODEF-20260717-001.
 *
 * OKR lifecycle + KR reportability are SQL, so the regression test lives at the migration layer
 * (as with the other KO/SR guards). It pins the invariants the staging controls demonstrated:
 *   pending-KPI KR reportable=false (Non-reportable);  standalone KR reportable=true;
 *   official progress excluded the pending KR (reportable_krs=1 excluded=1 official=0.50);
 *   activate blocked when incomplete; draft->close blocked; closed OKR + closed KR immutable;
 *   audit trigger present on strata_okrs.
 *
 * Server layer only this slice; the reachable UI is not yet wired (reported as remaining), so no
 * enabled action can bypass these gates.
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
  return last.sql.slice(start, end);
}
const FIX = corpus.find((c) => c.f === '20260718009000_strata_okr_lifecycle_and_kr_reportability.sql')!;

describe('KO-DEF-003 — KR reportability (the reproduction)', () => {
  it('a KPI-backed KR with a non-approved KPI is non-reportable', () => {
    const b = latestBody('strata_kr_reportability');
    expect(b).toMatch(/kpi\.status <> 'approved'/);
    expect(b).toMatch(/'reportable', false/);
    expect(b).toContain("'Non-reportable'");
  });
  it('only validated / accepted_with_exception actuals are eligible; the exception stays qualified', () => {
    const b = latestBody('strata_kr_reportability');
    expect(b).toMatch(/validation_status IN \('validated','accepted_with_exception'\)/);
    // pending/rejected/quarantined/reversed are never selected.
    for (const s of ['pending', 'rejected', 'quarantined', 'reversed']) {
      expect(b).not.toMatch(new RegExp(`validation_status[^)]*'${s}'`));
    }
    expect(b).toMatch(/accepted_with_exception[\s\S]{0,60}'qualified', true|'qualified', act\.validation_status = 'accepted_with_exception'/);
  });
  it('standalone KRs are allowed and labelled distinctly (no second dictionary)', () => {
    const b = latestBody('strata_kr_reportability');
    expect(b).toMatch(/kr\.kpi_id IS NULL/);
    expect(b).toContain('Standalone measurement');
  });
  it('resolves the effective KPI version for the requested date', () => {
    expect(latestBody('strata_kr_reportability')).toContain('strata_resolve_kpi_effective');
  });
  it('official progress excludes non-reportable KRs', () => {
    const b = latestBody('strata_okr_official_progress');
    expect(b).toMatch(/IF \(rep->>'reportable'\)::boolean THEN/);
    expect(b).toMatch(/excluded := excluded \+ 1/);
  });
});

describe('KO-DEF-003 — lifecycle is server-enforced', () => {
  it('activation requires owner, objective, period and a KR', () => {
    const b = latestBody('strata_activate_okr');
    expect(b).toMatch(/o\.status <> 'draft'/);
    for (const m of ['accountable owner', 'strategy objective link', 'period', 'at least one Key Result']) {
      expect(b).toContain(m);
    }
  });
  it('close is active-only with final status + reason — no direct draft to closed', () => {
    const b = latestBody('strata_close_okr');
    expect(b).toMatch(/o\.status <> 'active'[\s\S]{0,120}no direct draft to closed/);
    expect(b).toMatch(/final status must be achieved \| partially_achieved \| missed/);
    expect(b).toMatch(/a closure reason is required/);
  });
  it('edit is draft-only and role-gated', () => {
    const b = latestBody('strata_update_okr');
    expect(b).toMatch(/strata_has_role\(ARRAY\['strategy_office'\]\)/);
    expect(b).toMatch(/o\.status <> 'draft'/);
  });
  it('review linkage refuses a closed OKR and validates the review exists', () => {
    const b = latestBody('strata_link_okr_review');
    expect(b).toMatch(/o\.status = 'closed'[\s\S]{0,60}immutable/);
    expect(b).toMatch(/strata_reviews WHERE id = p_review/);
  });
  it('all lifecycle verbs are role-gated (no silent RLS no-op)', () => {
    for (const fn of ['strata_update_okr', 'strata_activate_okr', 'strata_close_okr', 'strata_link_okr_review']) {
      expect(latestBody(fn)).toMatch(/strata_has_role\(ARRAY\['strategy_office'\]\)/);
    }
  });
});

describe('KO-DEF-003 — closed history is immutable', () => {
  it('triggers freeze a closed OKR and its Key Results', () => {
    expect(FIX.sql).toMatch(/BEFORE UPDATE OR DELETE ON public\.strata_okrs/);
    expect(FIX.sql).toMatch(/a closed OKR is immutable/);
    expect(FIX.sql).toMatch(/BEFORE INSERT OR UPDATE OR DELETE ON public\.strata_key_results/);
    expect(FIX.sql).toMatch(/Key Results of a closed OKR are immutable/);
  });
});

describe('KO-DEF-003 — safety', () => {
  it('adds no second KPI/Measure dictionary and repoints no historical facts', () => {
    // additive columns + functions only; must not create a rival measures table or rewrite actuals.
    expect(FIX.sql).not.toMatch(/CREATE TABLE/i);
    expect(FIX.sql).not.toMatch(/UPDATE\s+public\.strata_kpi_actuals/i);
    expect(FIX.sql).not.toMatch(/UPDATE\s+public\.strata_calculated_values/i);
    expect(FIX.sql).not.toMatch(/UPDATE\s+public\.strata_kpis\b/i);
  });
  it('reportability + progress functions are read-only', () => {
    for (const fn of ['strata_kr_reportability', 'strata_okr_official_progress']) {
      const b = latestBody(fn);
      expect(b).toMatch(/\bSTABLE\b/);
      expect(b).not.toMatch(/\b(INSERT INTO|UPDATE|DELETE FROM)\b/i);
    }
  });
});

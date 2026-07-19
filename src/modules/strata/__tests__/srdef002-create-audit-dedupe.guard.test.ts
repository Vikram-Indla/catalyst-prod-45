/**
 * SR-DEF-002 guard — CAT-STRATA-SRDEF-20260717-001.
 *
 * Creating a Strategy Room element wrote TWO identical "Created" audit rows: the
 * generic strata_audit() AFTER INSERT trigger wrote action='INSERT', and the create
 * RPC ALSO hand-wrote action='RPC:create_strategy_element'. Both share a timestamp
 * (one transaction) and format.ts maps both to the label "Created".
 *
 * The uniqueness rule lives in the DB, so the regression test belongs at the migration
 * layer (same approach as linkage.guard.test.ts — live negative tests run at staging
 * apply time; the staged proof for this fix returned audit_rows=1 actions=[INSERT]).
 *
 * This guard asserts the invariant against each RPC's LATEST definition, so it fails if
 * a future migration re-introduces the manual write, and it cannot be fooled by the
 * historical migrations that legitimately still contain the old body.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const MIGRATIONS = join(__dirname, '../../../../supabase/migrations');
const files = readdirSync(MIGRATIONS).filter((f) => f.endsWith('.sql')).sort();
const corpus = files.map((f) => ({ f, sql: readFileSync(join(MIGRATIONS, f), 'utf8') }));

/** The four governed entity-create RPCs that shared the double-write pattern. */
const CREATE_RPCS = [
  'strata_create_strategy_element',
  'strata_create_kpi',
  'strata_create_okr',
  'strata_create_benefit',
] as const;

/**
 * Body of the LAST definition of `fn` in migration order — i.e. what the database
 * actually runs today. Migrations are timestamp-prefixed, so filename sort == apply order.
 */
function latestBody(fn: string): { file: string; body: string } {
  // Match only a DEFINITION (CREATE [OR REPLACE] FUNCTION) — never `COMMENT ON FUNCTION`,
  // which also mentions the name and would otherwise win a naive lastIndexOf.
  const createRe = new RegExp(`CREATE\\s+(OR\\s+REPLACE\\s+)?FUNCTION\\s+public\\.${fn}\\s*\\(`, 'gi');
  const defining = corpus.filter(({ sql }) => new RegExp(createRe.source, 'i').test(sql));
  expect(defining.length, `no migration defines ${fn}`).toBeGreaterThan(0);
  const last = defining[defining.length - 1];

  const starts = [...last.sql.matchAll(new RegExp(createRe.source, 'gi'))].map((m) => m.index ?? -1);
  const start = starts[starts.length - 1];
  expect(start, `could not locate ${fn} definition in ${last.f}`).toBeGreaterThan(-1);
  const end = last.sql.indexOf('$$;', start);
  expect(end, `unterminated body for ${fn} in ${last.f}`).toBeGreaterThan(start);
  return { file: last.f, body: last.sql.slice(start, end) };
}

describe('SR-DEF-002 — exactly one create audit event per element', () => {
  it.each(CREATE_RPCS)('%s does not hand-write strata_audit_events', (fn) => {
    const { file, body } = latestBody(fn);
    expect(
      body,
      `${fn} (latest definition in ${file}) still INSERTs into strata_audit_events — the generic ` +
      'strata_audit() trigger already records the creation, so this duplicates it (SR-DEF-002).',
    ).not.toMatch(/INSERT\s+INTO\s+public\.strata_audit_events/i);
  });

  it('each create RPC is last defined by a known, reviewed migration (no accidental reintroduction)', () => {
    // The SR-DEF-002 fix migration is the canonical home of these RPCs. A later migration may
    // legitimately re-define one for a governed reason — but it must be an EXPECTED file here,
    // and test #1 above independently re-checks the no-manual-audit-INSERT invariant on it.
    // strata_create_strategy_element moved to the measurement-method enforcement migration
    // (CAT-STRATA-THEMEMETHOD-20260720-001), which adds the method gate and keeps NO manual audit write.
    const EXPECTED: Record<(typeof CREATE_RPCS)[number], string> = {
      strata_create_strategy_element: '20260719223304_strata_theme_method_enforcement.sql',
      strata_create_kpi: '20260718000000_strata_dedupe_create_audit_events.sql',
      strata_create_okr: '20260718000000_strata_dedupe_create_audit_events.sql',
      strata_create_benefit: '20260718000000_strata_dedupe_create_audit_events.sql',
    };
    for (const fn of CREATE_RPCS) {
      expect(latestBody(fn).file).toBe(EXPECTED[fn]);
    }
  });

  it('strata_create_kpi keeps its is_strategic parameter (no STRATA-E2E-010 regression)', () => {
    // The original 5-arg body predates is_strategic. Rebuilding create_kpi from the wrong
    // revision would silently revert that governance gate, so pin it here.
    const { body } = latestBody('strata_create_kpi');
    expect(body).toContain('p_is_strategic boolean DEFAULT false');
    expect(body).toContain('is_strategic');
  });

  it('the generic strata_audit trigger remains attached to all four tables', () => {
    // Removing the manual INSERT is only safe while the trigger is the surviving writer.
    const all = corpus.map((c) => c.sql).join('\n');
    expect(all).toContain('EXECUTE FUNCTION public.strata_audit()');
    for (const table of ['strata_strategy_elements', 'strata_kpis', 'strata_okrs', 'strata_benefits']) {
      expect(all, `${table} must be covered by the generic audit trigger`).toContain(`'${table}'`);
    }
  });

  it('legitimate non-create audit writes are preserved', () => {
    // Acceptance: "subsequent edits and link changes remain separate events." Only the
    // four create RPCs were de-duplicated; update/link/promote verbs keep their rows.
    const all = corpus.map((c) => c.sql).join('\n');
    expect(all).toContain("'RPC:update_kpi'");
    expect(all).toContain("'RPC:link_element_kpi'");
  });
});

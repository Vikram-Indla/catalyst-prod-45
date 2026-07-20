/**
 * KPI-OPMODEL Slice S5 — additive KR<->Assignment bridge guard (D-1).
 * Verifies the bridge is additive (existing OKRs backfilled to legacy),
 * assignment-backed resolution takes precedence over manual, and standalone
 * reportability is governed by policy.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const DIR = join(__dirname, '..', '..', '..', '..', 'supabase', 'migrations');
const FILES = readdirSync(DIR).filter((f) => f.endsWith('.sql')).sort();
const MIGRATIONS = FILES.map((f) => ({ f, sql: readFileSync(join(DIR, f), 'utf8') }));
const S5 = MIGRATIONS.find((m) => m.f === '20260720124000_strata_s5_kr_assignment_bridge.sql');

function latestBody(fn: string): string {
  let body = '';
  for (const { sql } of MIGRATIONS) {
    const re = new RegExp(`CREATE (?:OR REPLACE )?FUNCTION public\\.${fn}\\s*\\(([\\s\\S]*?)\\$(?:function)?\\$;`, 'g');
    let m: RegExpExecArray | null;
    while ((m = re.exec(sql)) !== null) body = m[0];
  }
  expect(body, `no definition found for ${fn}`).not.toBe('');
  return body;
}

describe('KPI-OPMODEL S5 — additive bridge (D-1: no retroactive number movement)', () => {
  it('S5 present; optional KR link + governed standalone policy', () => {
    const sql = S5!.sql;
    expect(sql).toMatch(/ADD COLUMN IF NOT EXISTS strategic_assignment_id uuid REFERENCES public\.strata_kpi_assignments/);
    expect(sql).toMatch(/standalone_kr_policy text NOT NULL DEFAULT 'unofficial'/);
  });
  it('backfills existing OKRs to legacy so their numbers freeze', () => {
    expect(S5!.sql).toMatch(/UPDATE public\.strata_okrs SET standalone_kr_policy = 'legacy'/);
  });
});

describe('KPI-OPMODEL S5 — STRATA-KPI-014/017/018/019', () => {
  it('link requires an approved, KR-eligible assignment + KR-eligible KPI', () => {
    const body = latestBody('strata_link_kr_assignment');
    expect(body).toMatch(/a\.status <> 'approved'/);
    expect(body).toMatch(/NOT a\.kr_eligible/);
    expect(body).toMatch(/NOT kpi\.kr_eligible/);
    expect(body).toContain('strata_kr_assert_editable');
  });
  it('reportability handles assignment-backed / legacy-kpi / standalone-by-policy', () => {
    const body = latestBody('strata_kr_reportability');
    expect(body).toContain('assignment_backed');
    expect(body).toContain('STANDALONE_UNOFFICIAL');
    expect(body).toMatch(/standalone_kr_policy,'legacy'\) = 'unofficial'/);
  });
  it('progress sources ONLY the assignment observation when backed (manual cannot override)', () => {
    const body = latestBody('strata_kr_progress');
    expect(body).toMatch(/k\.strategic_assignment_id IS NOT NULL/);
    expect(body).toContain("'assignment_observation'");
    expect(body).toContain("'assignment_pending'");
    // in the assignment branch, actual must not fall back to current_value
    const idx = body.indexOf('strategic_assignment_id IS NOT NULL');
    const branch = body.slice(idx, body.indexOf('ELSE', idx));
    expect(branch).not.toContain('current_value');
  });
});

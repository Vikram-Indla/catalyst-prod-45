/**
 * KPI-OPMODEL S15 — assignment scope-target validation (staging defect fix).
 * The /strata/kpi-governance create form sent scope_type='strategic' with no element_id,
 * violating strata_kpi_assignment_scope_ck. Fix: RPC validates the scope target explicitly
 * (clear INVALID_SCOPE error) AND the UI collects it — the constraint is UNCHANGED (still the
 * DB backstop). Applied + execution-verified on staging.
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
    const re = new RegExp(`CREATE (?:OR REPLACE )?FUNCTION public\\.${fn}\\s*\\(([\\s\\S]*?)\\$(?:function)?\\$;`, 'g');
    let m: RegExpExecArray | null; while ((m = re.exec(sql)) !== null) body = m[0];
  }
  expect(body, `no def for ${fn}`).not.toBe(''); return body;
}

describe('KPI-OPMODEL S15 — assignment scope-target validation', () => {
  it('RPC rejects a strategic assignment with no element (clear error, before the insert)', () => {
    const body = latestBody('strata_create_kpi_assignment');
    expect(body).toMatch(/p_scope_type = 'strategic' AND p_element IS NULL/);
    expect(body).toContain('INVALID_SCOPE');
    // the validation must precede the INSERT
    expect(body.indexOf('INVALID_SCOPE')).toBeLessThan(body.indexOf('INSERT INTO public.strata_kpi_assignments'));
  });
  it('RPC rejects a project assignment without a card + project objective', () => {
    expect(latestBody('strata_create_kpi_assignment')).toMatch(/p_scope_type = 'project' AND \(p_project_card IS NULL OR p_project_objective IS NULL\)/);
  });
  it('the scope CHECK constraint is UNCHANGED (validation not weakened)', () => {
    const s2 = MIGRATIONS.find((m) => m.f === '20260720122000_strata_s2_kpi_assignments.sql');
    expect(s2!.sql).toMatch(/CONSTRAINT strata_kpi_assignment_scope_ck CHECK/);
    expect(s2!.sql).toMatch(/scope_type = 'strategic' AND element_id IS NOT NULL AND project_card_id IS NULL/);
    // no later migration drops or relaxes the constraint
    for (const m of MIGRATIONS) {
      expect(m.sql, `${m.f} must not drop the scope constraint`).not.toMatch(/DROP CONSTRAINT[\s\S]*strata_kpi_assignment_scope_ck/);
    }
  });
});

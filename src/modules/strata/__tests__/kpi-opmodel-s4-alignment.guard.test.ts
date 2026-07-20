/**
 * KPI-OPMODEL Slice S4 — governed Project Objective Alignment guard.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const DIR = join(__dirname, '..', '..', '..', '..', 'supabase', 'migrations');
const FILES = readdirSync(DIR).filter((f) => f.endsWith('.sql')).sort();
const MIGRATIONS = FILES.map((f) => ({ f, sql: readFileSync(join(DIR, f), 'utf8') }));
const S4 = MIGRATIONS.find((m) => m.f === '20260720125000_strata_s4_project_objective_alignment.sql');

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

describe('KPI-OPMODEL S4 — alignment schema (STRATA-KPI-034/037)', () => {
  it('alignment table with primary/secondary + attribution; one primary per objective', () => {
    const sql = S4!.sql;
    expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS public\.strata_project_objective_alignments/);
    expect(sql).toMatch(/alignment_type text NOT NULL CHECK \(alignment_type IN \('primary','secondary'\)\)/);
    expect(sql).toMatch(/attribution_share numeric/);
    expect(sql).toMatch(/CREATE UNIQUE INDEX IF NOT EXISTS uq_strata_poa_primary/);
  });
  it('does not drop legacy parent_id (additive)', () => {
    expect(S4!.sql).not.toMatch(/DROP COLUMN[\s\S]*parent_id/);
  });
});

describe('KPI-OPMODEL S4 — STRATA-KPI-036 contradiction rejection', () => {
  it('validator rejects a primary alignment contradicting the card primary objective', () => {
    const body = latestBody('strata_alignment_validate');
    expect(body).toContain('CONTRADICTS_CARD_PRIMARY_OBJECTIVE');
    expect(body).toContain('SECONDARY_NEEDS_ATTRIBUTION');
  });
  it('alignment approval enforces maker-checker SoD', () => {
    const body = latestBody('strata_approve_objective_alignment');
    expect(body).toContain('OWNER_SOD_CONFLICT');
  });
});

describe('KPI-OPMODEL S4 — STRATA-KPI-040 completion gate', () => {
  it('completion trigger uses stage and blocks on open mappings / unobserved assignments', () => {
    const body = latestBody('strata_guard_card_completion');
    expect(body).toMatch(/NEW\.stage = 'completed'/);
    expect(body).toContain('COMPLETION_BLOCKED');
    expect(body).toContain('strata_kpi_contribution_mappings');
    expect(body).toContain('strata_kpi_assignment_observations');
  });
});

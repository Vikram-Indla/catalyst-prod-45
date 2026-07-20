/**
 * KPI-OPMODEL Slices S2+S3 — migration guard for the KPI Assignment entity,
 * scoped observations, governed contribution mapping and the authoritative
 * aggregation service (CAT-STRATA-KPI-OPMODEL-20260720-001).
 */
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const DIR = join(__dirname, '..', '..', '..', '..', 'supabase', 'migrations');
const FILES = readdirSync(DIR).filter((f) => f.endsWith('.sql')).sort();
const MIGRATIONS = FILES.map((f) => ({ f, sql: readFileSync(join(DIR, f), 'utf8') }));
const S2 = MIGRATIONS.find((m) => m.f === '20260720122000_strata_s2_kpi_assignments.sql');
const S3 = MIGRATIONS.find((m) => m.f === '20260720123000_strata_s3_contribution_mapping_aggregation.sql');

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

describe('KPI-OPMODEL S2 — first-class KPI Assignment', () => {
  it('migrations present', () => { expect(S2).toBeTruthy(); expect(S3).toBeTruthy(); });

  it('STRATA-KPI-025: assignment table with scope + own target + status envelope', () => {
    const sql = S2!.sql;
    expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS public\.strata_kpi_assignments/);
    expect(sql).toMatch(/scope_type text NOT NULL CHECK \(scope_type IN \('strategic','project'\)\)/);
    expect(sql).toMatch(/target numeric/);
    expect(sql).toMatch(/strata_kpi_assignment_scope_ck/);
  });

  it('STRATA-KPI-026: scoped observations keyed by (assignment, period, as_of)', () => {
    const sql = S2!.sql;
    expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS public\.strata_kpi_assignment_observations/);
    expect(sql).toMatch(/UNIQUE NULLS NOT DISTINCT \(assignment_id, period_id, as_of_date\)/);
  });

  it('STRATA-KPI-024/027: only an approved KPI can be assigned; target is a column not a note', () => {
    const body = latestBody('strata_create_kpi_assignment');
    expect(body).toMatch(/kpi\.status <> 'approved'/);
    expect(body).not.toContain('target_note');
  });

  it('assignment approval enforces maker-checker SoD', () => {
    const body = latestBody('strata_approve_kpi_assignment');
    expect(body).toContain('OWNER_SOD_CONFLICT');
    expect(body).toMatch(/a\.submitted_by = auth\.uid\(\)/);
  });

  it('observation validation enforces submitter<>validator SoD', () => {
    const body = latestBody('strata_validate_assignment_observation');
    expect(body).toContain('OWNER_SOD_CONFLICT');
    expect(body).toMatch(/accepted_with_exception/);
  });
});

describe('KPI-OPMODEL S3 — contribution mapping + aggregation', () => {
  it('STRATA-KPI-028/030: mapping table with the four-value vocabulary', () => {
    const sql = S3!.sql;
    expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS public\.strata_kpi_contribution_mappings/);
    expect(sql).toMatch(/relationship_type text NOT NULL CHECK \(relationship_type IN \('direct_component','driver','supporting_evidence','none'\)\)/);
  });

  it('STRATA-KPI-029: roll-up validator checks approval + unit/direction/aggregation compatibility', () => {
    const body = latestBody('strata_contribution_validate');
    expect(body).toContain('PARENT_NOT_APPROVED');
    expect(body).toContain('INCOMPATIBLE_UNIT');
    expect(body).toContain('INCOMPATIBLE_DIRECTION');
    expect(body).toContain('NO_AGGREGATION_RULE');
  });

  it('STRATA-KPI-030/031: aggregation includes ONLY approved effective direct_component', () => {
    const body = latestBody('strata_calc_assignment_rollup');
    expect(body).toMatch(/relationship_type = 'direct_component'/);
    expect(body).toMatch(/status = 'approved'/);
    expect(body).toMatch(/effective_to IS NULL OR effective_to > now\(\)/);
  });

  it('STRATA-KPI-031: aggregation exposes numerator/denominator/weights/exclusions/overlaps/provenance', () => {
    const body = latestBody('strata_calc_assignment_rollup');
    for (const key of ["'numerator'", "'denominator'", "'included'", "'excluded'", "'overlaps'", "'has_overlap'", "'method'"]) {
      expect(body, `rollup output missing ${key}`).toContain(key);
    }
    // driver / supporting_evidence must never enter arithmetic → they are simply not selected
    expect(body).not.toMatch(/relationship_type = 'driver'/);
  });
});

/**
 * KPI-OPMODEL Slice S1 — migration guard for the governed KPI classification layer
 * (CAT-STRATA-KPI-OPMODEL-20260720-001).
 *
 * Asserts the classification dimensions, diagnostic link marker, deterministic
 * backfill and validator extension are present and additive (existing rows
 * classified, is_strategic complemented not replaced).
 */
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const DIR = join(__dirname, '..', '..', '..', '..', 'supabase', 'migrations');
const FILES = readdirSync(DIR).filter((f) => f.endsWith('.sql')).sort();
const MIGRATIONS = FILES.map((f) => ({ f, sql: readFileSync(join(DIR, f), 'utf8') }));
const S1 = MIGRATIONS.find((m) => m.f === '20260720121000_strata_s1_kpi_classification.sql');

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

describe('KPI-OPMODEL S1 — classification schema', () => {
  it('S1 migration exists', () => expect(S1, 'S1 migration file missing').toBeTruthy());

  it('adds usage_class with the five governed values', () => {
    const sql = S1!.sql;
    expect(sql).toMatch(/ADD COLUMN IF NOT EXISTS usage_class text/);
    for (const uc of ['strategic', 'operational', 'project_outcome', 'project_delivery', 'risk_compliance']) {
      expect(sql).toContain(`'${uc}'`);
    }
  });

  it('adds kr_eligible, aggregation_policy, official_scope, business_category_id', () => {
    const sql = S1!.sql;
    expect(sql).toMatch(/ADD COLUMN IF NOT EXISTS kr_eligible boolean NOT NULL DEFAULT false/);
    expect(sql).toMatch(/ADD COLUMN IF NOT EXISTS aggregation_policy text NOT NULL DEFAULT 'none'/);
    expect(sql).toMatch(/aggregation_policy IN \('none','sum','average','weighted_average'\)/);
    expect(sql).toMatch(/ADD COLUMN IF NOT EXISTS official_scope text/);
    expect(sql).toMatch(/ADD COLUMN IF NOT EXISTS business_category_id uuid REFERENCES public\.strata_kpi_categories/);
  });

  it('is additive per D-1: backfills usage_class from is_strategic, does not drop is_strategic', () => {
    const sql = S1!.sql;
    expect(sql).toMatch(/UPDATE public\.strata_kpis[\s\S]*SET usage_class = CASE WHEN is_strategic/);
    expect(sql).not.toMatch(/DROP COLUMN[\s\S]*is_strategic/);
  });

  it('STRATA-KPI-006: element_kpis links marked diagnostic', () => {
    const sql = S1!.sql;
    expect(sql).toMatch(/ADD COLUMN IF NOT EXISTS link_role text NOT NULL DEFAULT 'diagnostic'/);
    expect(sql).toMatch(/link_role IN \('diagnostic','governed_contract'\)/);
  });
});

describe('KPI-OPMODEL S1 — STRATA-KPI-022 validator extension', () => {
  it('submission blockers require a usage class and a consistent kr_eligible flag', () => {
    const body = latestBody('strata_kpi_submission_blockers');
    expect(body).toContain('usage_class IS NULL');
    expect(body).toMatch(/kr_eligible AND coalesce\(k\.usage_class,''\) NOT IN \('strategic','project_outcome'\)/);
  });
});

describe('KPI-OPMODEL S1 — classify write path', () => {
  it('strata_classify_kpi refuses to reclassify an approved KPI in place', () => {
    const body = latestBody('strata_classify_kpi');
    expect(body).toMatch(/status IN \('approved','retired','superseded'\)/);
    expect(body).toContain('INVALID_TRANSITION');
  });
});

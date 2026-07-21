/**
 * EXECMODEL S17 — Objective-owned readiness/health repair (CAT-STRATA-EXECMODEL-20260721-001, #31).
 * strata_element_okr_readiness / strata_element_health_from_kr previously queried `theme_id = p_element`
 * and could never serve a Strategic Objective. Repaired to traverse the authoritative objective_id
 * (S16): an Objective matches directly; a Theme rolls up its child Objectives. Applied + execution-
 * verified on staging (20260721104529): readiness(objective)=3 OKRs where the old path returned 0.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const DIR = join(__dirname, '..', '..', '..', '..', 'supabase', 'migrations');
const SQL = readFileSync(join(DIR, '20260721104529_strata_s17_objective_readiness_health_repair.sql'), 'utf8');

describe('EXECMODEL S17 — Objective-owned readiness/health', () => {
  it('readiness resolves an Objective directly and rolls a Theme up to its child Objectives', () => {
    expect(SQL).toContain('FUNCTION public.strata_element_okr_readiness');
    expect(SQL).toMatch(/strata_okrs o[\s\S]*WHERE o\.objective_id = p_element/);
    expect(SQL).toMatch(/o\.objective_id IN \(SELECT c\.id FROM public\.strata_strategy_elements c[\s\S]*parent_id = p_element AND c\.element_type='objective'\)/);
  });

  it('health traverses objective_id (active OKRs), not theme_id', () => {
    expect(SQL).toContain('FUNCTION public.strata_element_health_from_kr');
    const health = SQL.slice(SQL.indexOf('strata_element_health_from_kr'));
    expect(health).toMatch(/o\.status='active'[\s\S]*o\.objective_id = p_element/);
  });

  it('the broken theme_id query is gone from the executable SQL (comments may still cite it)', () => {
    const exec = SQL.split('\n').filter((l) => !l.trimStart().startsWith('--')).join('\n');
    expect(exec).not.toMatch(/theme_id = p_element/);
  });
});

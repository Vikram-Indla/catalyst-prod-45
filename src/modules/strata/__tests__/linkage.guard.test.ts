/**
 * Linkage guard — CAT-STRATA-FOUNDATION-20260709-001, REQ-007..010.
 * Statically enforces the locked STRATA linkage rules against the
 * migration corpus (live DB negative tests run at staging apply time):
 *  - rules 12–15: Strategic Themes never link to Portfolios; only
 *    Project Cards (+ legacy initiatives until REQ-019) are members.
 *  - rule 5–6: card -> Strategic Objective edge exists and is
 *    theme-consistency validated.
 *  - rules 8/10: Project Objective -> Strategic Objective and
 *    Project KPI -> Theme KPI edges are DB-enforced.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const MIGRATIONS = join(__dirname, '../../../../supabase/migrations');
const files = readdirSync(MIGRATIONS).filter((f) => f.endsWith('.sql'));
const corpus = files.map((f) => ({ f, sql: readFileSync(join(MIGRATIONS, f), 'utf8') }));
const all = corpus.map((c) => c.sql).join('\n');

describe('STRATA linkage guards (REQ-007..010)', () => {
  it('portfolio membership type CHECK never admits themes (rules 12–15)', () => {
    expect(all).toContain("member_type IN ('initiative','project_card')");
    const offenders = corpus.filter(({ sql }) =>
      /member_type\s+IN\s*\([^)]*'theme'/i.test(sql) ||
      /strata_portfolio_memberships[\s\S]{0,400}'theme'/i.test(sql));
    expect(offenders.map((o) => o.f)).toEqual([]);
  });

  it('no migration ever creates a strata theme<->portfolio bridge table or FK', () => {
    // Scoped to the strata_* namespace — legacy pre-STRATA stacks are
    // handled by REQ-022 decommission, not this guard.
    const bridgeTable = corpus.filter(({ sql }) =>
      /CREATE\s+TABLE\s+(IF\s+NOT\s+EXISTS\s+)?(public\.)?strata_\w*(theme\w*portfolio|portfolio\w*theme)/i.test(sql));
    const bridgeFk = corpus.filter(({ sql }) =>
      /strata_portfolios?\w*[\s\S]{0,200}REFERENCES\s+public\.strata_strategy_elements/i.test(sql));
    expect(bridgeTable.map((b) => b.f)).toEqual([]);
    expect(bridgeFk.map((b) => b.f)).toEqual([]);
  });

  it('card -> Strategic Objective edge is present and validated (rules 5–6)', () => {
    expect(all).toContain('ADD COLUMN IF NOT EXISTS objective_element_id');
    expect(all).toContain('strata_validate_card_objective');
    expect(all).toContain("must belong to the card''s Strategic Theme");
  });

  it('project objective/KPI upward edges are DB-enforced (rules 8/10)', () => {
    expect(all).toContain('strata_create_project_objective');
    expect(all).toContain("element_type = 'objective' AND context = 'theme'");
    expect(all).toContain("'rolls_up_to'");
  });

  it('portfolio member identity is referentially guarded (REQ-010)', () => {
    expect(all).toContain('strata_validate_portfolio_member');
  });
});

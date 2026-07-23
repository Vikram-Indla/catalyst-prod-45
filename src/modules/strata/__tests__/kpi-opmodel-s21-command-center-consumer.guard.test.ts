/**
 * S21 — Executive Reporting consumer wiring (CAT-STRATA-KPI-OPMODEL-20260720-001).
 * Aiden's acceptance found strata_executive_governed_rollup had NO consumer (dormant RPC).
 * This asserts the Command Center now consumes the authoritative set-based read model via a hook
 * (no per-card N+1), renders aggregating vs non-aggregating contributions with card provenance and a
 * drill-through, and exposes loading / empty / restricted / error states. (Browser acceptance = Aiden.)
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const SRC = join(__dirname, '..');
const cc = readFileSync(join(SRC, 'pages', 'StrataCommandCenterPage.tsx'), 'utf8');
const hooks = readFileSync(join(SRC, 'hooks', 'useStrata.tsx'), 'utf8');
const domain = readFileSync(join(SRC, 'domain', 'index.ts'), 'utf8');

describe('S21 — Command Center consumes the governed rollup read model', () => {
  it('a hook wraps the set-based read model (single query, no per-card N+1)', () => {
    expect(hooks).toMatch(/export const useExecutiveGovernedRollup/);
    expect(hooks).toMatch(/governanceApi\.executiveGovernedRollup/);
  });

  it('the domain method calls the authoritative RPC', () => {
    expect(domain).toMatch(/executiveGovernedRollup[\s\S]*rpcAny\('strata_executive_governed_rollup'/);
  });

  it('Command Center imports + calls the hook and renders the rollup panel', () => {
    expect(cc).toMatch(/useExecutiveGovernedRollup/);
    expect(cc).toMatch(/const rollupQ = useExecutiveGovernedRollup\(/);
    expect(cc).toContain('strata-cc-governed-rollup');
  });

  it('shows aggregating vs non-aggregating + KR provenance + drill-through', () => {
    expect(cc).toMatch(/aggregating_contributions/);
    expect(cc).toMatch(/non_aggregating_contributions/);
    expect(cc).toMatch(/linked_key_results/);
    // named-card provenance drill-through (never the generic index) — see the navigation guard
    expect(cc).toMatch(/Routes\.strata\.projectCard\(slug\)/);
  });

  it('exposes restricted, error, loading and empty states', () => {
    const panel = cc.slice(cc.indexOf('strata-cc-governed-rollup'));
    expect(panel).toMatch(/noStrataRole/);            // restricted
    expect(panel).toMatch(/rollupQ\.isError/);        // error
    expect(panel).toMatch(/rollupQ\.isLoading/);      // loading
    expect(panel).toMatch(/length === 0/);            // empty
  });

  it('does not fan out per-card trace calls from the summary (no N+1)', () => {
    // the summary panel must not iterate cards calling projectKpiTrace
    expect(cc).not.toMatch(/\.map\([^)]*projectKpiTrace/);
  });
});

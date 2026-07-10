/**
 * Cycle-context guard — CAT-STRATA-FOUNDATION-20260709-001, REQ-006.
 * Every canonical area landing (Strategy Execution, Balanced Scorecard,
 * VMO, Governance) plus the Command Center must show the active strategy
 * cycle name + period. All of them get this from StrataPageShell, whose
 * governed context toolbar renders the Cycle and Period chips. This test
 * fails the build if a landing drops the shell or the shell drops the
 * toolbar/chips.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const STRATA_ROOT = join(__dirname, '..');

const AREA_LANDINGS = [
  ['Strategy Execution', 'pages/StrataStrategyRoomPage.tsx'],
  ['Balanced Scorecard', 'pages/StrataScorecardsPage.tsx'],
  ['Value Management Office', 'pages/StrataPortfolioVmoPage.tsx'],
  ['Governance', 'pages/StrataReviewsPage.tsx'],
  ['Command Center', 'pages/StrataCommandCenterPage.tsx'],
] as const;

describe('STRATA cycle-context guard (REQ-006)', () => {
  it.each(AREA_LANDINGS)('%s landing renders StrataPageShell', (_area, file) => {
    const src = readFileSync(join(STRATA_ROOT, file), 'utf8');
    expect(src).toContain('<StrataPageShell');
  });

  it('StrataPageShell renders the governed context toolbar with Cycle and Period chips', () => {
    const shared = readFileSync(join(STRATA_ROOT, 'components/shared.tsx'), 'utf8');
    // Shell → toolbar wiring
    expect(shared).toMatch(/StrataPageShell[\s\S]*?<StrataContextToolbar/);
    // Toolbar → both chips, bound to the active cycle/period (zero-assumption dash when absent)
    expect(shared).toContain('data-testid="strata-config-context"');
    expect(shared).toMatch(/label="Cycle"[\s\S]*?activeCycle\?\.name \?\? '—'/);
    expect(shared).toMatch(/label="Period"[\s\S]*?activePeriod\?\.name \?\? '—'/);
  });
});

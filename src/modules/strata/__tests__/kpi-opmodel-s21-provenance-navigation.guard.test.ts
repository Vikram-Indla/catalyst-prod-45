/**
 * S21 navigation — governed rollup provenance drill-through + Project Card tab persistence
 * (CAT-STRATA-KPI-OPMODEL-20260720-001).
 *
 * Aiden's acceptance follow-up: the rollup row must open the NAMED contributing Project Card
 * (carrying governed cycle/period + return-to-origin), never the generic Project Cards index —
 * routing to the index drops which card actually contributed. Refreshing Scope & Measures must
 * also return to Scope & Measures. Aggregation semantics (S21) are untouched by this slice.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const SRC = join(__dirname, '..');
const cc = readFileSync(join(SRC, 'pages', 'StrataCommandCenterPage.tsx'), 'utf8');
const cardView = readFileSync(join(SRC, 'components', 'ProjectCardDetailView.tsx'), 'utf8');
const rollupPanel = cc.slice(cc.indexOf('strata-cc-governed-rollup'));

describe('S21 navigation — rollup provenance drills to the named card', () => {
  it('builds a per-card href from the card slug', () => {
    expect(cc).toMatch(/const rollupCardHref = React\.useCallback\(\(slug: string\)/);
    expect(cc).toMatch(/Routes\.strata\.projectCard\(slug\)/);
    expect(cc).toMatch(/navigate\(rollupCardHref\(c\.slug!\)\)/);
  });

  it('does NOT route the rollup panel to the generic Project Cards index', () => {
    expect(rollupPanel).not.toMatch(/Routes\.strata\.execution\(\)/);
  });

  it('preserves governed cycle, period, return-to-origin, and lands on Scope & Measures', () => {
    expect(cc).toMatch(/p\.set\('cycle', ctxToken\(activeCycle\.name\)\)/);
    expect(cc).toMatch(/p\.set\('period', ctxToken\(activePeriod\.name\)\)/);
    expect(cc).toMatch(/p\.set\('tab', 'scope-measures'\)/);
    expect(cc).toMatch(/p\.set\('from', Routes\.strata\.root\(\)\)/);
  });

  it('renders each contributing card individually, by name', () => {
    expect(rollupPanel).toMatch(/r\.contributing_project_cards\.map\(\(id\) =>/);
    expect(rollupPanel).toMatch(/\{c\.name\}/);
  });

  it('never fabricates navigation: unresolved card renders nothing, slugless card is plain text', () => {
    expect(rollupPanel).toMatch(/if \(!c\) return null;/);
    expect(rollupPanel).toMatch(/<span key=\{id\}[^>]*>\{c\.name\}<\/span>/);
  });
});

describe('S21 navigation — Project Card tab persists in the URL', () => {
  it('declares the tab slug contract in TabList order', () => {
    expect(cardView).toMatch(/CARD_TAB_SLUGS = \['overview', 'scope-measures', 'delivery'\]/);
  });

  it('Tabs is CONTROLLED by the ?tab= param (refresh returns to the same tab)', () => {
    expect(cardView).toMatch(/<Tabs id=\{`strata-project-detail-tabs-\$\{card\.id\}`\} selected=\{selectedTab\} onChange=\{handleTabChange\}>/);
    expect(cardView).toMatch(/searchParams\.get\('tab'\)/);
    expect(cardView).toMatch(/useSearchParams/);
  });

  it('writes the tab back to the URL without spamming history', () => {
    expect(cardView).toMatch(/next\.set\('tab', CARD_TAB_SLUGS\[index\] \?\? 'overview'\)/);
    expect(cardView).toMatch(/\{ replace: true \}/);
  });

  it('an absent/unrecognised tab token falls back to overview (zero-assumption)', () => {
    expect(cardView).toMatch(/Math\.max\(0, CARD_TAB_SLUGS\.indexOf\(/);
  });
});

/**
 * Canonical status-pill palette — single source of truth.
 *
 * 2026-06-17 — Vikram flagged the For You "Assigned" rows rendering a PALE
 * green (rgb(186,240,199)) for done-category statuses while the "Recommended"
 * mention cards rendered the BRIGHT canonical lime (#94C748). Five separate
 * renderers each hand-rolled their own done green. This test pins the canonical
 * value and asserts every work-item status renderer routes through the shared
 * statusPalette module instead of hardcoding a divergent green.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { STATUS_BG, STATUS_TEXT, statusBg, categoryToAppearance } from '../statusPalette';

const ROOT = resolve(__dirname, '../../../../..'); // → src/

function read(rel: string) {
  return readFileSync(resolve(ROOT, rel), 'utf8');
}

describe('canonical status palette', () => {
  it('pins the done/success background to the bright lime var(--ds-background-success-bold, #6A9A23)', () => {
    expect(STATUS_BG.success).toBe('var(--ds-background-success-bold, #6A9A23)');
    expect(statusBg('success')).toBe('var(--ds-background-success-bold, #6A9A23)');
    expect(STATUS_TEXT).toBe('var(--ds-text, #172B4D)');
  });

  it('maps done category to the canonical success bg', () => {
    expect(statusBg(categoryToAppearance('done'))).toBe('var(--ds-background-success-bold, #6A9A23)');
    expect(statusBg(categoryToAppearance('in_progress'))).toBe('var(--ds-background-information, #E9F2FF)');
    expect(statusBg(categoryToAppearance('todo'))).toBe('var(--ds-border, #DFE1E6)');
  });
});

describe('every work-item status renderer uses the canonical palette', () => {
  const RENDERERS = [
    'components/catalyst-detail-views/shared/sections/CatalystStatusPill.tsx',
    'components/for-you/atlaskit/ForYouRow.tsx',
    'components/ui/StatusLozenge.tsx',
    'components/shared/StatusPill.tsx',
    'components/workflow/WorkItemStatusLozenge.tsx',
    'components/workflow/JiraStatusLozenge.tsx',
  ];

  it.each(RENDERERS)('%s imports from statusPalette', (rel) => {
    expect(read(rel)).toMatch(/statusPalette/);
  });

  it.each(RENDERERS)('%s no longer hardcodes a divergent done green', (rel) => {
    const src = read(rel);
    // The two stale pale greens that diverged from canonical #94C748.
    expect(src).not.toMatch(/186,\s*240,\s*199/); // ForYouRow pale
    expect(src).not.toMatch(/179,\s*223,\s*114/); // ui/StatusLozenge + shared/StatusPill
  });
});

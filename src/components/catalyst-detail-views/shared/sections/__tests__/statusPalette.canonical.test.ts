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
import { STATUS_BG, STATUS_TEXT, statusBg, statusFg, categoryToAppearance } from '../statusPalette';

const ROOT = resolve(__dirname, '../../../../..'); // → src/

function read(rel: string) {
  return readFileSync(resolve(ROOT, rel), 'utf8');
}

describe('canonical status palette', () => {
  // 2026-06-27 — migrated to ADS semantic subtle bg + matching text PAIRS
  // (references/ads-token-map.md §STATUS BACKGROUNDS). Pairs are theme-aware:
  // ADS resolves both bg and text correctly in light AND dark mode, so contrast
  // passes WCAG in both. Replaces the prior non-theme-aware Jira hex that went
  // light-on-light (invisible) in dark mode.
  it('pins each status to its ADS subtle background token', () => {
    expect(STATUS_BG.success).toBe('var(--ds-background-success, #DFFCF0)');
    expect(statusBg('success')).toBe('var(--ds-background-success, #DFFCF0)');
    expect(STATUS_TEXT).toBe('var(--ds-text, var(--ds-text, #172B4D))');
  });

  it('maps each category to its canonical ADS subtle bg', () => {
    expect(statusBg(categoryToAppearance('done'))).toBe('var(--ds-background-success, #DFFCF0)');
    expect(statusBg(categoryToAppearance('in_progress'))).toBe('var(--ds-background-information, var(--ds-background-information, #E9F2FF))');
    expect(statusBg(categoryToAppearance('todo'))).toBe('var(--ds-background-neutral, var(--ds-background-neutral, #F1F2F4))');
  });

  it('pairs each status bg with its matching ADS text token (WCAG in both themes)', () => {
    expect(statusFg('success')).toBe('var(--ds-text-success, var(--ds-chart-green-bold, #216E4E))');
    expect(statusFg('inprogress')).toBe('var(--ds-text-information, #0055CC)');
    expect(statusFg('default')).toBe('var(--ds-text, var(--ds-text, #172B4D))');
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

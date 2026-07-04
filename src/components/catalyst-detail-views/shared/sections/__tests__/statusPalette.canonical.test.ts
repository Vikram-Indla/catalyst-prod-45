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
  it('pins each status to its ADS bold background token', () => {
    expect(STATUS_BG.success).toBe('var(--ds-background-success-bold)');
    expect(statusBg('success')).toBe('var(--ds-background-success-bold)');
    expect(STATUS_TEXT).toBe('var(--ds-text)');
  });

  it('maps each category to its canonical ADS bold bg', () => {
    expect(statusBg(categoryToAppearance('done'))).toBe('var(--ds-background-success-bold)');
    expect(statusBg(categoryToAppearance('in_progress'))).toBe('var(--ds-background-information-bold)');
    expect(statusBg(categoryToAppearance('todo'))).toBe('var(--ds-background-neutral)');
  });

  it('pairs each bold bg with WCAG-correct text token', () => {
    expect(statusFg('success')).toBe('var(--ds-text-inverse)');
    expect(statusFg('inprogress')).toBe('var(--ds-text-inverse)');
    expect(statusFg('moved')).toBe('var(--ds-text-warning-inverse)');
    expect(statusFg('default')).toBe('var(--ds-text)');
  });
});

describe('every work-item status renderer uses the canonical palette', () => {
  const RENDERERS = [
    'components/shared/StatusLozenge/StatusLozenge.tsx',
    'components/shared/StatusLozenge/StatusLozengeDropdown.tsx',
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

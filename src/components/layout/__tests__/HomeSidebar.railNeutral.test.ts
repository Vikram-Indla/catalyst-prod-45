/**
 * Collapsed Home-rail color lock.
 *
 * 2026-06-18 — Vikram flagged the collapsed left rail as a rainbow (10 hub
 * accent colors at once) — consumer, not enterprise. Decision: the persistent
 * rail is monochrome; color is reserved for the ACTIVE hub (brand-blue pill +
 * left bar). The hub outline SVGs feed the rail via <img>, so the accent color
 * is baked into the asset — neutralising the rail means the outline glyphs must
 * carry only the neutral ink (var(--ds-text-subtle, #44546F)), never a per-hub accent.
 *
 * This test pins that: every hub *-outline.svg may contain only the neutral
 * ink + white/none. Any per-hub accent reappearing = rail rainbow regression.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const HUBS_DIR = resolve(__dirname, '../../../assets/icons/hubs');
const NEUTRAL = 'var(--ds-icon, #44546F)';
const HUBS = ['home', 'strategy', 'ideation', 'product', 'project', 'release', 'test', 'incident', 'tasks', 'plan', 'wiki'];

// Allowed: the neutral ink + white + shorthand white. Everything else is an accent.
const ALLOWED = new Set([NEUTRAL.toLowerCase(), 'var(--ds-surface, #FFFFFF)', 'var(--ds-surface, #FFFFFF)']);

describe('collapsed Home rail is monochrome (neutral ink only)', () => {
  it.each(HUBS)('%s-outline.svg uses only the neutral ink, no accent', (hub) => {
    const p = resolve(HUBS_DIR, `${hub}-outline.svg`);
    if (!existsSync(p)) return; // tolerate icon-set changes
    const src = readFileSync(p, 'utf8');
    const hexes = (src.match(/#[0-9A-Fa-f]{3,6}\b/g) ?? []).map((h) => h.toLowerCase());
    const offenders = [...new Set(hexes)].filter((h) => !ALLOWED.has(h));
    expect(offenders, `${hub}-outline.svg has non-neutral color(s): ${offenders.join(', ')}`).toEqual([]);
  });
});

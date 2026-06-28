/**
 * Expanded Home-sidebar functional-icon neutrality lock.
 *
 * 2026-06-18 — the expanded sidebar painted every functional nav icon
 * (Dashboard, Backlog, Filters, All work, Timeline, Boards, List) uniform blue
 * via `loc.color`, while the collapsed rail is neutral. Decision: function
 * icons are NEUTRAL; color is reserved for the project avatar (identity, via
 * `head.color`) and the active row. This pins that contract.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const SRC = readFileSync(resolve(__dirname, '../HomeSidebar.tsx'), 'utf8');

describe('expanded Home sidebar — functional icons are neutral', () => {
  it('SectionIconWrapper defaults to the neutral subtle ink, never a brand/blue accent', () => {
    expect(SRC).toMatch(/primaryColor=\{color \?\? 'var\(--ds-text-subtle, var(--ds-icon, var(--ds-icon, #44546F))\)'\}/);
    // no brand/blue literal feeding the functional glyph default
    expect(SRC).not.toMatch(/icon-brand|var(--ds-link, #2563eb)|var(--ds-link, var(--ds-link, #0C66E4))/i);
  });

  it('recent-location functional icons do NOT inherit loc.color (would re-blue them)', () => {
    expect(SRC).not.toMatch(/<SectionIconWrapper section=\{loc\.section\} color=\{loc\.color\}/);
  });

  it('project avatar still carries identity color (head.color preserved)', () => {
    expect(SRC).toMatch(/color=\{head\.color\}/);
  });
});

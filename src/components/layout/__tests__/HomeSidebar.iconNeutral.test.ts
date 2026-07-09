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
    // Updated 2026-07-09: fallback chain was simplified from a nested
    // token cascade to a single neutral token — assertion updated to match
    // the current string while still pinning the neutral-only contract.
    expect(SRC).toMatch(/primaryColor=\{color \?\? 'var\(--ds-text-subtle\)'\}/);

    // Scope the "no brand/blue accent" check to the SectionIconWrapper
    // function body only. The file elsewhere legitimately uses
    // `--ds-icon-brand` to detect the ACTIVE collapsed-rail hub (the test's
    // own docblock carves that out: "color is reserved for ... the active
    // row") — a file-wide ban on the token was stale against that.
    const fnStart = SRC.indexOf('function SectionIconWrapper');
    expect(fnStart).toBeGreaterThan(-1);
    const fnBody = SRC.slice(fnStart, SRC.indexOf('\n}', fnStart) + 2);
    expect(fnBody).not.toMatch(/icon-brand|var(--ds-link)|var(--ds-link, var(--ds-link))/i);
  });

  it('recent-location functional icons do NOT inherit loc.color (would re-blue them)', () => {
    expect(SRC).not.toMatch(/<SectionIconWrapper section=\{loc\.section\} color=\{loc\.color\}/);
  });

  it('project avatar still carries identity color (head.color preserved)', () => {
    expect(SRC).toMatch(/color=\{head\.color\}/);
  });
});

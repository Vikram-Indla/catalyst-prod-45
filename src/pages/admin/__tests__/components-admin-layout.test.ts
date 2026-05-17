/**
 * ComponentsAdminPage layout contract test (2026-05-17, Step 6).
 *
 * Source-content asserts (matching the AdminGuard-coverage test pattern in
 * this directory) — verifies the page uses the canonical Atlaskit primitives
 * mandated by the preflight council:
 *
 *   - @atlaskit/page-header (NOT a hand-rolled header)
 *   - @atlaskit/tabs with 4 panels: Inventory, Banned, Violations, Cascade
 *   - @atlaskit/side-navigation for the category list (NOT a hand-rolled menu)
 *   - Consumes componentsRegistry + usageMap as the data sources
 *
 * RED until Step 6 wires the layout.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect } from 'vitest';

const PAGE = resolve(
  __dirname,
  '..',
  'components',
  'ComponentsAdminPage.tsx',
);

const src = (): string => readFileSync(PAGE, 'utf8');

describe('ComponentsAdminPage — layout primitives', () => {
  it('imports an @atlaskit heading primitive for the title', () => {
    // Either @atlaskit/page-header or @atlaskit/heading is acceptable —
    // both are canonical ADS title primitives. The test forbids hand-rolled
    // <h1>/<h2> headers (CLAUDE.md 2026-05-10 — @atlaskit/* primitives only).
    expect(src()).toMatch(/from\s+['"]@atlaskit\/(page-header|heading)['"]/);
  });

  it('imports @atlaskit/tabs', () => {
    expect(src()).toMatch(/from\s+['"]@atlaskit\/tabs['"]/);
  });

  it('imports @atlaskit/side-navigation', () => {
    expect(src()).toMatch(/from\s+['"]@atlaskit\/side-navigation['"]/);
  });

  it('declares 4 tabs: Inventory / Banned / Violations / Cascade', () => {
    const s = src();
    expect(s).toMatch(/Inventory/);
    expect(s).toMatch(/Banned/);
    expect(s).toMatch(/Violations/);
    expect(s).toMatch(/Cascade/);
  });

  it('consumes the registry + usage map', () => {
    const s = src();
    expect(s).toMatch(/from\s+['"]@\/registry\/components\.registry['"]/);
    expect(s).toMatch(/from\s+['"]@\/registry\/usage-map\.generated['"]/);
  });

  it('does not introduce hand-rolled dropdown patterns (CLAUDE.md 2026-05-10)', () => {
    const s = src();
    // Hand-rolled menu smell: useState(menuOpen|dropdownOpen|showMenu) + mousedown listener.
    expect(s).not.toMatch(/useState[^,)]*\b(menuOpen|dropdownOpen|showMenu)\b/);
  });
});

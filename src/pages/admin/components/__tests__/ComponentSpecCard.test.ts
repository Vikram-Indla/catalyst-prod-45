/**
 * ComponentSpecCard contract test (2026-05-17, Step 7).
 *
 * Source-content asserts. The spec card is the right-pane detail view
 * rendered inside InventoryPane when a registry entry is selected.
 *
 * Must surface:
 *   - Name, status lozenge, version, category badge
 *   - File path (clickable VS Code deep link via vscode://file/)
 *   - JSDoc excerpt (markdown-safe plain render)
 *   - Feature flags table when entry has feature_flags
 *   - Aggregate consumer file list (top 10 + "show all" toggle)
 *   - ads_origin_url link when present (deep link to atlassian.design)
 *
 * Hard guardrails:
 *   - @atlaskit/* primitives only (no hand-rolled menus/buttons)
 *   - ADS tokens only (no raw hex/rgb literals)
 *
 * RED until Step 7 ships the file.
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect } from 'vitest';

const FILE = resolve(__dirname, '..', 'ComponentSpecCard.tsx');
const src = (): string => readFileSync(FILE, 'utf8');

describe('ComponentSpecCard — contract', () => {
  it('file exists at canonical location', () => {
    expect(existsSync(FILE)).toBe(true);
  });

  it('exports a ComponentSpecCard component', () => {
    expect(src()).toMatch(/export\s+(default\s+function|function)\s+ComponentSpecCard/);
  });

  it('accepts a ComponentRegistryEntry prop', () => {
    expect(src()).toMatch(/ComponentRegistryEntry/);
  });

  it('renders the file_path as a vscode://file deep link', () => {
    expect(src()).toMatch(/vscode:\/\/file\//);
  });

  it('renders feature_flags when present', () => {
    const s = src();
    expect(s).toMatch(/feature_flags/);
  });

  it('renders aggregate consumer list from usage-map', () => {
    expect(src()).toMatch(/getAllConsumersByName/);
  });

  it('renders the ads_origin_url link when present', () => {
    expect(src()).toMatch(/ads_origin_url/);
  });

  it('uses ADS tokens for colors (no raw hex literals)', () => {
    const s = src();
    // Strip the token() fallback string args before scanning for stray hex.
    const stripped = s.replace(/token\(\s*['"][^'"]+['"]\s*,\s*['"]#[0-9A-Fa-f]+['"]\s*\)/g, 'TOKEN');
    // Whitelist: data: URLs and Catalyst's commonly-allowed transparent inline colors should not exist here.
    const hex = stripped.match(/#[0-9A-Fa-f]{3,8}\b/g) ?? [];
    expect(hex, `raw hex literals leaked: ${hex.join(', ')}`).toEqual([]);
  });

  it('does not introduce hand-rolled dropdown / menu state', () => {
    expect(src()).not.toMatch(/useState[^,)]*\b(menuOpen|dropdownOpen|showMenu)\b/);
  });
});

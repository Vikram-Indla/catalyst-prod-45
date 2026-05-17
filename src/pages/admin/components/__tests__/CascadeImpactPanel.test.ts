/**
 * CascadeImpactPanel contract test (2026-05-17, Step 10).
 *
 * The cascade-impact view is the mechanism Q3 of the preflight locked in:
 * "Registry version bump + consumer audit list." When an engineer is about
 * to change a canonical component, they pick it here, see every consumer
 * file that imports it, check them off as reviewed, and copy the markdown
 * checklist into the PR description.
 *
 * v1 = read-only audit list (no persistence, no codegen).
 * v2 = optional ts-morph codemod path.
 *
 * RED until Step 10 ships the file.
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect } from 'vitest';

const FILE = resolve(__dirname, '..', 'CascadeImpactPanel.tsx');
const src = (): string => readFileSync(FILE, 'utf8');

describe('CascadeImpactPanel — contract', () => {
  it('file exists', () => {
    expect(existsSync(FILE)).toBe(true);
  });

  it('exports a default CascadeImpactPanel', () => {
    expect(src()).toMatch(/export\s+default\s+function\s+CascadeImpactPanel/);
  });

  it('consumes componentsRegistry + getAllConsumersByName', () => {
    const s = src();
    expect(s).toMatch(/from\s+['"]@\/registry\/components\.registry['"]/);
    expect(s).toMatch(/getAllConsumersByName/);
  });

  it('uses @atlaskit/select for the component picker (not a hand-rolled dropdown)', () => {
    expect(src()).toMatch(/from\s+['"]@atlaskit\/select['"]/);
  });

  it('uses @atlaskit/checkbox for the audit checklist', () => {
    expect(src()).toMatch(/from\s+['"]@atlaskit\/checkbox['"]/);
  });

  it('provides a "Copy markdown" action for pasting into a PR description', () => {
    const s = src();
    expect(s).toMatch(/clipboard/i);
    expect(s).toMatch(/markdown/i);
  });

  it('uses ADS tokens (no raw hex)', () => {
    const s = src();
    const stripped = s.replace(/token\(\s*['"][^'"]+['"]\s*,\s*['"]#[0-9A-Fa-f]+['"]\s*\)/g, 'TOKEN');
    const hex = stripped.match(/#[0-9A-Fa-f]{3,8}\b/g) ?? [];
    expect(hex, `raw hex leaked: ${hex.join(', ')}`).toEqual([]);
  });

  it('does not introduce hand-rolled menu state', () => {
    expect(src()).not.toMatch(/useState[^,)]*\b(menuOpen|dropdownOpen|showMenu)\b/);
  });
});

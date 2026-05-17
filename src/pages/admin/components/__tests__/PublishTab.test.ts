/**
 * PublishTab contract test (PR-1 Step 6).
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect } from 'vitest';

const FILE = resolve(__dirname, '..', 'PublishTab.tsx');
const src = (): string => readFileSync(FILE, 'utf8');

describe('PublishTab — contract', () => {
  it('file exists', () => {
    expect(existsSync(FILE)).toBe(true);
  });

  it('exports default PublishTab', () => {
    expect(src()).toMatch(/export\s+default\s+function\s+PublishTab/);
  });

  it('uses @atlaskit/select for component picker', () => {
    expect(src()).toMatch(/from\s+['"]@atlaskit\/select['"]/);
  });

  it('uses @atlaskit/toggle or @atlaskit/checkbox for flag editors', () => {
    const s = src();
    expect(s).toMatch(/from\s+['"]@atlaskit\/(toggle|checkbox)['"]/);
  });

  it('reads useAllComponentConfigs and writes to supabase', () => {
    const s = src();
    expect(s).toMatch(/useAllComponentConfigs/);
    expect(s).toMatch(/component_config/);
  });

  it('exposes Publish and Reset actions', () => {
    const s = src();
    expect(s).toMatch(/Publish/);
    expect(s).toMatch(/Reset/);
  });

  it('uses ADS tokens only (no raw hex)', () => {
    const stripped = src().replace(/token\(\s*['"][^'"]+['"]\s*,\s*['"]#[0-9A-Fa-f]+['"]\s*\)/g, 'TOKEN');
    const hex = stripped.match(/#[0-9A-Fa-f]{3,8}\b/g) ?? [];
    expect(hex).toEqual([]);
  });
});

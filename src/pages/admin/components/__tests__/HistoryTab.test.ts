/**
 * HistoryTab contract test (PR-1 Step 8).
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect } from 'vitest';

const FILE = resolve(__dirname, '..', 'HistoryTab.tsx');
const src = (): string => readFileSync(FILE, 'utf8');

describe('HistoryTab — contract', () => {
  it('file exists', () => {
    expect(existsSync(FILE)).toBe(true);
  });

  it('exports default HistoryTab', () => {
    expect(src()).toMatch(/export\s+default\s+function\s+HistoryTab/);
  });

  it('queries component_config_history', () => {
    expect(src()).toMatch(/component_config_history/);
  });

  it('uses @atlaskit/modal-dialog for the rollback dry-run modal', () => {
    expect(src()).toMatch(/from\s+['"]@atlaskit\/modal-dialog['"]/);
  });

  it('renders a rollback button per row', () => {
    expect(src()).toMatch(/Rollback/);
  });

  it('shows a dry-run diff before rollback (Outsider council mandate)', () => {
    const s = src();
    expect(s).toMatch(/dry[\s-]?run/i);
  });

  it('uses ADS tokens only', () => {
    const stripped = src().replace(/token\(\s*['"][^'"]+['"]\s*,\s*['"]#[0-9A-Fa-f]+['"]\s*\)/g, 'TOKEN');
    const hex = stripped.match(/#[0-9A-Fa-f]{3,8}\b/g) ?? [];
    expect(hex).toEqual([]);
  });
});

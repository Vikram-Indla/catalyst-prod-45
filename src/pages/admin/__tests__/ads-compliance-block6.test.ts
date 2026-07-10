/**
 * ADS compliance guard for the Reference Data admin pages (Block 6, 2026-05-09).
 *
 * All 10 Reference Data pages must use @atlaskit/icon/core or
 * @atlaskit/icon/glyph for all icons — never lucide-react.
 *
 * RED against the current codebase (10 files import lucide-react,
 * 2 use animate-spin). GREEN after Block 6 icon swap migration.
 *
 * Vitest run: CI only (local Node 20.12.2 < vitest 4 minimum 20.19.0).
 */
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect } from 'vitest';

const ADMIN_DIR = resolve(__dirname, '..');

// Pages deleted since (dead-code sweeps) are skipped — the guard covers
// whatever Reference Data pages still exist.
const TARGET_FILES = [
  'CapacityDepartments.tsx',
  'Departments.tsx',
  'EpicStatuses.tsx',
  'FeatureStatuses.tsx',
  'ModulesPackages.tsx',
  'Portfolios.tsx',
  'ProcessSteps.tsx',
  'ResourceAssignments.tsx',
  'ThemeGroups.tsx',
  'ThemeStatuses.tsx',
].map(f => resolve(ADMIN_DIR, f)).filter(f => existsSync(f));

describe('Reference Data admin pages — ADS icon compliance', () => {
  it('imports no icons from lucide-react', () => {
    const violations = TARGET_FILES.filter(f =>
      readFileSync(f, 'utf8').includes("from 'lucide-react'"),
    );
    expect(violations).toEqual([]);
  });

  it('imports no Tailwind animate-spin (use @atlaskit/spinner instead)', () => {
    const violations = TARGET_FILES.filter(f =>
      readFileSync(f, 'utf8').includes('animate-spin'),
    );
    expect(violations).toEqual([]);
  });
});

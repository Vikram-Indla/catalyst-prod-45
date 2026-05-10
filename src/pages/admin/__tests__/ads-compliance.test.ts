/**
 * ADS compliance guard for the Users & Access admin pages (Block 4, 2026-05-09).
 *
 * UserAccessPage, UsersManagement, RolesPermissions, BusinessOwners must use
 * @atlaskit/icon/core or @atlaskit/icon/glyph for all icons — never
 * lucide-react. This test scans the 4 target files and asserts zero
 * lucide-react imports.
 *
 * RED against the current codebase (4 files import lucide-react).
 * GREEN after Block 4 icon swap migration.
 *
 * Vitest run: CI only (local Node 20.12.2 < vitest 4 minimum 20.19.0).
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect } from 'vitest';

const ADMIN_DIR = resolve(__dirname, '..');

const TARGET_FILES = [
  'UserAccessPage.tsx',
  'UsersManagement.tsx',
  'RolesPermissions.tsx',
  'BusinessOwners.tsx',
].map(f => resolve(ADMIN_DIR, f));

describe('Users & Access admin pages — ADS icon compliance', () => {
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

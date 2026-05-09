/**
 * ADS compliance guard for the General admin pages (Block 5, 2026-05-09).
 *
 * AdminOverview, FeatureFlagsPage, NotificationTriggers must use
 * @atlaskit/icon/core or @atlaskit/icon/glyph for all icons — never
 * lucide-react. ProductSettings and AdminLayout have no lucide-react imports.
 *
 * RED against the current codebase (3 files import lucide-react, 2 use animate-spin).
 * GREEN after Block 5 icon swap migration.
 *
 * Vitest run: CI only (local Node 20.12.2 < vitest 4 minimum 20.19.0).
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect } from 'vitest';

const ADMIN_DIR = resolve(__dirname, '..');

const TARGET_FILES = [
  'AdminOverview.tsx',
  'FeatureFlagsPage.tsx',
  'NotificationTriggers.tsx',
  'ProductSettings.tsx',
  'AdminLayout.tsx',
].map(f => resolve(ADMIN_DIR, f));

describe('General admin pages — ADS icon compliance', () => {
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

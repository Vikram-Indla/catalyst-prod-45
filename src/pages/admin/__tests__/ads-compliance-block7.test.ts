/**
 * ADS compliance guard for the Developer/Field Config admin pages (Block 7, 2026-05-09).
 *
 * Jira sync pages, workflow pages, and shared admin components must use
 * @atlaskit/icon/core or @atlaskit/icon/glyph for all icons — never
 * lucide-react. Loader2 + animate-spin must be replaced with @atlaskit/spinner.
 *
 * RED against the current codebase (9 files import lucide-react).
 * GREEN after Block 7 icon swap migration.
 *
 * Vitest run: CI only (local Node 20.12.2 < vitest 4 minimum 20.19.0).
 */
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect } from 'vitest';

const ADMIN_DIR = resolve(__dirname, '..');

// Pages deleted since (dead-code sweeps) are skipped — the guard covers
// whatever Developer/Field Config pages still exist.
const TARGET_FILES = [
  'JiraSyncControlPage.tsx',
  'JiraUserSync.tsx',
  'JiraActivitySyncPage.tsx',
  'JiraSyncAuditLog.tsx',
  'workflows/WorkflowAdminPage.tsx',
  'workflows/WorkflowEditor.tsx',
  'workflows/WorkflowDiagram.tsx',
  'components/UserDrawer.tsx',
  'components/BulkEditModal.tsx',
].map(f => resolve(ADMIN_DIR, f)).filter(f => existsSync(f));

describe('Developer/Field Config admin pages — ADS icon compliance', () => {
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

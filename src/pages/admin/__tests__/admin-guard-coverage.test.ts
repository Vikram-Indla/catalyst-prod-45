/**
 * AdminGuard coverage test (2026-05-10).
 *
 * Every admin page that is reachable via the /admin/* router must wrap its
 * content in <AdminGuard> (or <SuperAdminGuard> for super-admin-only pages).
 * Pages that lack a guard are reachable by any authenticated user who knows
 * the URL — a pre-existing security gap identified in the Phase C review.
 *
 * RED against the current codebase (7 pages unguarded).
 * GREEN after adding AdminGuard to all 7 targets.
 *
 * Vitest run: CI only (local Node 20.12.2 < vitest 4 minimum 20.19.0).
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect } from 'vitest';

const ADMIN_DIR = resolve(__dirname, '..');

const TARGET_FILES = [
  'UserAccessPage.tsx',
  'CapacityDepartments.tsx',
  'ResourceAssignments.tsx',
  'JiraUserSync.tsx',
  'workflows/WorkflowAdminPage.tsx',
  'FeatureFlagsPage.tsx',
  'NotificationTriggers.tsx',
].map(f => resolve(ADMIN_DIR, f));

describe('Admin pages — AdminGuard coverage', () => {
  it('every target page imports AdminGuard or SuperAdminGuard', () => {
    const violations = TARGET_FILES.filter(f => {
      const src = readFileSync(f, 'utf8');
      return !src.includes('AdminGuard');
    }).map(f => f.replace(ADMIN_DIR + '/', ''));
    expect(violations).toEqual([]);
  });

  it('every target page uses AdminGuard or SuperAdminGuard in JSX', () => {
    const violations = TARGET_FILES.filter(f => {
      const src = readFileSync(f, 'utf8');
      return !/<AdminGuard|<SuperAdminGuard/.test(src);
    }).map(f => f.replace(ADMIN_DIR + '/', ''));
    expect(violations).toEqual([]);
  });
});

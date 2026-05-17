/**
 * ComponentsAdminPage registration test (2026-05-17).
 *
 * Guards the contract for /admin/components:
 *   1. Route is registered in REGISTERED_ADMIN_ROUTES (no dead sidebar link).
 *   2. A "Design system" pocket exists in adminPockets and contains the
 *      Components leaf alongside Icons + Avatars (consolidation, per
 *      preflight 2026-05-17 council decision).
 *   3. The page file exists at src/pages/admin/components/ComponentsAdminPage.tsx
 *      and wraps its tree in <AdminGuard> (CLAUDE.md 2026-05-10 mandatory gate).
 *
 * RED until Step 2 lands the route, Step 3 lands the pocket move, and the
 * scaffold page is written.
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect } from 'vitest';

import { adminPockets, REGISTERED_ADMIN_ROUTES } from '@/components/admin/admin-nav';

const ADMIN_DIR = resolve(__dirname, '..');
const COMPONENTS_PAGE = resolve(ADMIN_DIR, 'components/ComponentsAdminPage.tsx');

describe('/admin/components — registration + guard', () => {
  it('registers /admin/components in REGISTERED_ADMIN_ROUTES', () => {
    expect(REGISTERED_ADMIN_ROUTES.has('/admin/components')).toBe(true);
  });

  it('exposes a "Design system" pocket containing Components, Icons, Avatars', () => {
    const designSystem = adminPockets.find(p => p.id === 'design-system');
    expect(designSystem, 'Design system pocket missing from adminPockets').toBeDefined();
    const childPaths = (designSystem?.children ?? []).map(c => c.path);
    expect(childPaths).toContain('/admin/components');
    expect(childPaths).toContain('/admin/icons');
    expect(childPaths).toContain('/admin/avatars');
  });

  it('moves Icons + Avatars out of the General pocket', () => {
    const general = adminPockets.find(p => p.id === 'general');
    const generalPaths = (general?.children ?? []).map(c => c.path);
    expect(generalPaths).not.toContain('/admin/icons');
    expect(generalPaths).not.toContain('/admin/avatars');
  });

  it('ComponentsAdminPage.tsx exists at the canonical location', () => {
    expect(existsSync(COMPONENTS_PAGE)).toBe(true);
  });

  it('ComponentsAdminPage wraps its tree in <AdminGuard>', () => {
    const src = readFileSync(COMPONENTS_PAGE, 'utf8');
    expect(src).toMatch(/from\s+['"]@\/components\/admin\/AdminGuard['"]/);
    expect(src).toMatch(/<AdminGuard[\s>]/);
  });
});

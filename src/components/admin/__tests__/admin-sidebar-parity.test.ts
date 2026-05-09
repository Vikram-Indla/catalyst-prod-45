/**
 * Admin sidebar parity test.
 *
 * CLAUDE.md 2026-05-09: Every leaf path in adminPockets must be registered
 * in REGISTERED_ADMIN_ROUTES. This prevents dead sidebar links (404 on click).
 *
 * Run after ANY change to AdminSidebarV2.tsx, admin-nav.ts, or FullAppRoutes.tsx.
 */
import { describe, it, expect } from 'vitest';
import { getAdminLeafPaths, REGISTERED_ADMIN_ROUTES } from '../admin-nav';

describe('Admin sidebar IA parity', () => {
  it('every leaf sidebar path resolves to a registered route (no dead links)', () => {
    const leafPaths = getAdminLeafPaths();
    const deadLinks: string[] = [];

    for (const { label, path, section } of leafPaths) {
      if (!REGISTERED_ADMIN_ROUTES.has(path)) {
        deadLinks.push(`[${section} > ${label}] → "${path}" is NOT registered`);
      }
    }

    if (deadLinks.length > 0) {
      throw new Error(
        `${deadLinks.length} dead sidebar link(s) found:\n` +
        deadLinks.map(d => `  ✗ ${d}`).join('\n') +
        '\n\nFix: remove from adminPockets in admin-nav.ts, or register the route in FullAppRoutes.tsx.'
      );
    }

    expect(leafPaths.length).toBeGreaterThan(0);
  });

  it('REGISTERED_ADMIN_ROUTES has no duplicates', () => {
    // Set construction deduplicates — size should equal Array.from size
    const asArray = Array.from(REGISTERED_ADMIN_ROUTES);
    expect(new Set(asArray).size).toBe(asArray.length);
  });

  it('all registered routes start with /admin/', () => {
    for (const route of REGISTERED_ADMIN_ROUTES) {
      expect(route).toMatch(/^\/admin\//);
    }
  });
});

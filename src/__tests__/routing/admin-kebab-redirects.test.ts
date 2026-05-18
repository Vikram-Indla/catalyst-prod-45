/**
 * Admin routes must use kebab-case. camelCase paths get 301 redirects.
 *
 * Violations:
 *   /admin/business/EpicStatus   → /admin/business/epic-statuses
 *   /admin/business/FeatureStatus → /admin/business/feature-statuses
 *   /admin/business/ThemeStatus  → /admin/business/theme-statuses
 *   /admin/business/ProcessStep  → /admin/business/process-steps
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..', '..');
const FULL_ROUTES = join(ROOT, 'routes/FullAppRoutes.tsx');

function source(): string {
  return readFileSync(FULL_ROUTES, 'utf8');
}

const KEBAB_ROUTES = [
  'business/epic-statuses',
  'business/feature-statuses',
  'business/theme-statuses',
  'business/process-steps',
];

const CAMEL_ROUTES = [
  'business/EpicStatus',
  'business/FeatureStatus',
  'business/ThemeStatus',
  'business/ProcessStep',
];

describe('Admin routes — kebab-case enforcement', () => {
  it('declares kebab-case canonical routes', () => {
    const src = source();
    for (const route of KEBAB_ROUTES) {
      expect(src, `Missing kebab-case route: ${route}`).toContain(`path="${route}"`);
    }
  });

  it('camelCase routes redirect to kebab-case equivalents (Navigate replace)', () => {
    const src = source();
    for (const route of CAMEL_ROUTES) {
      const routeBlock = src.slice(src.indexOf(`path="${route}"`));
      const lineEnd = routeBlock.indexOf('\n');
      const line = routeBlock.slice(0, lineEnd);
      expect(line, `${route} should be a Navigate redirect`).toMatch(/Navigate/);
    }
  });
});

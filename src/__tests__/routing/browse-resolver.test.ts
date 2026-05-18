/**
 * /browse/:issueKey — universal issue resolver route.
 *
 * Jira Cloud uses /browse/BAU-5609 as the canonical share-unit URL.
 * Catalyst documented this intent in workItemRoutes.ts:23 but never
 * declared it as a Route. This test pins the requirement.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..', '..');
const APP = join(ROOT, 'App.tsx');
const FULL_ROUTES = join(ROOT, 'routes/FullAppRoutes.tsx');

function readSource(path: string): string {
  return readFileSync(path, 'utf8');
}

describe('/browse/:issueKey — universal resolver', () => {
  it('declares a Route with path="/browse/:issueKey" in the route tree', () => {
    const app = readSource(APP);
    const full = readSource(FULL_ROUTES);
    const combined = app + '\n' + full;
    expect(combined).toMatch(/path=["'](\/browse\/|browse\/):issueKey["']/);
  });

  it('/issue/:issueKey redirects to /browse/:issueKey (301 deprecation)', () => {
    const app = readSource(APP);
    const full = readSource(FULL_ROUTES);
    const combined = app + '\n' + full;
    // The old /issue/:issueKey route should be a redirect, not a direct element mount
    const issueRouteMatch = combined.match(/path=["']\/issue\/:issueKey["'][^>]*element=\{[^}]*<(Navigate|IssueRedirectToBrowse)/);
    expect(issueRouteMatch, '/issue/:issueKey should redirect to /browse/:issueKey').not.toBeNull();
  });

  it('/project/:key/issue/:issueKey redirects to /browse/:issueKey', () => {
    const full = readSource(FULL_ROUTES);
    const match = full.match(/path=["']\/project\/:key\/issue\/:issueKey["'][^>]*element=\{[^}]*<(Navigate|IssueRedirectToBrowse)/);
    expect(match, '/project/:key/issue/:issueKey should redirect to /browse/:issueKey').not.toBeNull();
  });
});

/**
 * Phase B — nav/shell sweep across every registered /testhub/* route.
 * CAT-TESTHUB-CERT-20260708-001
 */
import { test, expect, Page } from '@playwright/test';
import { writeFileSync, mkdirSync } from 'fs';

const ROUTES = [
  { key: 'dashboard', path: '/testhub/dashboard' },
  { key: 'board', path: '/testhub/board' },
  { key: 'my-work', path: '/testhub/my-work' },
  { key: 'filters', path: '/testhub/filters' },
  { key: 'repository', path: '/testhub/repository' },
  { key: 'sets', path: '/testhub/sets' }, // expected to redirect to /testhub/plans (D-004, intentional)
  { key: 'plans', path: '/testhub/plans' },
  { key: 'executions', path: '/testhub/executions' },
  { key: 'cycles', path: '/testhub/cycles' },
  { key: 'timeline', path: '/testhub/timeline' },
  { key: 'dependencies', path: '/testhub/dependencies' },
  { key: 'defects', path: '/testhub/defects' },
  { key: 'traceability', path: '/testhub/traceability' },
  { key: 'reports', path: '/testhub/reports' },
];

mkdirSync('test-results/testhub-certification', { recursive: true });
const ledgerRows: any[] = [];

test.describe('Phase B — Test Hub nav sweep', () => {
  for (const route of ROUTES) {
    test(`nav: ${route.key} (${route.path})`, async ({ page }) => {
      const consoleErrors: string[] = [];
      const networkFailures: string[] = [];
      page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
      page.on('pageerror', (err) => consoleErrors.push(`PAGEERROR: ${err.message}`));
      page.on('response', (res) => {
        if (res.status() >= 400) networkFailures.push(`${res.status()} ${res.url()}`);
      });

      await page.goto(route.path, { waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
      await page.waitForTimeout(1000);

      const finalUrl = page.url();
      const bodyText = await page.locator('body').innerText().catch(() => '');
      const hasBlankShell = bodyText.trim().length < 20;
      const hasErrorBoundary = /something went wrong|application error/i.test(bodyText);

      await page.screenshot({ path: `test-results/testhub-certification/screenshots/nav-${route.key}.png`, fullPage: true });

      const row = {
        time: new Date().toISOString(),
        route: route.path,
        finalUrl,
        hasBlankShell,
        hasErrorBoundary,
        consoleErrors,
        networkFailures,
        status: (!hasBlankShell && !hasErrorBoundary && consoleErrors.length === 0) ? 'pass' : 'review',
      };
      ledgerRows.push(row);

      expect(hasErrorBoundary, `route ${route.path} rendered an error boundary`).toBe(false);
      expect(hasBlankShell, `route ${route.path} rendered a blank shell`).toBe(false);
    });
  }

  test.afterAll(() => {
    writeFileSync(
      'test-results/testhub-certification/phase-b-nav-sweep-result.json',
      JSON.stringify(ledgerRows, null, 2)
    );
  });
});

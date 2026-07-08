/**
 * TH-A04/A05 harness probe — CAT-TESTHUB-CERT-20260708-001
 * Confirms auth reality before any certification journey runs.
 */
import { test, expect } from '@playwright/test';
import { writeFileSync } from 'fs';

const email = process.env.TEST_USER_EMAIL || 'test@example.com';
const password = process.env.TEST_USER_PASSWORD || 'testpassword123';

test('auth probe: can a test credential reach an authenticated /testhub route', async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
  page.on('pageerror', (err) => consoleErrors.push(`PAGEERROR: ${err.message}`));

  await page.goto('/testhub/dashboard', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);

  const url = page.url();
  const isLoginPage = await page.locator('input[type="email"], input[name="email"]').isVisible().catch(() => false);

  if (isLoginPage) {
    await page.fill('input[type="email"], input[name="email"]', email);
    await page.fill('input[type="password"], input[name="password"]', password);
    await page.click('button[type="submit"]');
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(3000);
  }

  await page.screenshot({ path: 'test-results/testhub-certification/screenshots/00-auth-probe.png', fullPage: true });

  const result = {
    initialUrl: url,
    hitLoginPage: isLoginPage,
    finalUrl: page.url(),
    consoleErrors,
  };
  writeFileSync('test-results/testhub-certification/00-auth-probe-result.json', JSON.stringify(result, null, 2));
});

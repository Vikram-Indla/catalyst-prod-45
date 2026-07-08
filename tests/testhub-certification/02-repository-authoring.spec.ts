/**
 * Phase C — repository case authoring.
 * CAT-TESTHUB-CERT-20260708-001
 */
import { test, expect } from '@playwright/test';
import { writeFileSync } from 'fs';

const CASE_TITLE = `E2E-SENAEI-BAU-${Date.now()} Verify license renewal blocks on expired document`;

test.describe('Phase C — Repository authoring', () => {
  test('C03: manually create a test case via inline quick-create', async ({ page }) => {
    await page.goto('/testhub/repository');
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});

    await page.getByRole('button', { name: '+ Create case' }).click();
    await page.waitForTimeout(500);

    const inlineInput = page.locator('input[placeholder*="What should this case verify"], textarea[placeholder*="What should this case verify"]').first();
    await inlineInput.fill(CASE_TITLE);
    await inlineInput.press('Enter');
    await page.waitForTimeout(2000);

    await page.screenshot({ path: 'test-results/testhub-certification/screenshots/02-case-created.png', fullPage: true });

    const row = page.getByText(CASE_TITLE, { exact: false });
    const isVisible = await row.first().isVisible().catch(() => false);

    writeFileSync('test-results/testhub-certification/phase-c-case-create-result.json', JSON.stringify({
      caseTitle: CASE_TITLE,
      rowVisibleAfterCreate: isVisible,
    }, null, 2));

    expect(isVisible, 'newly created case row should appear in repository table').toBe(true);
  });
});

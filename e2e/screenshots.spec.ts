import { test, expect } from '@playwright/test';

test.describe('Golden Screenshots - Light & Dark Modes', () => {
  const pages = [
    { path: '/', name: 'homepage' },
    { path: '/work', name: 'worklist' },
    { path: '/board', name: 'board' },
    { path: '/admin', name: 'admin-panel' },
  ];

  for (const page of pages) {
    test(`Capture ${page.name} - Light Mode`, async ({ page }) => {
      await page.goto(page.path);
      await page.waitForLoadState('networkidle');
      await page.screenshot({
        path: `audits/ads-parity/screenshots/golden/${page.name}-light.png`,
        fullPage: true,
      });
    });

    test(`Capture ${page.name} - Dark Mode`, async ({ page }) => {
      await page.goto(page.path);
      // Set dark mode via CSS or data attribute
      await page.addInitScript(() => {
        document.documentElement.setAttribute('data-theme', 'dark');
        document.documentElement.style.colorScheme = 'dark';
      });
      await page.waitForLoadState('networkidle');
      await page.screenshot({
        path: `audits/ads-parity/screenshots/golden/${page.name}-dark.png`,
        fullPage: true,
      });
    });
  }
});

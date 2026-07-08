import { test as setup, expect } from '@playwright/test';

const email = process.env.TEST_USER_EMAIL || 'vikramataol@gmail.com';
const password = process.env.TEST_USER_PASSWORD || 'Catalyst123!';
const authFile = 'test-results/testhub-certification/.auth/user.json';

setup('authenticate', async ({ page }) => {
  await page.goto('/auth');
  await page.fill('input[type="email"], input[name="email"]', email);
  await page.fill('input[type="password"], input[name="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL((url) => !url.pathname.startsWith('/auth'), { timeout: 20000 });
  await page.context().storageState({ path: authFile });
});

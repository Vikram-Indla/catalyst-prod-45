/**
 * chat-full-screen.spec.ts — end-to-end guard for the Catalyst Chat v2
 * surface at /chat.
 *
 * Rewritten 2026-07-05 for chat-v2. The previous version targeted chat-v1
 * DOM (`.c-sb-section__head`, `[aria-label="Conversations"]`, `.c-sb-row`)
 * that no longer exists and was orphaned outside any playwright config's
 * testDir, so it never ran. Selectors below match the live chat-v2 tree
 * (ChatNavRail, Sidebar, MessageList, Composer, EmptyPanel).
 *
 * Run: npm run test:e2e:chat  (needs the dev server on :8080 + valid login
 * creds in TEST_USER_EMAIL / TEST_USER_PASSWORD).
 */
import { test, expect, Page } from '@playwright/test';

async function loginIfRequired(page: Page) {
  const onLogin = await page
    .locator('input[type="email"], input[name="email"]')
    .isVisible()
    .catch(() => false);
  if (!onLogin) return;
  const email = process.env.TEST_USER_EMAIL;
  const password = process.env.TEST_USER_PASSWORD;
  test.skip(!email || !password, 'Login required but TEST_USER_EMAIL/PASSWORD not set');
  await page.fill('input[type="email"], input[name="email"]', email!);
  await page.fill('input[type="password"]', password!);
  await page.click('button[type="submit"]');
  await page.waitForLoadState('networkidle').catch(() => {});
}

test.describe('Chat v2 full-screen module', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/chat');
    await loginIfRequired(page);
    await page.waitForLoadState('networkidle');
  });

  test('nav rail renders the four chat views', async ({ page }) => {
    const rail = page.locator('aside[aria-label="Chat navigation"]');
    await expect(rail).toBeVisible();
    for (const label of ['Home', 'DMs', 'Activity', 'Saved']) {
      await expect(rail.getByRole('button', { name: new RegExp(label) })).toBeVisible();
    }
  });

  test('sidebar search is interactive', async ({ page }) => {
    const search = page.getByPlaceholder('Search conversations…');
    await expect(search).toBeVisible();
    await search.fill('release');
    await expect(search).toHaveValue('release');
  });

  test('empty state shows the hero with compose actions', async ({ page }) => {
    // No conversation selected → the EmptyPanel hero renders in the panel.
    await expect(page.getByText('Pick up where the work left off')).toBeVisible();
    await expect(page.getByRole('button', { name: 'New message' })).toBeVisible();
  });

  test('selecting a conversation renders the message log + composer', async ({ page }) => {
    const sidebar = page.locator('aside[aria-label="Chat navigation"]');
    await expect(sidebar).toBeVisible();
    // First conversation row in the list sidebar (a project/channel/DM button
    // with a timestamp). Fall back to asserting the empty state if the
    // environment seeded no conversations.
    const firstRow = page
      .locator('button')
      .filter({ hasText: /\b(AM|PM|Yesterday|Jun|Jul)\b/ })
      .first();
    if ((await firstRow.count()) === 0) {
      await expect(page.getByText('Pick up where the work left off')).toBeVisible();
      return;
    }
    await firstRow.click();
    await expect(page.locator('[role="log"][aria-label="Messages"]')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('[role="textbox"][contenteditable="true"]')).toBeVisible();
  });

  test('notification bell opens the preference menu', async ({ page }) => {
    const firstRow = page
      .locator('button')
      .filter({ hasText: /\b(AM|PM|Yesterday|Jun|Jul)\b/ })
      .first();
    test.skip((await firstRow.count()) === 0, 'No conversations seeded');
    await firstRow.click();
    await page.getByRole('button', { name: 'Notification preferences' }).click();
    const menu = page.getByRole('menu', { name: 'Notification preferences' });
    await expect(menu).toBeVisible();
    await expect(menu.getByRole('menuitemradio', { name: /All new messages/ })).toBeVisible();
    await expect(menu.getByRole('menuitemradio', { name: /Mentions only/ })).toBeVisible();
  });
});

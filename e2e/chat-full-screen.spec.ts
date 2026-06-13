import { test, expect } from '@playwright/test';

test.describe('Chat full-screen module', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/chat');
    await page.waitForLoadState('networkidle');
  });

  test('sidebar renders with section headers', async ({ page }) => {
    // Conversation sidebar must be present
    const sidebar = page.locator('[aria-label="Conversations"]');
    await expect(sidebar).toBeVisible();

    // At least one section header should be visible
    const sectionHeaders = sidebar.locator('.c-sb-section__head');
    await expect(sectionHeaders.first()).toBeVisible();
  });

  test('search input is visible and interactive', async ({ page }) => {
    const search = page.locator('input[aria-label="Search conversations"]');
    await expect(search).toBeVisible();
    await search.fill('test');
    await expect(search).toHaveValue('test');

    // Clear button appears after typing
    const clearBtn = page.locator('[aria-label="Clear search"]');
    await expect(clearBtn).toBeVisible();
    await clearBtn.click();
    await expect(search).toHaveValue('');
  });

  test('selecting a conversation renders the feed', async ({ page }) => {
    const sidebar = page.locator('[aria-label="Conversations"]');

    // Click the first conversation row if one exists
    const firstRow = sidebar.locator('.c-sb-row').first();
    const rowCount = await firstRow.count();

    if (rowCount === 0) {
      // No conversations seeded in this environment — just verify empty state
      const emptyState = page.locator('[aria-label="Conversation list"]');
      await expect(emptyState).toBeVisible();
      return;
    }

    await firstRow.click();

    // Feed container should become visible
    const feed = page.locator('[aria-label="Message feed"]');
    await expect(feed).toBeVisible({ timeout: 5000 });
  });

  test('collapse/expand sidebar toggle works', async ({ page }) => {
    const collapseBtn = page.locator('[aria-label="Collapse sidebar"]');
    await expect(collapseBtn).toBeVisible();
    await collapseBtn.click();

    // After collapse the expand button should appear
    const expandBtn = page.locator('[aria-label="Expand sidebar"]');
    await expect(expandBtn).toBeVisible();

    // Title disappears when collapsed
    const title = page.locator('.c-sb-head__title');
    await expect(title).toBeHidden();

    // Expand again
    await expandBtn.click();
    await expect(page.locator('[aria-label="Collapse sidebar"]')).toBeVisible();
  });
});

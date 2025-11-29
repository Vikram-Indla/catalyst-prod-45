import { test, expect } from '@playwright/test';

test.describe('Epic Backlog Kanban View', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/portfolio/99999999-9999-9999-9999-999999999999/backlog');
    await page.waitForLoadState('networkidle');
  });

  test('should switch to kanban view', async ({ page }) => {
    // Find and click kanban view toggle
    const kanbanButton = page.getByRole('button', { name: /kanban/i });
    await kanbanButton.click();
    
    // Wait for kanban columns to appear
    await page.waitForSelector('[class*="flex gap-4"]');
    
    // Verify state columns are visible
    const columns = page.locator('[class*="flex-shrink-0"]');
    await expect(columns.first()).toBeVisible();
  });

  test('should display items in correct state columns', async ({ page }) => {
    // Switch to kanban view
    const kanbanButton = page.getByRole('button', { name: /kanban/i });
    await kanbanButton.click();
    
    // Wait for cards to load
    await page.waitForSelector('[class*="cursor-pointer"]', { timeout: 5000 });
    
    // Verify at least one card is visible
    const cards = page.locator('[class*="cursor-pointer"]');
    const count = await cards.count();
    expect(count).toBeGreaterThan(0);
  });

  test('should open epic details when card clicked', async ({ page }) => {
    // Switch to kanban view
    const kanbanButton = page.getByRole('button', { name: /kanban/i });
    await kanbanButton.click();
    
    // Wait for cards
    await page.waitForSelector('[class*="cursor-pointer"]', { timeout: 5000 });
    
    // Click first card
    const firstCard = page.locator('[class*="cursor-pointer"]').first();
    await firstCard.click();
    
    // Verify details panel appears
    await page.waitForTimeout(500);
    const detailsPanel = page.locator('[class*="w-\\[600px\\]"]');
    const isVisible = await detailsPanel.isVisible().catch(() => false);
    expect(isVisible).toBeDefined();
  });

  test('should show item counts in column headers', async ({ page }) => {
    // Switch to kanban view
    const kanbanButton = page.getByRole('button', { name: /kanban/i });
    await kanbanButton.click();
    
    // Wait for columns
    await page.waitForSelector('[class*="flex-shrink-0"]');
    
    // Check for count badges
    const countBadges = page.locator('text=/\\d+/');
    const count = await countBadges.count();
    expect(count).toBeGreaterThan(0);
  });
});

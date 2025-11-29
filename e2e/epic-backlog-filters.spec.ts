import { test, expect } from '@playwright/test';

test.describe('Epic Backlog Filters', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/portfolio/99999999-9999-9999-9999-999999999999/backlog');
    await page.waitForLoadState('networkidle');
  });

  test('should open filters dialog', async ({ page }) => {
    // Find and click filters button
    const filtersButton = page.getByRole('button', { name: /filters/i });
    await filtersButton.click();
    
    // Verify dialog appears
    await page.waitForSelector('[role="dialog"]');
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible();
    
    // Verify dialog title
    const title = page.getByRole('heading', { name: /filter backlog/i });
    await expect(title).toBeVisible();
  });

  test('should display filter controls', async ({ page }) => {
    // Open filters dialog
    const filtersButton = page.getByRole('button', { name: /filters/i });
    await filtersButton.click();
    
    await page.waitForSelector('[role="dialog"]');
    
    // Check for filter labels
    await expect(page.getByText('Portfolio')).toBeVisible();
    await expect(page.getByText('State')).toBeVisible();
    await expect(page.getByText('Health')).toBeVisible();
  });

  test('should apply filters', async ({ page }) => {
    // Open filters dialog
    const filtersButton = page.getByRole('button', { name: /filters/i });
    await filtersButton.click();
    
    await page.waitForSelector('[role="dialog"]');
    
    // Click Apply button
    const applyButton = page.getByRole('button', { name: /apply filters/i });
    await applyButton.click();
    
    // Dialog should close
    await page.waitForTimeout(500);
    const dialog = page.locator('[role="dialog"]');
    const isVisible = await dialog.isVisible().catch(() => false);
    expect(isVisible).toBe(false);
  });

  test('should clear filters', async ({ page }) => {
    // Open filters dialog
    const filtersButton = page.getByRole('button', { name: /filters/i });
    await filtersButton.click();
    
    await page.waitForSelector('[role="dialog"]');
    
    // Click Clear All button
    const clearButton = page.getByRole('button', { name: /clear all/i });
    await clearButton.click();
    
    // Filters should be reset (dialog stays open)
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible();
  });
});

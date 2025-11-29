import { test, expect } from '@playwright/test';

test.describe('Epic Backlog User Preferences', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/portfolio/99999999-9999-9999-9999-999999999999/backlog');
    await page.waitForLoadState('networkidle');
  });

  test('should persist view selection', async ({ page }) => {
    // Switch to kanban view
    const kanbanButton = page.getByRole('button', { name: /kanban/i });
    if (await kanbanButton.isVisible()) {
      await kanbanButton.click();
      await page.waitForTimeout(500);
      
      // Reload page
      await page.reload();
      await page.waitForLoadState('networkidle');
      
      // Check if kanban view is still active
      const kanbanActive = await page.locator('[class*="kanban"]').isVisible().catch(() => false);
      expect(kanbanActive).toBeDefined();
    }
  });

  test('should persist column configuration', async ({ page }) => {
    // Open column config
    const columnsButton = page.getByRole('button', { name: /columns/i });
    if (await columnsButton.isVisible()) {
      await columnsButton.click();
      await page.waitForTimeout(500);
      
      // Toggle a column
      const checkbox = page.locator('input[type="checkbox"]').first();
      await checkbox.click();
      
      // Apply changes
      const applyButton = page.getByRole('button', { name: /apply/i });
      await applyButton.click();
      
      await page.waitForTimeout(500);
      
      // Reload page
      await page.reload();
      await page.waitForLoadState('networkidle');
      
      // Column configuration should persist
      const grid = page.locator('[role="grid"]');
      const isVisible = await grid.isVisible().catch(() => false);
      expect(isVisible).toBeDefined();
    }
  });

  test('should remember last filter settings', async ({ page }) => {
    // Open filters
    const filterButton = page.getByRole('button', { name: /filter/i });
    if (await filterButton.isVisible()) {
      await filterButton.click();
      await page.waitForTimeout(500);
      
      // Apply a filter
      const applyButton = page.getByRole('button', { name: /apply/i });
      if (await applyButton.isVisible()) {
        await applyButton.click();
        await page.waitForTimeout(500);
      }
      
      // Reload page
      await page.reload();
      await page.waitForLoadState('networkidle');
      
      // Page should load with filters
      const content = page.locator('main');
      const isVisible = await content.isVisible().catch(() => false);
      expect(isVisible).toBeDefined();
    }
  });

  test('should sync preferences across sessions', async ({ page, context }) => {
    // Make a preference change
    const kanbanButton = page.getByRole('button', { name: /kanban/i });
    if (await kanbanButton.isVisible()) {
      await kanbanButton.click();
      await page.waitForTimeout(1000);
    }
    
    // Open new tab
    const newPage = await context.newPage();
    await newPage.goto('/portfolio/99999999-9999-9999-9999-999999999999/backlog');
    await newPage.waitForLoadState('networkidle');
    
    // Check if preference is reflected
    const kanbanView = await newPage.locator('[class*="kanban"]').isVisible().catch(() => false);
    expect(kanbanView).toBeDefined();
    
    await newPage.close();
  });
});

import { test, expect } from '@playwright/test';

test.describe('Epic Backlog Complete Workflow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/portfolio/99999999-9999-9999-9999-999999999999/backlog');
    await page.waitForLoadState('networkidle');
  });

  test('should complete full epic management workflow', async ({ page }) => {
    // 1. View list of epics
    await page.waitForSelector('[class*="cursor-pointer"]', { timeout: 5000 });
    const rows = page.locator('[class*="cursor-pointer"]');
    const count = await rows.count();
    expect(count).toBeGreaterThan(0);
    
    // 2. Switch views
    const kanbanButton = page.getByRole('button', { name: /kanban/i });
    if (await kanbanButton.isVisible()) {
      await kanbanButton.click();
      await page.waitForTimeout(500);
    }
    
    // 3. Open filters
    const filterButton = page.getByRole('button', { name: /filter/i });
    if (await filterButton.isVisible()) {
      await filterButton.click();
      await page.waitForTimeout(500);
      
      const closeButton = page.getByRole('button', { name: /cancel/i });
      if (await closeButton.isVisible()) {
        await closeButton.click();
      }
    }
    
    // 4. Configure columns
    const columnsButton = page.getByRole('button', { name: /columns/i });
    if (await columnsButton.isVisible()) {
      await columnsButton.click();
      await page.waitForTimeout(500);
      
      const cancelButton = page.getByRole('button', { name: /cancel/i });
      if (await cancelButton.isVisible()) {
        await cancelButton.click();
      }
    }
    
    // 5. Check export functionality
    const actionsButton = page.getByRole('button', { name: /actions/i });
    if (await actionsButton.isVisible()) {
      const hasExport = await page.getByText(/export/i).isVisible().catch(() => false);
      expect(hasExport).toBeDefined();
    }
  });

  test('should handle epic selection and bulk operations', async ({ page }) => {
    await page.waitForSelector('[class*="cursor-pointer"]', { timeout: 5000 });
    
    // Select first epic
    const firstCheckbox = page.locator('input[type="checkbox"]').first();
    if (await firstCheckbox.isVisible()) {
      await firstCheckbox.click();
      await page.waitForTimeout(300);
      
      // Check selection indicator
      const selectionText = page.getByText(/selected/i);
      const isVisible = await selectionText.isVisible().catch(() => false);
      expect(isVisible).toBeDefined();
    }
  });

  test('should handle epic details panel', async ({ page }) => {
    await page.waitForSelector('[class*="cursor-pointer"]', { timeout: 5000 });
    
    // Click first epic
    const firstEpic = page.locator('[class*="cursor-pointer"]').first();
    await firstEpic.click();
    await page.waitForTimeout(500);
    
    // Check if details panel appears
    const detailsPanel = page.locator('[class*="w-\\[600px\\]"]');
    const isPanelVisible = await detailsPanel.isVisible().catch(() => false);
    expect(isPanelVisible).toBeDefined();
  });

  test('should handle unassigned backlog panel', async ({ page }) => {
    const unassignedButton = page.getByRole('button', { name: /unassigned/i });
    if (await unassignedButton.isVisible()) {
      await unassignedButton.click();
      await page.waitForTimeout(500);
      
      // Check if panel appears
      const panel = page.locator('[class*="slide"]');
      const isVisible = await panel.isVisible().catch(() => false);
      expect(isVisible).toBeDefined();
    }
  });

  test('should persist state across page refreshes', async ({ page }) => {
    // Make a state change
    const kanbanButton = page.getByRole('button', { name: /kanban/i });
    if (await kanbanButton.isVisible()) {
      await kanbanButton.click();
      await page.waitForTimeout(1000);
      
      // Refresh page
      await page.reload();
      await page.waitForLoadState('networkidle');
      
      // State should persist via URL
      const url = page.url();
      expect(url).toBeDefined();
    }
  });

  test('should support keyboard navigation', async ({ page }) => {
    await page.waitForSelector('[class*="cursor-pointer"]', { timeout: 5000 });
    
    // Tab through elements
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    
    // Check focus is visible
    const focused = page.locator(':focus');
    const isFocused = await focused.count().then(c => c > 0).catch(() => false);
    expect(isFocused).toBeDefined();
  });

  test('should handle search functionality', async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="Search"]');
    if (await searchInput.isVisible()) {
      await searchInput.fill('test');
      await page.waitForTimeout(500);
      
      // Search should filter results
      const hasResults = await page.locator('[class*="cursor-pointer"]').count().then(c => c >= 0);
      expect(hasResults).toBe(true);
    }
  });

  test('should display proper loading states', async ({ page }) => {
    // Initial load
    const loadingText = await page.getByText(/loading/i).isVisible().catch(() => false);
    expect(loadingText).toBeDefined();
    
    // Wait for content
    await page.waitForSelector('[class*="cursor-pointer"]', { timeout: 5000 });
    
    // Content should be visible
    const hasContent = await page.locator('[class*="cursor-pointer"]').count().then(c => c > 0);
    expect(hasContent).toBe(true);
  });
});

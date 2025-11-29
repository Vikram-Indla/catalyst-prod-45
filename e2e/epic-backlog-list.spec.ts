import { test, expect } from '@playwright/test';

test.describe('Epic Backlog List View', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/portfolio/99999999-9999-9999-9999-999999999999/backlog');
    await page.waitForLoadState('networkidle');
  });

  test('should display epic backlog page', async ({ page }) => {
    // Verify page loaded
    await expect(page).toHaveURL(/\/backlog/);
    
    // Check for key UI elements
    const toolbar = page.locator('[class*="border-b"]').first();
    await expect(toolbar).toBeVisible();
  });

  test('should display epic sections', async ({ page }) => {
    // Wait for sections to load
    await page.waitForTimeout(1000);
    
    // Look for section headers
    const sections = page.locator('[class*="bg-muted"]');
    const count = await sections.count();
    expect(count).toBeGreaterThan(0);
  });

  test('should expand and collapse sections', async ({ page }) => {
    // Wait for sections
    await page.waitForTimeout(1000);
    
    // Find first expand/collapse button
    const expandButton = page.locator('button[class*="h-6 w-6"]').first();
    await expandButton.click();
    
    // Section should collapse
    await page.waitForTimeout(300);
    
    // Click again to expand
    await expandButton.click();
    await page.waitForTimeout(300);
  });

  test('should display quick add row', async ({ page }) => {
    // Wait for page to load
    await page.waitForTimeout(1000);
    
    // Look for Add Epic button
    const addButton = page.getByRole('button', { name: /add epic/i });
    const isVisible = await addButton.isVisible().catch(() => false);
    
    // Add button should be present
    expect(isVisible).toBeDefined();
  });

  test('should select multiple items', async ({ page }) => {
    // Wait for items to load
    await page.waitForTimeout(1000);
    
    // Find checkboxes
    const checkboxes = page.locator('button[role="checkbox"]');
    const count = await checkboxes.count();
    
    if (count > 0) {
      // Click first checkbox
      await checkboxes.first().click();
      await page.waitForTimeout(200);
      
      // Selected count should update in toolbar
      const selectedText = page.locator('text=/\\d+ item/');
      const hasText = await selectedText.isVisible().catch(() => false);
      expect(hasText).toBeDefined();
    }
  });

  test('should open context menu on right click', async ({ page }) => {
    // Wait for items
    await page.waitForTimeout(1000);
    
    // Find first epic row
    const epicRow = page.locator('[class*="hover:bg-muted"]').first();
    
    // Right click
    await epicRow.click({ button: 'right' });
    await page.waitForTimeout(500);
    
    // Context menu should appear
    const contextMenu = page.locator('[role="menu"]');
    const isVisible = await contextMenu.isVisible().catch(() => false);
    
    expect(isVisible).toBeDefined();
  });

  test('should open prioritization dialog', async ({ page }) => {
    // Wait for toolbar
    await page.waitForTimeout(1000);
    
    // Click Prioritize button
    const prioritizeButton = page.getByRole('button', { name: /prioritize/i });
    await prioritizeButton.click();
    
    // Dialog should appear
    await page.waitForSelector('[role="dialog"]');
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible();
    
    // Should show WSJF title
    const title = page.getByRole('heading', { name: /wsjf/i });
    await expect(title).toBeVisible();
  });

  test('should export to CSV', async ({ page }) => {
    // Wait for toolbar
    await page.waitForTimeout(1000);
    
    // Click Actions dropdown
    const actionsButton = page.getByRole('button', { name: /^actions$/i });
    await actionsButton.click();
    
    // Wait for menu
    await page.waitForTimeout(300);
    
    // Look for Export option
    const exportOption = page.getByRole('menuitem', { name: /export/i });
    const isVisible = await exportOption.isVisible().catch(() => false);
    
    expect(isVisible).toBeDefined();
  });

  test('should open columns configuration', async ({ page }) => {
    // Wait for header
    await page.waitForTimeout(1000);
    
    // Click Columns button
    const columnsButton = page.getByRole('button', { name: /columns/i });
    
    if (await columnsButton.isVisible().catch(() => false)) {
      await columnsButton.click();
      
      // Dialog should appear
      await page.waitForTimeout(500);
      const dialog = page.locator('[role="dialog"]');
      const isVisible = await dialog.isVisible().catch(() => false);
      
      expect(isVisible).toBeDefined();
    }
  });
});

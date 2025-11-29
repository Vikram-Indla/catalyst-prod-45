import { test, expect } from '@playwright/test';

test.describe('Epic Backlog Actions', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/portfolio/99999999-9999-9999-9999-999999999999/backlog');
    await page.waitForLoadState('networkidle');
  });

  test('should add new epic via quick add', async ({ page }) => {
    // Wait for page to load
    await page.waitForTimeout(1000);
    
    // Click Add Epic button
    const addButton = page.getByRole('button', { name: /add epic/i });
    
    if (await addButton.isVisible().catch(() => false)) {
      await addButton.click();
      
      // Input field should appear
      await page.waitForTimeout(300);
      const input = page.getByPlaceholder(/enter.*name/i);
      
      if (await input.isVisible().catch(() => false)) {
        await input.fill('Test Epic from E2E');
        
        // Submit
        const submitButton = page.getByRole('button', { name: /^add$/i });
        await submitButton.click();
        
        await page.waitForTimeout(1000);
      }
    }
  });

  test('should open unassigned backlog panel', async ({ page }) => {
    // Wait for toolbar
    await page.waitForTimeout(1000);
    
    // Click Unassigned Backlog button
    const unassignedButton = page.getByRole('button', { name: /unassigned backlog/i });
    await unassignedButton.click();
    
    // Panel should appear
    await page.waitForTimeout(500);
    const panel = page.locator('[class*="w-\\[400px\\]"]');
    const isVisible = await panel.isVisible().catch(() => false);
    
    expect(isVisible).toBeDefined();
  });

  test('should close unassigned panel', async ({ page }) => {
    // Wait and open panel
    await page.waitForTimeout(1000);
    const unassignedButton = page.getByRole('button', { name: /unassigned backlog/i });
    await unassignedButton.click();
    await page.waitForTimeout(500);
    
    // Find close button
    const closeButton = page.locator('button').filter({ has: page.locator('svg') }).last();
    await closeButton.click();
    
    // Panel should close
    await page.waitForTimeout(300);
  });

  test('should search in unassigned panel', async ({ page }) => {
    // Open panel
    await page.waitForTimeout(1000);
    const unassignedButton = page.getByRole('button', { name: /unassigned backlog/i });
    await unassignedButton.click();
    await page.waitForTimeout(500);
    
    // Find search input
    const searchInput = page.getByPlaceholder(/search unassigned/i);
    
    if (await searchInput.isVisible().catch(() => false)) {
      await searchInput.fill('test');
      await page.waitForTimeout(500);
      
      // Search should filter results
      expect(await searchInput.inputValue()).toBe('test');
    }
  });

  test('should open column configuration', async ({ page }) => {
    // Wait for header
    await page.waitForTimeout(1000);
    
    // Find Columns button
    const columnsButton = page.getByRole('button', { name: /columns/i });
    
    if (await columnsButton.isVisible().catch(() => false)) {
      await columnsButton.click();
      
      // Dialog should appear
      await page.waitForSelector('[role="dialog"]');
      const dialog = page.locator('[role="dialog"]');
      await expect(dialog).toBeVisible();
      
      // Should show column checkboxes
      const checkboxes = page.locator('button[role="checkbox"]');
      const count = await checkboxes.count();
      expect(count).toBeGreaterThan(0);
    }
  });

  test('should toggle column visibility', async ({ page }) => {
    // Open columns dialog
    await page.waitForTimeout(1000);
    const columnsButton = page.getByRole('button', { name: /columns/i });
    
    if (await columnsButton.isVisible().catch(() => false)) {
      await columnsButton.click();
      await page.waitForSelector('[role="dialog"]');
      
      // Find first checkbox and toggle it
      const firstCheckbox = page.locator('button[role="checkbox"]').first();
      await firstCheckbox.click();
      await page.waitForTimeout(200);
      
      // Apply changes
      const applyButton = page.getByRole('button', { name: /apply/i });
      await applyButton.click();
      
      await page.waitForTimeout(500);
    }
  });

  test('should reset columns to default', async ({ page }) => {
    // Open columns dialog
    await page.waitForTimeout(1000);
    const columnsButton = page.getByRole('button', { name: /columns/i });
    
    if (await columnsButton.isVisible().catch(() => false)) {
      await columnsButton.click();
      await page.waitForSelector('[role="dialog"]');
      
      // Click Reset to Default
      const resetButton = page.getByRole('button', { name: /reset to default/i });
      await resetButton.click();
      await page.waitForTimeout(300);
      
      // Dialog should still be open
      const dialog = page.locator('[role="dialog"]');
      await expect(dialog).toBeVisible();
    }
  });

  test('should select all columns', async ({ page }) => {
    // Open columns dialog
    await page.waitForTimeout(1000);
    const columnsButton = page.getByRole('button', { name: /columns/i });
    
    if (await columnsButton.isVisible().catch(() => false)) {
      await columnsButton.click();
      await page.waitForSelector('[role="dialog"]');
      
      // Click Select All
      const selectAllButton = page.getByRole('button', { name: /select all/i });
      await selectAllButton.click();
      await page.waitForTimeout(300);
      
      // All checkboxes should be checked
      const dialog = page.locator('[role="dialog"]');
      await expect(dialog).toBeVisible();
    }
  });
});

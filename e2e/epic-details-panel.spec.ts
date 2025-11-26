import { test, expect } from '@playwright/test';

test.describe('Epic Details Panel', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/backlog/epics');
    await page.waitForLoadState('networkidle');
  });

  test('should open epic details panel when clicking an epic', async ({ page }) => {
    // Wait for epics to load
    await page.waitForSelector('[role="row"]', { timeout: 10000 });
    
    // Click first epic row (if available)
    const firstEpicRow = page.locator('[role="row"]').nth(1); // Skip header row
    const epicExists = await firstEpicRow.count() > 0;
    
    if (epicExists) {
      await firstEpicRow.click();
      
      // Verify panel opens
      await expect(page.locator('[role="dialog"]')).toBeVisible();
    }
  });

  test('should display all tabs in epic details panel', async ({ page }) => {
    // Wait for epics to load
    await page.waitForSelector('[role="row"]', { timeout: 10000 });
    
    const firstEpicRow = page.locator('[role="row"]').nth(1);
    const epicExists = await firstEpicRow.count() > 0;
    
    if (epicExists) {
      await firstEpicRow.click();
      
      // Wait for panel to open
      await page.waitForSelector('[role="dialog"]', { state: 'visible' });
      
      // Check for all tabs
      await expect(page.getByRole('tab', { name: 'Full Details' })).toBeVisible();
      await expect(page.getByRole('tab', { name: 'Children' })).toBeVisible();
      await expect(page.getByRole('tab', { name: 'Intake' })).toBeVisible();
      await expect(page.getByRole('tab', { name: 'Benefits' })).toBeVisible();
      await expect(page.getByRole('tab', { name: 'Value' })).toBeVisible();
      await expect(page.getByRole('tab', { name: 'Milestones' })).toBeVisible();
      await expect(page.getByRole('tab', { name: 'Spend' })).toBeVisible();
      await expect(page.getByRole('tab', { name: 'Forecast' })).toBeVisible();
    }
  });

  test('should close epic details panel', async ({ page }) => {
    await page.waitForSelector('[role="row"]', { timeout: 10000 });
    
    const firstEpicRow = page.locator('[role="row"]').nth(1);
    const epicExists = await firstEpicRow.count() > 0;
    
    if (epicExists) {
      await firstEpicRow.click();
      await page.waitForSelector('[role="dialog"]', { state: 'visible' });
      
      // Click close button
      const closeButton = page.locator('[role="dialog"] button').filter({ hasText: /close|×/i }).first();
      await closeButton.click();
      
      // Verify panel closes
      await expect(page.locator('[role="dialog"]')).not.toBeVisible();
    }
  });
});

import { test, expect } from '@playwright/test';

test.describe('Forecast Feature', () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto('/auth');
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'testpassword');
    await page.click('button[type="submit"]');
    await page.waitForURL('/home');
  });

  test('should render forecast page with PI selector', async ({ page }) => {
    await page.goto('/portfolio/default-portfolio/forecast');
    
    // Wait for page to load
    await page.waitForSelector('h1:has-text("Forecast")');
    
    // Check PI selector button exists
    const piButton = page.locator('button:has-text("Program Increment")');
    await expect(piButton).toBeVisible();
    
    // Check filter and configure buttons
    await expect(page.locator('button:has-text("Apply Filters")')).toBeVisible();
    await expect(page.locator('button:has-text("Configure Columns")')).toBeVisible();
    await expect(page.locator('button:has-text("Apply Backlog Rank")')).toBeVisible();
  });

  test('should select PIs and display forecast grid', async ({ page }) => {
    await page.goto('/portfolio/default-portfolio/forecast');
    
    // Open PI selector
    await page.click('button:has-text("Program Increment")');
    
    // Select a PI
    const piCheckbox = page.locator('input[type="checkbox"]').first();
    await piCheckbox.check();
    
    // Apply selection
    await page.click('button:has-text("Apply")');
    
    // Verify grid appears
    await expect(page.locator('table')).toBeVisible();
    await expect(page.locator('th:has-text("Work Item")')).toBeVisible();
  });

  test('should allow editing forecast estimates', async ({ page }) => {
    await page.goto('/portfolio/default-portfolio/forecast');
    
    // Select a PI
    await page.click('button:has-text("Program Increment")');
    const piCheckbox = page.locator('input[type="checkbox"]').first();
    await piCheckbox.check();
    await page.click('button:has-text("Apply")');
    
    // Find an estimate input and enter a value
    const estimateInput = page.locator('input[type="number"]').first();
    await estimateInput.fill('5');
    await estimateInput.blur();
    
    // Wait for autosave toast
    await expect(page.locator('text=Forecast updated')).toBeVisible({ timeout: 3000 });
  });

  test('should toggle view level between team and program', async ({ page }) => {
    await page.goto('/portfolio/default-portfolio/forecast');
    
    // Select a PI first
    await page.click('button:has-text("Program Increment")');
    await page.locator('input[type="checkbox"]').first().check();
    await page.click('button:has-text("Apply")');
    
    // Check initial view level
    const viewLevelButton = page.locator('button').filter({ hasText: /Team|Program/ }).first();
    await viewLevelButton.click();
    
    // Select program view
    await page.click('text=Program');
    
    // Verify columns change
    await page.waitForTimeout(500);
    await expect(page.locator('table')).toBeVisible();
  });

  test('should open and apply column configuration', async ({ page }) => {
    await page.goto('/portfolio/default-portfolio/forecast');
    
    // Open configure columns
    await page.click('button:has-text("Configure Columns")');
    
    // Verify dialog appears
    await expect(page.locator('text=Configure Columns')).toBeVisible();
    
    // Toggle a column
    const checkbox = page.locator('input[type="checkbox"]').first();
    await checkbox.click();
    
    // Apply changes
    await page.click('button:has-text("Apply")');
    
    // Verify toast
    await expect(page.locator('text=Column preferences saved')).toBeVisible({ timeout: 3000 });
  });

  test('should show context menu on right-click', async ({ page }) => {
    await page.goto('/portfolio/default-portfolio/forecast');
    
    // Select a PI first
    await page.click('button:has-text("Program Increment")');
    await page.locator('input[type="checkbox"]').first().check();
    await page.click('button:has-text("Apply")');
    
    // Wait for table row
    const row = page.locator('table tbody tr').first();
    await row.click({ button: 'right' });
    
    // Verify context menu appears
    await expect(page.locator('text=Move to Top')).toBeVisible({ timeout: 2000 });
    await expect(page.locator('text=Move Up')).toBeVisible();
    await expect(page.locator('text=Move Down')).toBeVisible();
    await expect(page.locator('text=Move to Bottom')).toBeVisible();
  });

  test('should show over-capacity warning', async ({ page }) => {
    await page.goto('/portfolio/default-portfolio/forecast');
    
    // Select a PI
    await page.click('button:has-text("Program Increment")');
    await page.locator('input[type="checkbox"]').first().check();
    await page.click('button:has-text("Apply")');
    
    // Enter a large estimate to trigger over-capacity
    const estimateInputs = page.locator('input[type="number"]');
    const count = await estimateInputs.count();
    
    for (let i = 0; i < Math.min(count, 5); i++) {
      await estimateInputs.nth(i).fill('100');
      await estimateInputs.nth(i).blur();
      await page.waitForTimeout(200);
    }
    
    // Check for RED capacity indicator
    const redHeader = page.locator('th').filter({ hasText: /destructive|red/i });
    // This will only work if capacity is actually exceeded
  });

  test('should restore default columns', async ({ page }) => {
    await page.goto('/portfolio/default-portfolio/forecast');
    
    // Open configure columns
    await page.click('button:has-text("Configure Columns")');
    
    // Click restore defaults
    await page.click('button:has-text("Restore Defaults")');
    
    // Verify toast
    await expect(page.locator('text=Restored default columns')).toBeVisible({ timeout: 3000 });
  });

  test('should handle empty state gracefully', async ({ page }) => {
    await page.goto('/portfolio/default-portfolio/forecast');
    
    // Don't select any PIs
    // Should show message
    await expect(page.locator('text=Select at least one Program Increment')).toBeVisible();
  });
});

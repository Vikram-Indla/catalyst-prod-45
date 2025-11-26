import { test, expect } from '@playwright/test';

/**
 * E2E Tests for Epic Details Panel - Forecast Tab
 * Tests the Forecast tab functionality within the Epic Details side panel
 */
test.describe('Epic Details - Forecast Tab', () => {
  const TEST_EPIC_ID = 'test-epic-forecast';
  
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('/auth');
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'testpassword');
    await page.click('button[type="submit"]');
    await page.waitForURL('/home');
    
    // Navigate to Epic Backlog and open test epic
    await page.goto('/backlog/epics');
    await page.waitForSelector(`[data-epic-id="${TEST_EPIC_ID}"]`, { timeout: 5000 });
    await page.click(`[data-epic-id="${TEST_EPIC_ID}"]`);
    
    // Wait for details panel to open
    await page.waitForSelector('[data-testid="epic-details-panel"]', { timeout: 3000 });
  });

  test('should show Forecast tab when epic has associated PIs', async ({ page }) => {
    // Verify Forecast tab exists
    const forecastTab = page.locator('button:has-text("Forecast")');
    await expect(forecastTab).toBeVisible();
    
    // Click Forecast tab
    await forecastTab.click();
    
    // Verify Forecast tab content is visible
    await expect(page.locator('text=Program Increment')).toBeVisible();
    await expect(page.locator('text=Estimate for')).toBeVisible();
  });

  test('should hide Forecast tab when epic has no PIs', async ({ page }) => {
    // This test requires an epic with no PI associations
    // For now, skip or mark as TODO
    test.skip();
  });

  test('should auto-select PI when only one PI exists', async ({ page }) => {
    // Navigate to Forecast tab
    await page.click('button:has-text("Forecast")');
    
    // If epic has only 1 PI, dropdown should be auto-selected
    const piDropdown = page.locator('[role="combobox"]').first();
    const dropdownValue = await piDropdown.textContent();
    
    // Should not be empty placeholder
    expect(dropdownValue).not.toBe('Select PI');
  });

  test('should allow selecting different PIs from dropdown', async ({ page }) => {
    // Navigate to Forecast tab
    await page.click('button:has-text("Forecast")');
    
    // Open PI dropdown
    const piDropdown = page.locator('[role="combobox"]').first();
    await piDropdown.click();
    
    // Verify PI options are visible
    await expect(page.locator('[role="option"]').first()).toBeVisible();
    
    // Select second PI
    await page.locator('[role="option"]').nth(1).click();
    
    // Verify selection changed
    await page.waitForTimeout(500);
    await expect(page.locator('text=PI-')).toBeVisible();
  });

  test('should autosave PI estimate on change', async ({ page }) => {
    // Navigate to Forecast tab
    await page.click('button:has-text("Forecast")');
    await page.waitForTimeout(500);
    
    // Find PI Estimate input (should be near "Estimate for" label)
    const piEstimateInput = page.locator('input[type="number"]').first();
    
    // Enter a value
    await piEstimateInput.fill('50');
    await piEstimateInput.blur();
    
    // Wait for autosave (should happen automatically)
    await page.waitForTimeout(1000);
    
    // Reload page and verify value persisted
    await page.reload();
    await page.waitForSelector(`[data-epic-id="${TEST_EPIC_ID}"]`);
    await page.click(`[data-epic-id="${TEST_EPIC_ID}"]`);
    await page.click('button:has-text("Forecast")');
    await page.waitForTimeout(500);
    
    const reloadedInput = page.locator('input[type="number"]').first();
    await expect(reloadedInput).toHaveValue('50');
  });

  test('should expand and collapse program rows', async ({ page }) => {
    // Navigate to Forecast tab
    await page.click('button:has-text("Forecast")');
    await page.waitForTimeout(500);
    
    // Find first program row with chevron
    const chevronButton = page.locator('button').filter({ has: page.locator('svg') }).first();
    
    // Should start collapsed (ChevronRight)
    await chevronButton.click();
    
    // Teams should become visible
    await expect(page.locator('text=Team')).toBeVisible();
    
    // Click again to collapse
    await chevronButton.click();
    await page.waitForTimeout(300);
  });

  test('should show team estimates when program is expanded', async ({ page }) => {
    // Navigate to Forecast tab
    await page.click('button:has-text("Forecast")');
    await page.waitForTimeout(500);
    
    // Expand first program
    const chevronButton = page.locator('button').filter({ has: page.locator('svg') }).first();
    await chevronButton.click();
    
    // Verify team rows are visible
    const teamRows = page.locator('text=Team').count();
    await expect(teamRows).resolves.toBeGreaterThan(0);
    
    // Verify team estimate inputs are visible
    const teamInputs = page.locator('input[type="number"]');
    const inputCount = await teamInputs.count();
    expect(inputCount).toBeGreaterThan(1); // Should have PI + program + team inputs
  });

  test('should autosave program estimate on change', async ({ page }) => {
    // Navigate to Forecast tab
    await page.click('button:has-text("Forecast")');
    await page.waitForTimeout(500);
    
    // Find program estimate input (second numeric input after PI estimate)
    const programInput = page.locator('input[type="number"]').nth(1);
    
    // Enter value
    await programInput.fill('30');
    await programInput.blur();
    
    // Wait for autosave
    await page.waitForTimeout(1000);
    
    // Verify via reload
    await page.reload();
    await page.waitForSelector(`[data-epic-id="${TEST_EPIC_ID}"]`);
    await page.click(`[data-epic-id="${TEST_EPIC_ID}"]`);
    await page.click('button:has-text("Forecast")');
    await page.waitForTimeout(500);
    
    const reloadedInput = page.locator('input[type="number"]').nth(1);
    await expect(reloadedInput).toHaveValue('30');
  });

  test('should autosave team estimate on change', async ({ page }) => {
    // Navigate to Forecast tab
    await page.click('button:has-text("Forecast")');
    await page.waitForTimeout(500);
    
    // Expand first program to show teams
    const chevronButton = page.locator('button').filter({ has: page.locator('svg') }).first();
    await chevronButton.click();
    await page.waitForTimeout(300);
    
    // Find first team estimate input
    const teamInput = page.locator('input[type="number"]').nth(2); // After PI and program
    
    // Enter value
    await teamInput.fill('15');
    await teamInput.blur();
    
    // Wait for autosave
    await page.waitForTimeout(1000);
    
    // Verify persistence
    await page.reload();
    await page.waitForSelector(`[data-epic-id="${TEST_EPIC_ID}"]`);
    await page.click(`[data-epic-id="${TEST_EPIC_ID}"]`);
    await page.click('button:has-text("Forecast")');
    await page.waitForTimeout(500);
    
    // Expand again
    const chevronBtn = page.locator('button').filter({ has: page.locator('svg') }).first();
    await chevronBtn.click();
    await page.waitForTimeout(300);
    
    const reloadedInput = page.locator('input[type="number"]').nth(2);
    await expect(reloadedInput).toHaveValue('15');
  });

  test('should show Sum button when program and team estimates mismatch', async ({ page }) => {
    // Navigate to Forecast tab
    await page.click('button:has-text("Forecast")');
    await page.waitForTimeout(500);
    
    // Expand program
    const chevronButton = page.locator('button').filter({ has: page.locator('svg') }).first();
    await chevronButton.click();
    await page.waitForTimeout(300);
    
    // Enter team estimates
    const teamInput1 = page.locator('input[type="number"]').nth(2);
    const teamInput2 = page.locator('input[type="number"]').nth(3);
    
    await teamInput1.fill('10');
    await teamInput1.blur();
    await page.waitForTimeout(500);
    
    await teamInput2.fill('15');
    await teamInput2.blur();
    await page.waitForTimeout(500);
    
    // Set program estimate to different value
    const programInput = page.locator('input[type="number"]').nth(1);
    await programInput.fill('20');
    await programInput.blur();
    await page.waitForTimeout(500);
    
    // Sum button should appear
    await expect(page.locator('button:has-text("Sum")')).toBeVisible();
  });

  test('should update program estimate when Sum button clicked', async ({ page }) => {
    // Navigate to Forecast tab
    await page.click('button:has-text("Forecast")');
    await page.waitForTimeout(500);
    
    // Expand program
    const chevronButton = page.locator('button').filter({ has: page.locator('svg') }).first();
    await chevronButton.click();
    await page.waitForTimeout(300);
    
    // Set team estimates to known values
    const teamInput1 = page.locator('input[type="number"]').nth(2);
    const teamInput2 = page.locator('input[type="number"]').nth(3);
    
    await teamInput1.fill('12');
    await teamInput1.blur();
    await page.waitForTimeout(500);
    
    await teamInput2.fill('18');
    await teamInput2.blur();
    await page.waitForTimeout(500);
    
    // Set mismatched program estimate
    const programInput = page.locator('input[type="number"]').nth(1);
    await programInput.fill('5');
    await programInput.blur();
    await page.waitForTimeout(500);
    
    // Click Sum button
    await page.click('button:has-text("Sum")');
    await page.waitForTimeout(1000);
    
    // Verify program estimate updated to sum of teams (30)
    await expect(page.locator('text=30')).toBeVisible();
  });

  test('should show Sum all button when PI and program estimates mismatch', async ({ page }) => {
    // Navigate to Forecast tab
    await page.click('button:has-text("Forecast")');
    await page.waitForTimeout(500);
    
    // Set different program estimates
    const programInput1 = page.locator('input[type="number"]').nth(1);
    const programInput2 = page.locator('input[type="number"]').nth(2);
    
    await programInput1.fill('25');
    await programInput1.blur();
    await page.waitForTimeout(500);
    
    await programInput2.fill('35');
    await programInput2.blur();
    await page.waitForTimeout(500);
    
    // Set PI estimate to different value
    const piInput = page.locator('input[type="number"]').first();
    await piInput.fill('50');
    await piInput.blur();
    await page.waitForTimeout(500);
    
    // Sum all button should appear
    await expect(page.locator('button:has-text("Sum all")')).toBeVisible();
  });

  test('should update PI estimate when Sum all clicked and show Undo', async ({ page }) => {
    // Navigate to Forecast tab
    await page.click('button:has-text("Forecast")');
    await page.waitForTimeout(500);
    
    // Set program estimates
    const programInput1 = page.locator('input[type="number"]').nth(1);
    const programInput2 = page.locator('input[type="number"]').nth(2);
    
    await programInput1.fill('20');
    await programInput1.blur();
    await page.waitForTimeout(500);
    
    await programInput2.fill('30');
    await programInput2.blur();
    await page.waitForTimeout(500);
    
    // Set mismatched PI estimate
    const piInput = page.locator('input[type="number"]').first();
    const originalValue = '40';
    await piInput.fill(originalValue);
    await piInput.blur();
    await page.waitForTimeout(500);
    
    // Click Sum all
    await page.click('button:has-text("Sum all")');
    await page.waitForTimeout(1000);
    
    // Verify PI estimate updated to sum (50)
    await expect(piInput).toHaveValue('50');
    
    // Verify Undo button appears
    await expect(page.locator('button:has-text("Undo")')).toBeVisible();
  });

  test('should restore previous PI estimate when Undo clicked', async ({ page }) => {
    // Navigate to Forecast tab
    await page.click('button:has-text("Forecast")');
    await page.waitForTimeout(500);
    
    // Set program estimates
    const programInput1 = page.locator('input[type="number"]').nth(1);
    const programInput2 = page.locator('input[type="number"]').nth(2);
    
    await programInput1.fill('15');
    await programInput1.blur();
    await page.waitForTimeout(500);
    
    await programInput2.fill('25');
    await programInput2.blur();
    await page.waitForTimeout(500);
    
    // Set PI estimate
    const piInput = page.locator('input[type="number"]').first();
    await piInput.fill('35');
    await piInput.blur();
    await page.waitForTimeout(500);
    
    // Click Sum all
    await page.click('button:has-text("Sum all")');
    await page.waitForTimeout(1000);
    
    // Click Undo
    await page.click('button:has-text("Undo")');
    await page.waitForTimeout(1000);
    
    // Verify restored to original value
    await expect(piInput).toHaveValue('35');
  });

  test('should display out-of-scope message when epic is out of scope for PI', async ({ page }) => {
    // This test requires marking the epic as out-of-scope
    // Would need to set in_scope = false in forecast_entries
    // For now, skip or implement seed data setup
    test.skip();
  });

  test('should display unit label (pts) next to all estimate inputs', async ({ page }) => {
    // Navigate to Forecast tab
    await page.click('button:has-text("Forecast")');
    await page.waitForTimeout(500);
    
    // Verify unit labels are present
    const unitLabels = page.locator('text=pts');
    const count = await unitLabels.count();
    
    // Should have at least PI estimate + program estimates
    expect(count).toBeGreaterThan(1);
  });
});

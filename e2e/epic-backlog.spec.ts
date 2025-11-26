import { test, expect } from '@playwright/test';

test.describe('Epic Backlog', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to Epic Backlog page
    await page.goto('/backlog/epics');
    // Wait for page to load
    await page.waitForLoadState('networkidle');
  });

  test('should display Epic Backlog page with correct layout', async ({ page }) => {
    // Check page title
    await expect(page.getByRole('heading', { name: 'Epic Backlog' })).toBeVisible();
    
    // Check for two-column layout
    await expect(page.getByRole('heading', { name: /Epics for/ })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Unassigned Backlog' })).toBeVisible();
  });

  test('should display sidebar with correct navigation items', async ({ page }) => {
    // Check sidebar is visible
    await expect(page.getByText('Portfolio Room')).toBeVisible();
    await expect(page.getByText('Backlog')).toBeVisible();
    await expect(page.getByText('Roadmaps')).toBeVisible();
    await expect(page.getByText('Objective tree')).toBeVisible();
    
    // Verify "Epics" is NOT in sidebar (only "Backlog" should be there)
    const epicsInSidebar = page.locator('aside').getByText('Epics', { exact: true });
    await expect(epicsInSidebar).not.toBeVisible();
  });

  test('should display top toolbar buttons', async ({ page }) => {
    // Check for Orphan Objects button
    await expect(page.getByRole('button', { name: /Orphan Objects/ })).toBeVisible();
    
    // Check for Columns Shown button
    await expect(page.getByRole('button', { name: /Columns Shown/ })).toBeVisible();
    
    // Check for Filters button
    await expect(page.getByRole('button', { name: /Filters/ })).toBeVisible();
  });

  test('should display Theme Backlog and Backlog tabs', async ({ page }) => {
    // Check for tabs
    await expect(page.getByRole('tab', { name: 'Theme Backlog' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Backlog' })).toBeVisible();
  });

  test('should display section headers with item counts', async ({ page }) => {
    // Check for "Total Items" text in both sections
    const totalItemsElements = page.getByText(/Total Items:/);
    await expect(totalItemsElements).toHaveCount(2); // One for each section
  });

  test('should display action buttons in Epics section', async ({ page }) => {
    // Within the Epics for PI section
    const epicsSection = page.locator('div').filter({ hasText: /Epics for/ }).first();
    
    // Check for Prioritize button
    await expect(epicsSection.getByRole('button', { name: /Prioritize/ })).toBeVisible();
    
    // Check for Export button
    await expect(epicsSection.getByRole('button', { name: /Export/ })).toBeVisible();
  });

  test('should display action buttons in Unassigned Backlog section', async ({ page }) => {
    // Within the Unassigned Backlog section
    const unassignedSection = page.locator('div').filter({ hasText: 'Unassigned Backlog' }).first();
    
    // Check for Prioritize button
    await expect(unassignedSection.getByRole('button', { name: /Prioritize/ })).toBeVisible();
    
    // Check for Export button
    await expect(unassignedSection.getByRole('button', { name: /Export/ })).toBeVisible();
  });

  test('should toggle between List and Kanban views', async ({ page }) => {
    // Check List view is default
    await expect(page.getByRole('tab', { name: 'List', exact: true })).toBeVisible();
    
    // Click Kanban tab
    await page.getByRole('tab', { name: 'Kanban' }).click();
    
    // Verify Kanban subviews appear
    await expect(page.getByRole('tab', { name: 'State' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Process' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Column' })).toBeVisible();
  });

  test('should open filters dialog', async ({ page }) => {
    // Click Filters button
    await page.getByRole('button', { name: /Filters/ }).click();
    
    // Verify dialog opens (check for dialog content)
    await expect(page.getByRole('dialog')).toBeVisible();
  });

  test('should open columns dialog', async ({ page }) => {
    // Click Columns Shown button
    await page.getByRole('button', { name: /Columns Shown/ }).click();
    
    // Verify dialog opens
    await expect(page.getByRole('dialog')).toBeVisible();
  });

  test('should filter epics by portfolio', async ({ page }) => {
    // Select a portfolio from dropdown
    const portfolioSelect = page.locator('button[role="combobox"]').filter({ hasText: 'Select Portfolio' });
    await portfolioSelect.click();
    
    // Wait for options to appear
    await page.waitForSelector('[role="option"]');
    
    // Select first portfolio option
    await page.locator('[role="option"]').first().click();
    
    // Verify selection was made (portfolio dropdown should show selected value)
    await expect(portfolioSelect).not.toContainText('Select Portfolio');
  });

  test('should collapse and expand sidebar', async ({ page }) => {
    // Find sidebar
    const sidebar = page.locator('aside').first();
    
    // Check initial width (expanded)
    const initialBox = await sidebar.boundingBox();
    expect(initialBox?.width).toBeGreaterThan(200);
    
    // Click collapse button
    await page.locator('button[aria-label*="Collapse"]').click();
    
    // Wait for animation
    await page.waitForTimeout(400);
    
    // Check collapsed width
    const collapsedBox = await sidebar.boundingBox();
    expect(collapsedBox?.width).toBeLessThan(100);
    
    // Expand again
    await page.locator('button[aria-label*="Expand"]').click();
    await page.waitForTimeout(400);
    
    // Verify expanded
    const expandedBox = await sidebar.boundingBox();
    expect(expandedBox?.width).toBeGreaterThan(200);
  });
});

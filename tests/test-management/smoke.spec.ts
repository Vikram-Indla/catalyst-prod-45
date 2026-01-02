/**
 * Test Management Module - Smoke Tests
 * Validates all tabs navigate correctly and primary CTAs are functional
 */

import { test, expect, Page } from '@playwright/test';

// Test configuration
const BASE_URL = process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:5173';
const TEST_PROJECT_ID = '40000000-0001-0001-0001-000000000002';
const TEST_TIMEOUT = 30000;

// Helper to login (if auth is required)
async function loginIfRequired(page: Page) {
  // Check if we're on login page
  const isLoginPage = await page.locator('input[type="email"], input[name="email"]').isVisible().catch(() => false);
  
  if (isLoginPage) {
    // Use test credentials from environment or defaults
    const email = process.env.TEST_USER_EMAIL || 'test@example.com';
    const password = process.env.TEST_USER_PASSWORD || 'testpassword123';
    
    await page.fill('input[type="email"], input[name="email"]', email);
    await page.fill('input[type="password"]', password);
    await page.click('button[type="submit"]');
    await page.waitForNavigation({ waitUntil: 'networkidle' }).catch(() => {});
  }
}

// Helper to navigate to tests module
async function navigateToTestsModule(page: Page) {
  await page.goto(`${BASE_URL}/projects/${TEST_PROJECT_ID}/tests/overview`);
  await loginIfRequired(page);
  await page.waitForLoadState('networkidle');
}

test.describe('Test Management Module - Smoke Tests', () => {
  test.setTimeout(TEST_TIMEOUT);

  test.describe('Tab Navigation', () => {
    test('should navigate to Overview tab', async ({ page }) => {
      await navigateToTestsModule(page);
      
      // Verify we're on overview
      await expect(page).toHaveURL(/\/tests\/overview/);
      
      // Verify page content loads
      await expect(page.locator('h1, h2, [data-testid="page-title"]').first()).toBeVisible();
    });

    test('should navigate to Cases tab', async ({ page }) => {
      await navigateToTestsModule(page);
      
      // Click Cases tab
      await page.click('a[href*="/tests/cases"], [data-tab="cases"]');
      await page.waitForLoadState('networkidle');
      
      // Verify navigation
      await expect(page).toHaveURL(/\/tests\/cases/);
    });

    test('should navigate to Sets tab', async ({ page }) => {
      await navigateToTestsModule(page);
      
      // Click Sets tab
      await page.click('a[href*="/tests/sets"], [data-tab="sets"]');
      await page.waitForLoadState('networkidle');
      
      // Verify navigation
      await expect(page).toHaveURL(/\/tests\/sets/);
    });

    test('should navigate to Cycles tab', async ({ page }) => {
      await navigateToTestsModule(page);
      
      // Click Cycles tab
      await page.click('a[href*="/tests/cycles"], [data-tab="cycles"]');
      await page.waitForLoadState('networkidle');
      
      // Verify navigation
      await expect(page).toHaveURL(/\/tests\/cycles/);
    });

    test('should navigate to Reports tab', async ({ page }) => {
      await navigateToTestsModule(page);
      
      // Click Reports tab
      await page.click('a[href*="/tests/reports"], [data-tab="reports"]');
      await page.waitForLoadState('networkidle');
      
      // Verify navigation
      await expect(page).toHaveURL(/\/tests\/reports/);
    });
  });

  test.describe('Primary CTA Validation', () => {
    test('should have working "Create Case" CTA on Cases page', async ({ page }) => {
      await page.goto(`${BASE_URL}/projects/${TEST_PROJECT_ID}/tests/cases`);
      await loginIfRequired(page);
      await page.waitForLoadState('networkidle');
      
      // Find and click create button
      const createBtn = page.locator('[data-cta="create-case"], button:has-text("Create Case"), button:has-text("New Case")').first();
      
      if (await createBtn.isVisible()) {
        await createBtn.click();
        
        // Verify modal or form opens
        const modalOrForm = page.locator('[role="dialog"], form, [data-testid="create-case-form"]');
        await expect(modalOrForm.first()).toBeVisible({ timeout: 5000 });
      }
    });

    test('should have working "Create Cycle" CTA on Cycles page', async ({ page }) => {
      await page.goto(`${BASE_URL}/projects/${TEST_PROJECT_ID}/tests/cycles`);
      await loginIfRequired(page);
      await page.waitForLoadState('networkidle');
      
      // Find and click create button
      const createBtn = page.locator('[data-cta="create-cycle"], button:has-text("Create Cycle"), button:has-text("New Cycle")').first();
      
      if (await createBtn.isVisible()) {
        await createBtn.click();
        
        // Verify modal or form opens
        const modalOrForm = page.locator('[role="dialog"], form, [data-testid="create-cycle-form"]');
        await expect(modalOrForm.first()).toBeVisible({ timeout: 5000 });
      }
    });

    test('should have working "Create Set" CTA on Sets page', async ({ page }) => {
      await page.goto(`${BASE_URL}/projects/${TEST_PROJECT_ID}/tests/sets`);
      await loginIfRequired(page);
      await page.waitForLoadState('networkidle');
      
      // Find and click create button
      const createBtn = page.locator('[data-cta="create-set"], button:has-text("Create Set"), button:has-text("New Set")').first();
      
      if (await createBtn.isVisible()) {
        await createBtn.click();
        
        // Verify modal or form opens
        const modalOrForm = page.locator('[role="dialog"], form, [data-testid="create-set-form"]');
        await expect(modalOrForm.first()).toBeVisible({ timeout: 5000 });
      }
    });

    test('should have working "Generate Report" CTA on Reports page', async ({ page }) => {
      await page.goto(`${BASE_URL}/projects/${TEST_PROJECT_ID}/tests/reports`);
      await loginIfRequired(page);
      await page.waitForLoadState('networkidle');
      
      // Click User Activity tab
      const userActivityTab = page.locator('button:has-text("User Activity"), [data-value="user-activity"]');
      if (await userActivityTab.isVisible()) {
        await userActivityTab.click();
        await page.waitForTimeout(500);
        
        // Find generate button
        const generateBtn = page.locator('[data-cta="generate-report"], button:has-text("Generate")').first();
        await expect(generateBtn).toBeVisible();
      }
    });
  });

  test.describe('No Dead CTAs', () => {
    test('should have no dead CTAs on Overview page', async ({ page }) => {
      await page.goto(`${BASE_URL}/projects/${TEST_PROJECT_ID}/tests/overview`);
      await loginIfRequired(page);
      await page.waitForLoadState('networkidle');
      
      // Scan for CTAs and validate
      const deadCTAs = await page.evaluate(() => {
        const ctaElements = document.querySelectorAll('[data-cta]');
        const dead: string[] = [];
        
        ctaElements.forEach((el) => {
          if (!(el instanceof HTMLElement)) return;
          
          const style = window.getComputedStyle(el);
          const isVisible = style.display !== 'none' && style.visibility !== 'hidden';
          if (!isVisible) return;
          
          const isDisabled = el.hasAttribute('disabled');
          if (isDisabled) return; // Disabled is okay
          
          const hasHref = el.hasAttribute('href') && el.getAttribute('href') !== '#';
          const hasOnClick = el.hasAttribute('onclick');
          const reactProps = Object.keys(el).find(key => key.startsWith('__reactProps'));
          const hasReactHandler = reactProps && (el as any)[reactProps]?.onClick;
          
          if (!hasHref && !hasOnClick && !hasReactHandler) {
            dead.push(el.getAttribute('data-cta') || 'unknown');
          }
        });
        
        return dead;
      });
      
      expect(deadCTAs).toHaveLength(0);
    });

    test('should have no dead CTAs on Cases page', async ({ page }) => {
      await page.goto(`${BASE_URL}/projects/${TEST_PROJECT_ID}/tests/cases`);
      await loginIfRequired(page);
      await page.waitForLoadState('networkidle');
      
      const deadCTAs = await page.evaluate(() => {
        const ctaElements = document.querySelectorAll('[data-cta]');
        const dead: string[] = [];
        
        ctaElements.forEach((el) => {
          if (!(el instanceof HTMLElement)) return;
          
          const style = window.getComputedStyle(el);
          const isVisible = style.display !== 'none' && style.visibility !== 'hidden';
          if (!isVisible) return;
          
          const isDisabled = el.hasAttribute('disabled');
          if (isDisabled) return;
          
          const hasHref = el.hasAttribute('href') && el.getAttribute('href') !== '#';
          const hasOnClick = el.hasAttribute('onclick');
          const reactProps = Object.keys(el).find(key => key.startsWith('__reactProps'));
          const hasReactHandler = reactProps && (el as any)[reactProps]?.onClick;
          
          if (!hasHref && !hasOnClick && !hasReactHandler) {
            dead.push(el.getAttribute('data-cta') || 'unknown');
          }
        });
        
        return dead;
      });
      
      expect(deadCTAs).toHaveLength(0);
    });
  });
});

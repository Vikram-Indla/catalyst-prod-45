/**
 * Playwright config — Catalyst ADS visual-regression + a11y gate.
 *
 * Separate from the main playwright.config.ts (which runs parity tests
 * against the running Catalyst app on :5173). This config exclusively
 * drives Storybook at :6006 and must never share a webServer with the
 * main config — mixing them causes port collisions and confusing failures.
 *
 * Two projects share one browser matrix but target different test globs:
 *
 *   • visual  → tests/ads/visual/**  pixel-diff every published Storybook
 *                                    story against its baseline PNG.
 *                                    Threshold 0.01 (per-pixel colour
 *                                    distance, 0–1 range) is tight enough
 *                                    to catch NOCTURNE token drift but
 *                                    loose enough to survive antialiasing
 *                                    jitter between CI and local runs.
 *
 *   • a11y    → tests/ads/a11y/**    runs axe-core (WCAG 2.1 AA ruleset)
 *                                    over every story. Any violation fails
 *                                    the run — this is CG-12 from the
 *                                    Catalyst Goals.
 *
 * The webServer block boots Storybook dev on :6006 and reuses an existing
 * instance if one is already running locally, so you can leave
 * `npm run storybook` open and iterate in a second terminal.
 *
 * In CI, prefer building the static Storybook and serving it with a plain
 * static server for faster first-paint; the dev server works but is slower.
 */
import { defineConfig, devices } from '@playwright/test';

const STORYBOOK_URL = 'http://127.0.0.1:6006';

export default defineConfig({
  testDir: './tests/ads',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI
    ? [['github'], ['html', { open: 'never', outputFolder: 'playwright-report/ads' }]]
    : [['list'], ['html', { open: 'never', outputFolder: 'playwright-report/ads' }]],
  timeout: 30_000,
  outputDir: 'test-results/ads',

  expect: {
    // Pin visual-regression tolerance at 0.01 per-pixel colour distance
    // (0 = byte-identical; 1 = any colour allowed). This is the Catalyst
    // ADS contract — see docs/ads/visual-regression.md for rationale.
    toHaveScreenshot: {
      threshold: 0.01,
      maxDiffPixelRatio: 0.001,
      animations: 'disabled',
      caret: 'hide',
    },
  },

  use: {
    baseURL: STORYBOOK_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    viewport: { width: 1280, height: 720 },
  },

  projects: [
    {
      name: 'visual',
      testMatch: /tests\/ads\/visual\/.*\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 },
      },
    },
    {
      name: 'visual-webkit',
      testMatch: /tests\/ads\/visual\/.*\.spec\.ts/,
      use: {
        ...devices['Desktop Safari'],
        viewport: { width: 1280, height: 720 },
      },
    },
    {
      name: 'a11y',
      testMatch: /tests\/ads\/a11y\/.*\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 },
      },
    },
  ],

  webServer: {
    command: 'npm run storybook -- --ci --quiet',
    url: STORYBOOK_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
});

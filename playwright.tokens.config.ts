/**
 * Playwright config — rendered token-resolution harness
 * (CAT-DS-TOKEN-POISON-20260710-001).
 *
 * Separate from playwright.config.ts (app on :5173), playwright.ads.config.ts
 * (Storybook on :6006) and playwright.chat.config.ts. This config exclusively
 * drives the standalone token fixture app (scripts/token-fixtures) on :4179 —
 * never share a webServer with the other configs.
 *
 * The spec (tests/tokens/token-resolution.spec.ts) asserts, in BOTH color
 * modes, that every rendered token sample's computed style equals the
 * canonical Atlaskit value derived at runtime from @atlaskit/tokens
 * artifacts, that the --cp-* bridge resolves, that WCAG contrast holds, that
 * light/dark actually diverge, and that deliberately poisoned probes are
 * detectable (self-test).
 *
 * Run: npx playwright test --config=playwright.tokens.config.ts
 */
import { defineConfig, devices } from '@playwright/test';

const FIXTURE_URL = 'http://127.0.0.1:4179';

export default defineConfig({
  testDir: './tests/tokens',
  // Serial + single worker: the spec caches per-mode probe data across tests.
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: process.env.CI
    ? [['github'], ['html', { open: 'never', outputFolder: 'playwright-report/tokens' }]]
    : [['list'], ['html', { open: 'never', outputFolder: 'playwright-report/tokens' }]],
  timeout: 60_000,
  outputDir: 'test-results/tokens',

  use: {
    baseURL: FIXTURE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    viewport: { width: 1280, height: 720 },
  },

  projects: [
    {
      name: 'tokens',
      testMatch: /token-resolution\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: {
    command: 'npx vite --config scripts/token-fixtures/vite.config.ts',
    url: FIXTURE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
});

import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright config for the Catalyst Chat v2 end-to-end suite.
 *
 * The default playwright.config.ts points testDir at ./tests and baseURL at
 * :5173, so the chat e2e spec under ./e2e was orphaned (no project ran it) —
 * this dedicated config wires it in against the real dev server on :8080.
 *
 * Run: `npm run test:e2e:chat`
 *
 * Auth: the surface requires login. The spec calls loginIfRequired() with
 * TEST_USER_EMAIL / TEST_USER_PASSWORD env vars (same pattern as
 * tests/test-management/smoke.spec.ts). Without valid staging creds in the
 * environment the run stops at the login wall — provide creds to execute.
 */
export default defineConfig({
  testDir: './e2e',
  testMatch: /chat-.*\.spec\.ts/,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['json', { outputFile: 'test-results/chat-e2e.json' }]],
  use: {
    baseURL: process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:8080',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chat-chromium', use: { ...devices['Desktop Chrome'] } },
  ],
});

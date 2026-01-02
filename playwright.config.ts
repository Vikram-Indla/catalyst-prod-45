import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html'],
    ['json', { outputFile: 'test-results/parity-report.json' }],
    ['list'],
  ],
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'parity-api',
      testMatch: '**/parity/api-contract.spec.ts',
    },
    {
      name: 'parity-workflow',
      testMatch: '**/parity/workflow-fsm.spec.ts',
    },
    {
      name: 'parity-security',
      testMatch: '**/parity/permission-leakage.spec.ts',
    },
    {
      name: 'parity-import',
      testMatch: '**/parity/import-diff.spec.ts',
    },
    {
      name: 'parity-ui',
      testMatch: '**/parity/ui-regression.spec.ts',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
  },
});

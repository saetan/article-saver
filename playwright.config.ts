import { defineConfig, devices } from '@playwright/test'
import { APP_PORT, APP_URL, STUB_PORT, STUB_URL, loadE2eEnv } from './e2e/env'

// ADR 0012: Chromium only, against the BUILT app, with external sites
// replaced by the local stub server. The config runs in every Playwright
// process, so the env mapping below reaches the webServers, globalSetup and
// workers.
loadE2eEnv()

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.e2e.ts',
  globalSetup: './e2e/global-setup.ts',
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  // The JSON file only feeds scripts/e2e-summary.mjs (CI job summary).
  reporter: process.env.CI
    ? [
        ['github'],
        ['html', { open: 'never' }],
        ['json', { outputFile: 'test-results/e2e-results.json' }]
      ]
    : 'list',
  use: {
    baseURL: APP_URL,
    screenshot: process.env.CI ? 'on' : 'only-on-failure',
    trace: 'retain-on-failure'
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      command: 'node e2e/stub-server/index.ts',
      url: `${STUB_URL}/health`,
      env: { E2E_STUB_PORT: String(STUB_PORT) },
      reuseExistingServer: !process.env.CI
    },
    {
      command: 'pnpm build && node e2e/start-app.mjs',
      url: `${APP_URL}/api/health`,
      env: { E2E_APP_PORT: String(APP_PORT) },
      timeout: 300_000,
      reuseExistingServer: false
    }
  ]
})

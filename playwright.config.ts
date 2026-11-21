import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 30_000,
  fullyParallel: true,
  reporter: [['list']],
  // Locally the installed Chrome is used so that nothing is downloaded; CI installs Chromium.
  use: { baseURL: 'http://127.0.0.1:4321', browserName: 'chromium', channel: process.env.CI ? undefined : 'chrome' },
  webServer: [
    { command: 'node scripts/serve.mjs dist 4321', url: 'http://127.0.0.1:4321/', reuseExistingServer: !process.env.CI },
    { command: 'node scripts/serve.mjs dist-fixture 4322', url: 'http://127.0.0.1:4322/', reuseExistingServer: !process.env.CI },
    { command: 'node scripts/serve.mjs dist-median 4323', url: 'http://127.0.0.1:4323/', reuseExistingServer: !process.env.CI },
  ],
});

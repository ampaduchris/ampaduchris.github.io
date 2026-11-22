import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 60_000,
  fullyParallel: true,
  retries: process.env.CI ? 0 : 1, // locally one retry, reported as flaky; a stall has been seen about once in four runs on a busy machine, never in CI
  reporter: [['list']],
  // Locally the installed Chrome is used so that nothing is downloaded; CI installs Chromium.
  // REQ-038: every request goes to a dead proxy except those to the local servers, so a test that reaches the network fails.
  // A launch option, so it also covers contexts that tests create themselves (scripts off).
  use: { baseURL: 'http://127.0.0.1:4321', launchOptions: { proxy: { server: 'http://127.0.0.1:9', bypass: '127.0.0.1,localhost' } } },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium', channel: process.env.CI ? undefined : 'chrome' } },
    // Firefox and WebKit run in CI only (the cross-browser job), so that nothing is downloaded locally.
    ...(process.env.CROSS_BROWSER ? [{ name: 'firefox', use: { browserName: 'firefox' as const } }, { name: 'webkit', use: { browserName: 'webkit' as const } }] : []),
  ],
  webServer: [
    { command: 'node scripts/serve.mjs dist 4321', url: 'http://127.0.0.1:4321/', reuseExistingServer: !process.env.CI },
    { command: 'node scripts/serve.mjs dist-fixture 4322', url: 'http://127.0.0.1:4322/', reuseExistingServer: !process.env.CI },
    { command: 'node scripts/serve.mjs dist-median 4323', url: 'http://127.0.0.1:4323/', reuseExistingServer: !process.env.CI },
    { command: 'node scripts/serve.mjs dist-n19 4324', url: 'http://127.0.0.1:4324/', reuseExistingServer: !process.env.CI },
  ],
});

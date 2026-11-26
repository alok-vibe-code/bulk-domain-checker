import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/browser',
  forbidOnly: !!process.env.CI,
  workers: process.env.CI ? 1 : undefined,
  use: {
    ...devices['Desktop Chrome'],
    trace: 'retain-on-failure',
  },
});

import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/browser',
  fullyParallel: true,
  workers: process.env.CI ? 2 : undefined,
  retries: process.env.CI ? 1 : 0,
  reporter: 'list',
  use: { baseURL: 'http://127.0.0.1:8765', trace: 'retain-on-failure' },
  projects: [{name:'chromium',use:{browserName:'chromium'}}, {name:'firefox',use:{browserName:'firefox'}}],
  webServer: { command:'node tests/server.mjs', url:'http://127.0.0.1:8765', reuseExistingServer:false }
});

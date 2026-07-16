import { defineConfig } from '@playwright/test';

/* E2E tests run against the production build served by `vite preview`.
   Run `npm run build` first (CI does), then `npm run test:e2e`.
   One-time local setup: `npx playwright install chromium` */
export default defineConfig({
  testDir: 'e2e',
  timeout: 60_000,
  retries: process.env.CI ? 1 : 0,
  workers: 1, // specs share localStorage-seeded state per page; keep runs deterministic
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    // trailing slash matters: specs use relative paths ('login', not '/login')
    // so the /demo.github.io base segment is preserved in URL resolution
    baseURL: 'http://localhost:4173/demo.github.io/',
    viewport: { width: 1440, height: 900 },
    screenshot: 'only-on-failure',
    // locally reuse the installed Chrome; CI downloads chromium via `playwright install`
    ...(process.env.CI ? {} : { channel: 'chrome' as const }),
  },
  webServer: {
    command: 'npm run preview',
    url: 'http://localhost:4173/demo.github.io/',
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
});

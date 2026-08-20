/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: '/demo.github.io/',
  plugins: [react()],
  build: {
    // exceljs/jspdf/html2canvas are already dynamic-imported on demand (see exportReport.ts)
    // and cameras.json is a shared chunk with a small gzip footprint — the default 500kB
    // warning threshold flags them even though none actually block a page's initial load.
    chunkSizeWarningLimit: 1000,
  },
  test: {
    environment: 'jsdom',
    exclude: ['**/node_modules/**', 'e2e/**', 'worker/**'], // e2e/*.spec.ts belongs to Playwright, not Vitest; worker/ is a separate Cloudflare Worker project
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      exclude: [
        'node_modules/**', 'e2e/**', 'worker/**',
        'src/main.tsx', 'src/vite-env.d.ts',
        '**/*.test.{ts,tsx}', '**/*.d.ts', 'src/types/**',
      ],
    },
  },
})

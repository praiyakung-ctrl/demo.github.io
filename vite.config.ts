/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: '/demo.github.io/',
  plugins: [react()],
  test: {
    environment: 'jsdom',
    exclude: ['node_modules/**', 'e2e/**'], // e2e/*.spec.ts belongs to Playwright, not Vitest
  },
})

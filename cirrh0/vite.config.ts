/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Vite replaces Create React App. The build needs about 350 MB of memory instead of 1.6 to 2 GB, which
// is what lets it run on Render's 512 MB free build machines. See ../DEPLOY.md.
export default defineConfig({
  plugins: [react()],
  server: { port: 3000 }, // the API's default allowed origin is http://localhost:3000
  build: {
    outDir: 'build', // the API serves this folder (WEB_DIR=../cirrh0/build)
    sourcemap: false,
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/setupTests.ts'],
    css: false,
  },
})

import { defineConfig } from 'vite';

// GitHub Pages serves the repository under /break-the-rock/.
export default defineConfig({
  base: '/break-the-rock/',
  build: { target: 'es2022', chunkSizeWarningLimit: 1600 },
  server: { host: true },
});

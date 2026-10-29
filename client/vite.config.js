import { copyFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// The GitHub Pages preview (npm run build:pages) is served from /nxtsip/ and kept out of search results. Pages answers
// unknown paths with 404.html, so a copy of the page there lets links into the shop open the app.
function pagesPreview() {
  let outDir;
  return {
    name: 'pages-preview',
    configResolved(config) {
      outDir = resolve(config.root, config.build.outDir);
    },
    transformIndexHtml: () => [{ tag: 'meta', attrs: { name: 'robots', content: 'noindex' }, injectTo: 'head' }],
    async closeBundle() {
      await copyFile(resolve(outDir, 'index.html'), resolve(outDir, '404.html'));
      await writeFile(resolve(outDir, '.nojekyll'), '');
    },
  };
}

export default defineConfig(({ mode }) => ({
  base: mode === 'pages' ? '/nxtsip/' : '/',
  plugins: [react(), mode === 'pages' && pagesPreview()],
  build: {
    outDir: mode === 'pages' ? 'dist-pages' : 'dist',
    chunkSizeWarningLimit: 700,
  },
  server: {
    proxy: {
      '/api': 'http://localhost:4000',
    },
  },
}));

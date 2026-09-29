import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  root: './web',
  build: {
    outDir: '../dist-web',
    emptyOutDir: true,
    target: 'es2020',
    minify: 'esbuild'
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:7878',
        changeOrigin: true
      }
    }
  }
});

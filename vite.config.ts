import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  root: './web',
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './web/src')
    }
  },
  build: {
    outDir: '../dist-web',
    emptyOutDir: true,
    target: 'es2020',
    minify: 'esbuild',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          charts: ['recharts'],
          icons: ['lucide-react'],
        }
      }
    }
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

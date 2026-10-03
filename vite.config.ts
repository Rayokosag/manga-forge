import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

// Tauri expects a fixed port and ignores Vite's HMR websocket on the default host.
const host = process.env.TAURI_DEV_HOST;

// https://vitejs.dev/config/
export default defineConfig(async () => ({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  // Prevent Vite from obscuring Rust errors.
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: 'ws',
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      // Tauri source + the SQLite db live outside the frontend; don't watch them.
      ignored: ['**/src-tauri/**'],
    },
  },
  // Produce a build Tauri can bundle; target modern webviews only.
  build: {
    target: 'esnext',
    minify: 'esbuild',
    sourcemap: !!process.env.TAURI_DEBUG,
    rollupOptions: {
      output: {
        // Keep the framework in its own long-lived chunk; feature views and the
        // heavy export libs are code-split elsewhere (React.lazy / dynamic import).
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
        },
      },
    },
  },
}));

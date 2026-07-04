/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/  &  https://vitest.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        // Split heavy, rarely-changing vendors into their own chunks so the app
        // code stays small and vendor bundles cache across deploys.
        manualChunks: {
          three: ['three'],
          react: ['react', 'react-dom'],
        },
      },
    },
  },
  test: {
    // The physics engine is framework-agnostic and runs in a plain Node environment.
    environment: 'node',
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    globals: true,
  },
});

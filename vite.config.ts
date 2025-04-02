import { defineConfig } from 'vite';

export default defineConfig({
  // Optional: Configure server options
  server: {
    port: 3000, // Specify port if needed
    open: true, // Automatically open in browser
  },
  // Optional: Configure build options
  build: {
    outDir: 'dist', // Output directory for build
  },
  // Optional: Define base path if deploying to a subdirectory
  // base: '/npc-town/',
  resolve: {
    alias: {
      // Optional: Setup alias consistent with tsconfig.json
      '@': '/src',
    },
  },
});

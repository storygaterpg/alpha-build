// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  define: {
    // Expose env vars (e.g. VITE_SERVER_URL) to client
    'process.env': process.env
  },
  build: {
    // Output directory for production build
    outDir: 'dist'
  },
  server: {
    // Development server port
    port: 3000
  }
});

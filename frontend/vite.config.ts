import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'url'
import { resolve } from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': '/src',
      '@components': '/src/components',
      '@pages': '/src/pages',
      '@store': '/src/store',
      '@network': '/src/network',
      '@phaser': '/src/phaser',
      '@utils': '/src/utils',
      '@styles': '/src/styles',
    },
  },
  server: {
    port: 3001,
    open: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        sw: resolve(__dirname, 'public/sw.js')
      },
      output: {
        entryFileNames: (assetInfo) => {
          return assetInfo.name === 'sw' ? '[name].js' : 'assets/[name]-[hash].js';
        },
      },
    },
    assetsInlineLimit: 0, // Don't inline assets as base64
  },
}) 
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'url'
import { resolve } from 'path'
import fs from 'fs'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'generate-example-images-manifest',
      configureServer() {
        // regenerate on dev server start
        const __filename = fileURLToPath(import.meta.url)
        const __dirname = path.dirname(__filename)
        const dir = path.resolve(__dirname, 'public/images/example_images')
        const dest = path.resolve(__dirname, 'src/utils/imageManifest.ts')
        try {
          const files = fs.readdirSync(dir)
          const images = files.map(f => `/images/example_images/${f}`)
          const content = `export const exampleImages = ${JSON.stringify(images)}`
          fs.writeFileSync(dest, content)
        } catch {}
      },
      buildStart() {
        // regenerate before build
        const __filename = fileURLToPath(import.meta.url)
        const __dirname = path.dirname(__filename)
        const dir = path.resolve(__dirname, 'public/images/example_images')
        const dest = path.resolve(__dirname, 'src/utils/imageManifest.ts')
        try {
          const files = fs.readdirSync(dir)
          const images = files.map(f => `/images/example_images/${f}`)
          const content = `export const exampleImages = ${JSON.stringify(images)}`
          fs.writeFileSync(dest, content)
        } catch {}
      }
    },
  ],
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
    port: 5173,
    open: true,
    proxy: {
      '/login': 'http://localhost:8000',
      '/logout': 'http://localhost:8000',
      '/me': 'http://localhost:8000',
      '/api': 'http://localhost:8000',
      '/ws': {
        target: 'ws://localhost:8000',
        ws: true
      }
    }
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
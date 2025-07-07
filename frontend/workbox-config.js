module.exports = {
  globDirectory: "dist/",
  globPatterns: [
    "**/*.{js,css,html,png,jpg,jpeg,gif,svg,woff,woff2,ttf,eot,ico}"
  ],
  swDest: "dist/sw.js",
  sourcemap: false,
  cleanupOutdatedCaches: true,
  clientsClaim: true,
  skipWaiting: true,
  runtimeCaching: [
    {
      // Cache WebSocket handshake requests
      urlPattern: ({ url }) => url.protocol === 'ws:' || url.protocol === 'wss:',
      handler: 'NetworkOnly', // WebSockets must use network
      options: {
        backgroundSync: {
          name: 'websocket-queue',
          options: {
            maxRetentionTime: 60 * 24 // Retry for up to 24 hours (in minutes)
          }
        }
      }
    },
    {
      // Cache REST API requests
      urlPattern: /\/api\/.*$/,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'api-cache',
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 60 * 60 // 1 hour
        },
        networkTimeoutSeconds: 10,
        backgroundSync: {
          name: 'api-queue',
          options: {
            maxRetentionTime: 60 * 24 // Retry for up to 24 hours (in minutes)
          }
        }
      }
    },
    {
      // Cache game assets
      urlPattern: /\/assets\//,
      handler: 'CacheFirst',
      options: {
        cacheName: 'game-assets',
        expiration: {
          maxEntries: 200,
          maxAgeSeconds: 30 * 24 * 60 * 60 // 30 days
        }
      }
    },
    {
      // Cache Google Fonts stylesheets
      urlPattern: /^https:\/\/fonts\.googleapis\.com/,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'google-fonts-stylesheets'
      }
    },
    {
      // Cache Google Fonts webfont files
      urlPattern: /^https:\/\/fonts\.gstatic\.com/,
      handler: 'CacheFirst',
      options: {
        cacheName: 'google-fonts-webfonts',
        expiration: {
          maxEntries: 30,
          maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
        }
      }
    }
  ]
}; 
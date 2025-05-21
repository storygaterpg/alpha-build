// workbox-config.js

module.exports = {
    // The directory where the built files are located
    globDirectory: 'dist/',
    // Patterns for files to precache
    globPatterns: [
      '**/*.{js,css,html,png,svg}'
    ],
    // The path (within dist/) to write the generated service worker file
    swDest: 'dist/sw.js',
    // Runtime caching rules
    runtimeCaching: [
      {
        // Cache image files with a CacheFirst strategy
        urlPattern: /\.(?:png|jpg|jpeg|svg)$/,
        handler: 'CacheFirst',
        options: {
          cacheName: 'images',
          expiration: {
            maxEntries: 100,
            maxAgeSeconds: 60 * 60 * 24 * 30 // 30 Days
          }
        }
      },
      {
        // Apply a NetworkFirst strategy for API requests
        urlPattern: /\/api\/.*$/,
        handler: 'NetworkFirst',
        options: {
          cacheName: 'api',
          networkTimeoutSeconds: 10,
          expiration: {
            maxEntries: 50,
            maxAgeSeconds: 60 * 60 * 24 // 1 Day
          }
        }
      }
    ]
  };
  
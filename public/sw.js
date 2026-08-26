const CACHE_NAME = 'tokencare-v4';
const LOGO_CACHE_NAME = 'tokencare-logo-v1';
const TOKENCARE_LOGO_URL = 'https://cdn.jsdelivr.net/gh/happyiyate-hash/Logo@main/tokencare-logo-512.png';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json'
];

// Install Event: Cache Core Static Assets & Pre-cache CDN Logo
self.addEventListener('install', (event) => {
  event.waitUntil(
    Promise.all([
      caches.open(CACHE_NAME).then((cache) => {
        console.log('[Service Worker] Pre-caching static assets');
        return cache.addAll(STATIC_ASSETS);
      }),
      caches.open(LOGO_CACHE_NAME).then((cache) => {
        console.log('[Service Worker] Pre-caching TokenCare CDN logo');
        return cache.add(TOKENCARE_LOGO_URL).catch((err) => {
          console.warn('[Service Worker] Initial logo pre-cache failed, will cache on first request', err);
        });
      })
    ]).then(() => self.skipWaiting())
  );
});

// Activate Event: Clean up old caches except current CACHE_NAME and LOGO_CACHE_NAME
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME && cache !== LOGO_CACHE_NAME) {
            console.log('[Service Worker] Deleting old cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event: Dedicated Cache-first strategy for TokenCare CDN Logo
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Skip non-GET requests or chrome-extension requests
  if (event.request.method !== 'GET' || url.protocol === 'chrome-extension:') {
    return;
  }

  // Intercept TokenCare CDN Logo requests
  if (event.request.url === TOKENCARE_LOGO_URL || url.href.includes('tokencare-logo-512.png')) {
    event.respondWith(
      caches.open(LOGO_CACHE_NAME).then((cache) => {
        return cache.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            // Return cached response immediately without repeatedly requesting CDN
            return cachedResponse;
          }

          // If not in cache, fetch from CDN and cache the response
          return fetch(event.request).then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              cache.put(event.request, networkResponse.clone());
            }
            return networkResponse;
          }).catch(() => {
            // Network failed, fallback to any cached match if available
            return cache.match(TOKENCARE_LOGO_URL);
          });
        });
      })
    );
    return;
  }

  // Network-first for API requests, RPC calls, Supabase endpoints
  if (url.pathname.startsWith('/api') || url.hostname.includes('supabase.co') || url.hostname.includes('alchemy.com') || url.hostname.includes('infura.io')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return response;
        })
        .catch(() => {
          return caches.match(event.request);
        })
    );
    return;
  }

  // Cache-first for local static assets
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, networkResponse);
              });
            }
          })
          .catch(() => {/* Ignore background fetch errors */});
        return cachedResponse;
      }

      return fetch(event.request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200 || (networkResponse.type !== 'basic' && networkResponse.type !== 'cors')) {
          return networkResponse;
        }

        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });

        return networkResponse;
      }).catch(() => {
        if (event.request.headers.get('accept')?.includes('text/html')) {
          return caches.match('/index.html');
        }
      });
    })
  );
});

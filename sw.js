// ============================================================
// Billiards Buddy — Service Worker  v9.2
// Cache: bb-cache-v2
// Strategy: cache-first for same-origin; network passthrough
//           for YouTube, Nominatim, Google Maps, Google Fonts.
// ============================================================

const CACHE_NAME = 'bb-cache-v5';

const PRECACHE_URLS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-192.svg',
  './icon-512.svg'
];

const NETWORK_ONLY_HOSTS = [
  'youtube.com',
  'www.youtube.com',
  'youtu.be',
  'nominatim.openstreetmap.org',
  'openstreetmap.org',
  'www.openstreetmap.org',
  'maps.google.com',
  'www.google.com',
  'fonts.googleapis.com',
  'fonts.gstatic.com',
  'tile.openstreetmap.org',
  'overpass-api.de',
  'nominatim.openstreetmap.org',
  'www.gstatic.com',
  'firebaseio.com',
  'firebase.googleapis.com',
  'identitytoolkit.googleapis.com',
  'securetoken.googleapis.com'
];

// ── install ──────────────────────────────────────────────────
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        return cache.addAll(PRECACHE_URLS);
      })
      .then(function() {
        return self.skipWaiting();
      })
  );
});

// ── activate ─────────────────────────────────────────────────
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys()
      .then(function(cacheNames) {
        return Promise.all(
          cacheNames
            .filter(function(name) { return name !== CACHE_NAME; })
            .map(function(name) { return caches.delete(name); })
        );
      })
      .then(function() {
        return self.clients.claim();
      })
  );
});

// ── fetch ────────────────────────────────────────────────────
self.addEventListener('fetch', function(event) {
  var url;
  try { url = new URL(event.request.url); } catch(e) { return; }

  // Pass cross-origin API/embed requests straight to the network
  var networkOnly = NETWORK_ONLY_HOSTS.some(function(host) {
    return url.hostname === host || url.hostname.endsWith('.' + host);
  });
  if (networkOnly) return;

  // Non-GET requests go straight to network
  if (event.request.method !== 'GET') return;

  // Cache-first with background revalidation for same-origin GET
  event.respondWith(
    caches.match(event.request).then(function(cached) {
      // Background revalidation (fire-and-forget)
      var networkFetch = fetch(event.request).then(function(response) {
        if (response && response.status === 200 && response.type !== 'opaque') {
          caches.open(CACHE_NAME).then(function(cache) {
            cache.put(event.request, response.clone());
          });
        }
        return response;
      }).catch(function() {});

      // Return cache hit immediately; otherwise wait for network
      return cached || networkFetch;
    })
  );
});

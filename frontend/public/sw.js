// Service Worker for AffableLink
// Provides offline support and caching strategies

const CACHE_NAME = "affablelink-v1";
const URLS_TO_CACHE = [
  "/",
  "/offline.html",
  "/manifest.json",
];

// Install event - cache essential files
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(URLS_TO_CACHE).catch((err) => {
        console.log("Cache addAll error:", err);
        // Silently fail - it's okay if some resources aren't cached
      });
    })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - implement caching strategy
self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Skip non-GET requests
  if (request.method !== "GET") {
    return;
  }

  // Skip chrome extensions and external requests
  if (request.url.includes("chrome-extension")) {
    return;
  }

  event.respondWith(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.match(request).then((response) => {
        // Return cached response if available
        if (response) {
          return response;
        }

        // Otherwise, fetch from network
        return fetch(request)
          .then((networkResponse) => {
            // Cache successful responses (for static assets and HTML)
            if (
              networkResponse &&
              networkResponse.status === 200 &&
              (request.url.includes("/static/") ||
                request.url.endsWith(".html") ||
                request.url.endsWith(".json") ||
                request.url.endsWith(".css") ||
                request.url.endsWith(".js"))
            ) {
              cache.put(request, networkResponse.clone());
            }
            return networkResponse;
          })
          .catch(() => {
            // Return offline page for navigation requests
            if (request.mode === "navigate") {
              return cache.match("/offline.html");
            }
            // For other requests, return a generic error response
            return new Response("Offline", { status: 503 });
          });
      });
    })
  );
});

const CACHE_NAME = "sushichain-v1";

const STATIC_ASSETS = [
  "/",
  "/manifest.json",
  "/icons/icon.svg",
];

// API patterns to cache with stale-while-revalidate
const API_CACHE_NAME = "sushichain-api-v1";

// Install: pre-cache critical static assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== CACHE_NAME && k !== API_CACHE_NAME)
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// Fetch: route by request type
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle same-origin GET requests
  if (request.method !== "GET" || url.origin !== self.location.origin) return;

  // API requests: stale-while-revalidate
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  // Static assets (CSS, JS, fonts, icons): cache-first
  if (
    url.pathname.match(/\.(css|js|woff2?|ttf|png|svg|ico|jpg|jpeg)$/) ||
    url.pathname.startsWith("/icons/") ||
    url.pathname.startsWith("/_next/static/)
  ) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Navigation requests: network-first, fall back to cache
  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request));
    return;
  }
});

// Cache-first strategy for static assets
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response("Offline", { status: 503 });
  }
}

// Stale-while-revalidate strategy for API calls
async function staleWhileRevalidate(request) {
  const cache = await caches.open(API_CACHE_NAME);
  const cached = await cache.match(request);

  const fetchPromise = fetch(request)
    .then((response) => {
      if (response.ok) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => {
      // If network fails and we have cache, return it
      if (cached) return cached;
      return new Response(JSON.stringify({ error: "offline" }), {
        status: 503,
        headers: { "Content-Type": "application/json" },
      });
    });

  // Return cached immediately, or wait for network
  return cached || fetchPromise;
}

// Network-first strategy for navigation
async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    return new Response("Offline", { status: 503 });
  }
}
const CACHE_VERSION = "ganjoorak-v1";
const APP_SHELL = [
  "/",
  "/saved",
  "/today",
  "/poets",
  "/faq",
  "/updates",
  "/manifest.json",
  "/favicon.ico",
  "/icon-192.png",
  "/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(APP_SHELL)),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_VERSION)
          .map((key) => caches.delete(key)),
      ),
    ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") {
    return;
  }

  const requestUrl = new URL(event.request.url);
  if (requestUrl.origin !== self.location.origin) {
    return;
  }

  if (requestUrl.pathname.startsWith("/api/")) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const networkFetch = fetch(event.request)
        .then((response) => {
          if (
            response.ok &&
            (requestUrl.pathname.endsWith(".css") ||
              requestUrl.pathname.endsWith(".js") ||
              APP_SHELL.includes(requestUrl.pathname))
          ) {
            const cloned = response.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(event.request, cloned));
          }
          return response;
        })
        .catch(() => cachedResponse);

      return cachedResponse || networkFetch;
    }),
  );
});

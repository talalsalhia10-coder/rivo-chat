const CORE_CACHE = "rivo-group-chat-core-v1433";
const MODEL_CACHE = "rivo-group-chat-model-v1433";
const CORE_ASSETS = [
  "./",
  "./index.html",
  "./admin.html",
  "./moderator.html",
  "./styles.css",
  "./admin.css",
  "./admin-config.js",
  "./admin.js",
  "./app.js",
  "./professional-features.js",
  "./google-config.js",
  "./google-auth.js",
  "./local-data.js",
  "./voice-config.js",
  "./voice-room.js",
  "./relay-audio.js",
  "./characters.js",
  "./avatar-stage.js",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./characters/lina/portrait-small.webp",
  "./characters/girl2/portrait-small.webp",
  "./characters/girl3/portrait-small.webp",
  "./characters/girl4/portrait-small.webp",
  "./characters/man1/portrait-small.webp",
  "./characters/avatar6/portrait-small.webp",
  "./characters/avatar7/portrait-small.webp"
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CORE_CACHE).then((cache) => cache.addAll(CORE_ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys
        .filter((key) => key.startsWith('rivo-group-chat-') && ![CORE_CACHE, MODEL_CACHE].includes(key))
        .map((key) => caches.delete(key))
    ))
  );
  self.clients.claim();
});

async function cacheOnlyCurrentModel(request) {
  const cache = await caches.open(MODEL_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (response.ok) {
    const keys = await cache.keys();
    await Promise.all(keys.map((key) => cache.delete(key)));
    await cache.put(request, response.clone());
  }
  return response;
}

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return;

  if (url.pathname.endsWith(".vrm")) {
    event.respondWith(cacheOnlyCurrentModel(event.request));
    return;
  }

  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.ok) caches.open(CORE_CACHE).then((cache) => cache.put(event.request, response.clone()));
          return response;
        })
        .catch(() => caches.match(event.request).then((cached) => cached || caches.match("./index.html")))
    );
    return;
  }

  const isCoreUiFile = /\.(?:css|js)$/.test(url.pathname);
  if (isCoreUiFile) {
    event.respondWith(
      fetch(event.request, { cache: "no-store" })
        .then((response) => {
          if (response.ok) caches.open(CORE_CACHE).then((cache) => cache.put(event.request, response.clone()));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const network = fetch(event.request)
        .then((response) => {
          if (response.ok) caches.open(CORE_CACHE).then((cache) => cache.put(event.request, response.clone()));
          return response;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});

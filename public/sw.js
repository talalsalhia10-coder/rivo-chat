const RELEASE = "210-admin-hidden-gallery";
const CORE_CACHE = `rivo-chat-core-${RELEASE}`;
const MODEL_CACHE = `rivo-chat-model-${RELEASE}`;

const CORE_ASSETS = [
  "./",
  "./index.html",
  "./styles.css?v=208",
  "./app.js?v=202",
  "./live-bridge.js?v=210",
  "./mobile-experience.js?v=208",
  "./google-config.js?v=178",
  "./google-auth.js?v=178",
  "./relay-audio.js?v=178",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CORE_CACHE);
    await Promise.allSettled(CORE_ASSETS.map(async (asset) => {
      try {
        const request = new Request(asset, { cache: "reload" });
        const response = await fetch(request);
        if (response.ok) await cache.put(request, response.clone());
      } catch {}
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter((key) =>
          (key.startsWith("rivo-group-chat-") || key.startsWith("rivo-chat-")) &&
          ![CORE_CACHE, MODEL_CACHE].includes(key)
        )
        .map((key) => caches.delete(key))
    );
    await self.clients.claim();
  })());
});

async function networkFirst(request, fallbackRequest = null) {
  const cache = await caches.open(CORE_CACHE);
  try {
    const response = await fetch(request, { cache: "no-store" });
    if (response.ok) await cache.put(request, response.clone());
    return response;
  } catch {
    return (await cache.match(request)) ||
      (fallbackRequest ? await cache.match(fallbackRequest) : null) ||
      Response.error();
  }
}

async function cacheModel(request) {
  const cache = await caches.open(MODEL_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) await cache.put(request, response.clone());
  return response;
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return;

  if (url.pathname.endsWith(".vrm")) {
    event.respondWith(cacheModel(request));
    return;
  }

  if (request.mode === "navigate") {
    const fallback = url.pathname === "/" || url.pathname.endsWith("/index.html") ? "./index.html" : null;
    event.respondWith(networkFirst(request, fallback));
    return;
  }

  if (/\.(?:js|css|html|json|webmanifest|txt)$/i.test(url.pathname)) {
    event.respondWith(networkFirst(request));
    return;
  }

  event.respondWith((async () => {
    const cache = await caches.open(CORE_CACHE);
    const cached = await cache.match(request);
    if (cached) return cached;
    try {
      const response = await fetch(request);
      if (response.ok) await cache.put(request, response.clone());
      return response;
    } catch {
      return Response.error();
    }
  })());
});

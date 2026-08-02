const RELEASE = "1434-connection-stability";
const CORE_CACHE = `rivo-group-chat-core-${RELEASE}`;
const MODEL_CACHE = `rivo-group-chat-model-${RELEASE}`;

const CORE_ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./connection-fix.js",
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
  "./icons/icon-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CORE_CACHE);
    // لا نفشل تثبيت التحديث كله إذا تعذر ملف اختياري واحد.
    await Promise.allSettled(
      CORE_ASSETS.map(async (asset) => {
        try {
          const request = new Request(asset, { cache: "reload" });
          const response = await fetch(request);
          if (response.ok) await cache.put(request, response.clone());
        } catch {}
      })
    );
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter((key) => key.startsWith("rivo-group-chat-") && ![CORE_CACHE, MODEL_CACHE].includes(key))
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

async function cacheCurrentModel(request) {
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

function injectConnectionFix(html) {
  if (html.includes("connection-fix.js")) return html;
  const tag = `<script src="./connection-fix.js?v=${RELEASE}"></script>`;
  const appPattern = /<script\s+src=["']\.\/app\.js[^"']*["']><\/script>/i;
  if (appPattern.test(html)) return html.replace(appPattern, `${tag}\n  $&`);
  return html.replace(/<\/body>/i, `  ${tag}\n</body>`);
}

async function navigationResponse(request, url) {
  const response = await networkFirst(request, "./index.html");
  const isMainPage = url.pathname === "/" || url.pathname.endsWith("/index.html");
  if (!isMainPage || !response || !response.ok) return response;

  const type = response.headers.get("content-type") || "";
  if (!type.includes("text/html")) return response;

  try {
    const html = injectConnectionFix(await response.text());
    const headers = new Headers(response.headers);
    headers.set("content-type", "text/html; charset=utf-8");
    headers.set("cache-control", "no-store, no-cache, must-revalidate");
    return new Response(html, {
      status: response.status,
      statusText: response.statusText,
      headers
    });
  } catch {
    return response;
  }
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return;

  if (url.pathname.endsWith(".vrm")) {
    event.respondWith(cacheCurrentModel(request));
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(navigationResponse(request, url));
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

const RELEASE = "1450-room-radio-youtube-audio";
const CORE_CACHE = `rivo-group-chat-core-${RELEASE}`;
const MODEL_CACHE = `rivo-group-chat-model-${RELEASE}`;

const CORE_ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./connection-fix.js",
  "./gifts-upgrade.js",
  "./admin-gifts-upgrade.js",
  "./room-radio.js",
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

function injectBeforeApp(html) {
  const tags = [];
  if (!html.includes("gifts-upgrade.js")) tags.push(`<script src="./gifts-upgrade.js?v=${RELEASE}"></script>`);
  if (!html.includes("connection-fix.js")) tags.push(`<script src="./connection-fix.js?v=${RELEASE}"></script>`);
  if (!html.includes("room-radio.js")) tags.push(`<script src="./room-radio.js?v=${RELEASE}"></script>`);
  if (!tags.length) return html;
  const block = tags.join("\n  ");
  const appPattern = /<script\s+src=["']\.\/app\.js[^"']*["']><\/script>/i;
  if (appPattern.test(html)) return html.replace(appPattern, `${block}\n  $&`);
  return html.replace(/<\/body>/i, `  ${block}\n</body>`);
}

function injectAdminUpgrade(html) {
  if (html.includes("admin-gifts-upgrade.js")) return html;
  const tag = `<script src="./admin-gifts-upgrade.js?v=${RELEASE}"></script>`;
  return html.replace(/<\/body>/i, `  ${tag}\n</body>`);
}

function isAdminPath(pathname) {
  return /(?:^|\/)(?:admin|moderator)(?:\.html)?\/?$/i.test(pathname);
}

function isMainPath(pathname) {
  return pathname === "/" || /(?:^|\/)index\.html\/?$/i.test(pathname);
}

async function navigationResponse(request, url) {
  const response = await networkFirst(request, isMainPath(url.pathname) ? "./index.html" : null);
  if (!response || !response.ok) return response;
  const type = response.headers.get("content-type") || "";
  if (!type.includes("text/html")) return response;

  try {
    let html = await response.text();
    if (isMainPath(url.pathname)) html = injectBeforeApp(html);
    else if (isAdminPath(url.pathname)) html = injectAdminUpgrade(html);
    else return response;

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

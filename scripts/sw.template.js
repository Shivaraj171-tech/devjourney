// DevJourney service worker: second visits load Python and the editor from the
// device, and a ticket you've opened once keeps working offline.
//
// GENERATED: scripts/copy-assets.mjs writes public/sw.js from this template
// (before `dev` and `build`), filling in the versions below. Edit this file,
// not public/sw.js. It is only registered in production builds (lib/serviceWorker.ts).
//
// Caches (names are versioned, old ones are deleted when a new worker activates):
//   assets  Pyodide + Monaco, cache-first. Versioned by the npm package versions.
//   runner  runner-worker.js + runner/*.py, cache-first. Versioned by a hash of their contents.
//   app     _next/static (hashed, immutable) cache-first; pages and other files
//           network-first with the cached copy as the offline fallback.

const ASSETS_VERSION = "__ASSETS_VERSION__"; // e.g. pyodide-314.0.8_monaco-0.57.0
const RUNNER_VERSION = "__RUNNER_VERSION__"; // hash of the runner files
const APP_VERSION = "1"; // bump to drop every cached page and chunk

// Everything is relative to this worker's scope, e.g. https://x.github.io/devjourney/
const SCOPE = new URL(self.registration.scope);
const PREFIX = `devjourney:${SCOPE.pathname}:`;
const ASSETS_CACHE = `${PREFIX}assets:${ASSETS_VERSION}`;
const RUNNER_CACHE = `${PREFIX}runner:${RUNNER_VERSION}`;
const APP_CACHE = `${PREFIX}app:${APP_VERSION}`;
const CURRENT = new Set([ASSETS_CACHE, RUNNER_CACHE, APP_CACHE]);
/** Keep the app cache from growing forever across deploys (oldest entries go first). */
const APP_CACHE_MAX_ENTRIES = 250;

const RUNNER_FILES = ["runner-worker.js", "runner/test_runner.py", "runner/tracer.py", "runner/formats.py"];

const inScope = (url, path) => url.href.startsWith(new URL(path, SCOPE).href);

self.addEventListener("install", (event) => {
  // Only the small runner files up front. Pyodide (~13 MB) is cached the first
  // time it is actually used, so a quick look at the site never costs that much data.
  event.waitUntil(
    (async () => {
      const cache = await caches.open(RUNNER_CACHE);
      await Promise.all(
        RUNNER_FILES.map((f) =>
          cache.add(new Request(new URL(f, SCOPE), { cache: "no-cache" })).catch(() => undefined),
        ),
      );
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(names.filter((n) => n.startsWith(PREFIX) && !CURRENT.has(n)).map((n) => caches.delete(n)));
      // Control the page that registered us right away, so its Python worker is cached too.
      await self.clients.claim();
    })(),
  );
});

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(request, { ignoreSearch: true });
  if (hit) return hit;
  const response = await fetch(request);
  if (response.ok && response.status === 200) {
    await cache.put(request, response.clone()).catch(() => undefined);
    if (cacheName === APP_CACHE) trim(cache);
  }
  return response;
}

async function networkFirst(request) {
  const cache = await caches.open(APP_CACHE);
  try {
    const response = await fetch(request);
    if (response.ok && response.status === 200) {
      await cache.put(request, response.clone()).catch(() => undefined);
      trim(cache);
    }
    return response;
  } catch (err) {
    const hit = await cache.match(request, { ignoreSearch: request.mode === "navigate" });
    if (hit) return hit;
    if (request.mode === "navigate") {
      return new Response(
        "<!doctype html><meta charset=utf-8><meta name=viewport content='width=device-width'>" +
          "<title>Offline</title><body style='font-family:system-ui;background:#020617;color:#e2e8f0;padding:2rem'>" +
          "<h1>You're offline</h1><p>This page hasn't been opened on this device yet. Tickets you've opened before still work offline.</p>",
        { status: 503, headers: { "Content-Type": "text/html; charset=utf-8" } },
      );
    }
    throw err;
  }
}

async function trim(cache) {
  const keys = await cache.keys();
  for (let i = 0; i < keys.length - APP_CACHE_MAX_ENTRIES; i++) await cache.delete(keys[i]);
}

/** Which cache a URL belongs in, and how it is served. null: not ours, leave it to the network. */
function route(url) {
  if (url.origin !== SCOPE.origin || !url.pathname.startsWith(SCOPE.pathname)) return null;
  if (url.pathname === new URL("sw.js", SCOPE).pathname) return null;
  if (inScope(url, "pyodide/") || inScope(url, "monaco/")) return { cache: ASSETS_CACHE, strategy: "cache-first" };
  if (RUNNER_FILES.some((f) => url.pathname === new URL(f, SCOPE).pathname)) return { cache: RUNNER_CACHE, strategy: "cache-first" };
  if (inScope(url, "_next/static/")) return { cache: APP_CACHE, strategy: "cache-first" };
  return { cache: APP_CACHE, strategy: "network-first" };
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const r = route(new URL(request.url));
  if (!r) return;
  event.respondWith(r.strategy === "cache-first" ? cacheFirst(request, r.cache) : networkFirst(request));
});

// A page that loaded before this worker took over sends the URLs it already
// fetched (itself, its scripts, the editor), so a first visit also works offline.
// Pages reached by client-side navigation send their own URL (no HTML was fetched).
self.addEventListener("message", (event) => {
  const data = event.data;
  if (!data || data.type !== "cache-urls" || !Array.isArray(data.urls)) return;
  event.waitUntil(
    (async () => {
      for (const href of data.urls.slice(0, 200)) {
        let url;
        try {
          url = new URL(href);
        } catch {
          continue;
        }
        const r = route(url);
        if (!r) continue;
        const cache = await caches.open(r.cache);
        // Immutable files: keep. Pages: refresh, so the offline copy is the latest one.
        if (r.strategy === "cache-first" && (await cache.match(url.href, { ignoreSearch: true }))) continue;
        await cache.add(url.href).catch(() => undefined);
      }
    })(),
  );
});

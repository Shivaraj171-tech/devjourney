"use client";
// Registers public/sw.js (generated from scripts/sw.template.js) in production
// builds, under the site's base path. In `next dev` it registers nothing and
// removes a worker left over from serving a production build on the same port.
import { withBase } from "./basePath";

const ENABLED = process.env.NODE_ENV === "production";
let registering: Promise<ServiceWorkerRegistration | null> | null = null;

/** Register the service worker once per page (safe to call many times). Resolves to the registration, or null. */
export function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (registering) return registering;
  registering = (async () => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return null;
    try {
      if (!ENABLED) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((r) => r.unregister()));
        return null;
      }
      if (!navigator.serviceWorker.controller) {
        // This page loaded before the worker took over: once it does, hand it what we
        // already downloaded (page, scripts, styles, editor) so this visit works offline too.
        navigator.serviceWorker.addEventListener("controllerchange", () => sendLoadedUrls(), { once: true });
      }
      return await navigator.serviceWorker.register(withBase("/sw.js"), { scope: withBase("/") });
    } catch {
      // No service worker (private mode, blocked, insecure origin): the site works without it.
      return null;
    }
  })();
  return registering;
}

/**
 * Ask the worker to keep an offline copy of the current page. Needed after a
 * client-side navigation, which fetches only the page's data, not its HTML.
 */
export function cacheCurrentPage() {
  if (!ENABLED || typeof navigator === "undefined" || !navigator.serviceWorker?.controller) return;
  navigator.serviceWorker.controller.postMessage({ type: "cache-urls", urls: [window.location.href.split("#")[0]] });
}

function sendLoadedUrls() {
  try {
    const own = (href: string) => href.startsWith(window.location.origin + withBase("/"));
    const urls = [
      window.location.href.split("#")[0],
      ...performance.getEntriesByType("resource").map((e) => e.name),
    ].filter(own);
    navigator.serviceWorker.controller?.postMessage({ type: "cache-urls", urls: [...new Set(urls)] });
  } catch {
    // Only an optimisation.
  }
}

/**
 * Resolves once the page is controlled by the service worker, or after `timeoutMs`.
 * On a first visit the worker takes a moment to install; starting the Python
 * worker after that means Pyodide is cached on the way in (no second download).
 * Returns immediately on later visits (already controlled) and where unsupported.
 */
export function whenServiceWorkerControls(timeoutMs: number): Promise<void> {
  if (!ENABLED || typeof navigator === "undefined" || !("serviceWorker" in navigator)) return Promise.resolve();
  if (navigator.serviceWorker.controller) return Promise.resolve();
  return new Promise((resolve) => {
    const done = () => {
      clearTimeout(timer);
      navigator.serviceWorker.removeEventListener("controllerchange", done);
      resolve();
    };
    const timer = setTimeout(done, timeoutMs);
    navigator.serviceWorker.addEventListener("controllerchange", done);
    registerServiceWorker().then((reg) => {
      // Not registered, or already active without controlling this page (e.g. after a
      // hard reload): no takeover is coming, so don't wait.
      if (!reg || (reg.active && !reg.installing && !reg.waiting)) done();
    });
  });
}

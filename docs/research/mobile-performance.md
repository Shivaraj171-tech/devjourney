# Mobile first load, offline play, and iOS memory

Follow-up to the Pyodide/phone risk in [`panel-market.md`](panel-market.md). Measured 2026-11-20.

## How it was measured

- Production build with `NEXT_PUBLIC_BASE_PATH=/devjourney`, `out/` copied to `<tmp>/devjourney/` and served from its parent, like GitHub Pages.
- Headless Chromium (Playwright), 390×844 phone viewport, **CPU throttled 4×** (`Emulation.setCPUThrottlingRate`).
- **Network: about 1.6 Mbit/s down (200 KB/s), 300 ms latency.** This is the "slow-3G-ish" profile. The throttling runs in the test server and covers every client: page, Python web worker and service worker. CDP `Network.emulateNetworkConditions` applies only to the page target, so service-worker fetches would not have been throttled. A first run with CDP-only throttling gave the same baseline (97 s vs 99 s).
- The server sends files uncompressed. GitHub Pages gzips text files, but the 9.4 MB `pyodide.asm.wasm` dominates either way.
- **Time to Python ready** runs from navigation start until "Run tests" is enabled, on `/ticket/s01-t01/`.

## Results

| Scenario | Before | After |
|---|---|---|
| First visit, straight to a ticket: bytes | 19.3 MB (48 requests) | **14.5 MB** (34) |
| First visit, straight to a ticket: Python ready | 99 s | **77 s** |
| Second visit (same browser): bytes | 9.6 MB (wasm downloaded again) | **0 B** |
| Second visit: Python ready | 54 s | **4.5 s** |
| Offline after one visit | page doesn't load | **ticket loads in 3.2 s, Run tests works** |
| HQ for 60 s, then open first ticket: Python ready | 98 s | **58 s** (prefetch had ~4.9 MB done; longer on HQ means faster) |
| HQ page itself: load / bytes | 3.9 s / 0.64 MB | 3.8 s / 0.68 MB |

What made the difference:

1. **Monaco waits for the Code step on phones.** It used to load about 4.8 MB behind the Brief step and compete with Pyodide for bandwidth. On desktop nothing changes.
2. **Service worker** (`scripts/sw.template.js`, generated into `public/sw.js` by `scripts/copy-assets.mjs`):
   - Pyodide and Monaco are cache-first, versioned by their npm package versions.
   - The runner files are cache-first, versioned by a content hash.
   - `_next/static` is cache-first; pages are network-first with an offline fallback.
   - On a first visit the Python worker waits up to 3 s for the service worker to take over. Pyodide is then cached as it downloads, with no second download.
   - Pages that loaded before the takeover hand their URLs to the worker, so the first visit already works offline.
3. **HQ prefetch.** When the browser is idle, `<link rel="prefetch">` fetches the Pyodide core files. It is skipped with Data Saver (`navigator.connection.saveData`) or on 2G.
   - Before: Chromium re-downloaded the 9.4 MB wasm on every visit. The HTTP cache didn't keep it, even with `Last-Modified`.

## iOS / low-memory findings

Renderer memory (RSS, headless Chromium, so this is a proxy for Safari):

| | Phone viewport | Desktop |
|---|---|---|
| Any page without Python (leaderboard) | ~130 MB | ~134 MB |
| Ticket page, Python ready | ~276 MB | ~361 MB (Monaco included) |
| + Code step opened (Monaco) | ~348 MB | — |

- **Pyodide costs about 145 MB and Monaco 70–85 MB.** On a phone, Monaco is now deferred until the Code step, so a learner who reads the brief and runs tests carries about 70 MB less.
- **Worker restarts.** An infinite loop makes `PythonRunner.reset()` terminate the worker and start a new Pyodide (another ~145 MB). WebKit has open reports of WASM memory not being released ([300782](https://bugs.webkit.org/show_bug.cgi?id=300782), [304810](https://bugs.webkit.org/show_bug.cgi?id=304810)). Several timeouts in a row could crash the tab on an older iPhone. No change for now. If real-device testing confirms it, add a reload prompt after N restarts.
- **Safari evicts storage.** Safari's 7-day cap on script-writable storage (ITP) applies to sites not added to the Home Screen. It can clear both the service-worker caches and `localStorage` progress after a week without a visit. This existed before this change for progress. Worth a "back up progress" feature or a web-app manifest later.
- **Safari APIs.** Safari has no `requestIdleCallback` (the prefetch falls back to a 2 s timeout) and no `navigator.connection` (so Data Saver can't be detected there). Module workers and service workers are supported from iOS 15/16.
- **Still needed: real devices.** These numbers are emulated. Check a cheap Android and an iPhone before calling this solved.

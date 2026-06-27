const CACHE = "gh-v1";
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", (e) => { const u = new URL(e.request.url); if (e.request.method !== "GET" || u.origin !== location.origin) return; e.respondWith(caches.open(CACHE).then(async (c) => { const h = await c.match(e.request); const n = fetch(e.request).then((r) => { c.put(e.request, r.clone()); return r; }).catch(() => h); return h || n; })); });

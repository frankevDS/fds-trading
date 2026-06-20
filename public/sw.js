// FDS Trading - minimal service worker
//
// This exists only to satisfy browser installability requirements (Chrome
// requires an active service worker before showing the "Install app" /
// "Add to Home Screen" prompt). It intentionally does no caching - every
// request just passes straight through to the network - so you always see
// the live app, never a stale cached copy.

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  event.respondWith(fetch(event.request));
});

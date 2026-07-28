// A simple service worker just to satisfy the PWA install requirement.
// No caching here on purpose — production data is real-time via Apps
// Script, so anything cached would just show stale state.
self.addEventListener('install', () => {
  self.skipWaiting(); // don't wait for every open tab to close before a
                       // newly deployed version of this file takes over
});

self.addEventListener('activate', (e) => {
  e.waitUntil(self.clients.claim()); // take control of already-open tabs
});

self.addEventListener('fetch', (e) => {
  // Pass-through fetch — every request (API calls, fonts, assets) goes
  // straight to the network, unmodified.
  e.respondWith(fetch(e.request));
});

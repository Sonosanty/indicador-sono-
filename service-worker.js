/* SONO PRO — Service Worker v4 (network-first SPA) */
"use strict";

const CACHE = 'sono-v4';
const ASSETS = [
  '/',
  '/index.html',
  '/app.js',
  '/manifest.json',
  '/favicon.svg',
];

self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE).then(function(cache) {
      return cache.addAll(ASSETS).catch(function(err) {
        console.warn('[SW] Pre-cache partial:', err.message);
      });
    })
  );
});

self.addEventListener('fetch', function(e) {
  var url = new URL(e.request.url);

  // Cache-bust: never cache scripts with ?_v= querystring
  if (url.searchParams.has('_v')) {
    e.respondWith(fetch(e.request).catch(function() {
      return caches.match(e.request);
    }));
    return;
  }

  // Network-first for HTML navigation (SPA — index-sono.html handles hash routing)
  if (e.request.mode === 'navigate' || url.pathname === '/') {
    e.respondWith(
      fetch(e.request).then(function(r) {
        return caches.open(CACHE).then(function(cache) {
          cache.put(e.request, r.clone());
          return r;
        });
      }).catch(function() {
        return caches.match(e.request);
      })
    );
    return;
  }

  // API calls: network only
  if (url.pathname.startsWith('/api/')) {
    return;
  }

  // External APIs: network first, cache fallback
  if (url.hostname !== self.location.hostname) {
    e.respondWith(
      fetch(e.request).catch(function() { return caches.match(e.request); })
    );
    return;
  }

  // Cache-first for known static assets
  if (ASSETS.indexOf(url.pathname) >= 0) {
    e.respondWith(
      caches.match(e.request).then(function(cached) {
        return cached || fetch(e.request).then(function(r) {
          return caches.open(CACHE).then(function(cache) {
            cache.put(e.request, r.clone());
            return r;
          });
        });
      })
    );
    return;
  }

  // Default: network-first for everything else
  e.respondWith(
    fetch(e.request).catch(function() {
      return caches.match(e.request);
    })
  );
});

self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) { return k !== CACHE; }).map(function(k) { return caches.delete(k); })
      );
    })
  );
});

/* SONO PRO — Service Worker v3 (network-first) */
"use strict";

const CACHE = 'sono-v3';
const ASSETS = [
  '/',
  '/assets/css/tokens.css',
  '/assets/css/base.css',
  '/assets/css/layout.css',
  '/assets/css/components.css',
  '/assets/css/mockup-overrides.css',
  '/assets/vendor/chart.umd.min.js',
  '/assets/vendor/luxon.min.js',
  '/assets/vendor/chartjs-adapter-luxon.umd.min.js',
  '/assets/vendor/chartjs-chart-financial.min.js',
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
  // Network-first for HTML
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
  // Cache-first for assets
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

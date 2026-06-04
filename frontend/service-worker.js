/**
 * Sono PRO Service Worker v2.0
 * Estrategias diferenciadas por tipo de recurso:
 * - API externa → network-only (sin cache)
 * - Assets estáticos → cache-first (CSS, JS, imágenes)
 * - JSON propio → network-first con timeout + stale-while-revalidate
 * - Deduplicación de requests en curso (fetch storms)
 */

const CACHE = 'sono-v2';
const SW_VERSION = '2.0';

// Tiempos de espera máximos por tipo
const TIMEOUTS = {
  klines: 8000,
  macro: 5000,
  ticker: 5000,
  static: 3000,
};

// Requests en curso (para deduplicar fetch storms)
const inflight = new Map();

self.addEventListener('install', (e) => {
  self.skipWaiting();
  console.log('[SW v' + SW_VERSION + '] Installed');
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((k) => k !== CACHE).map((k) => {
          console.log('[SW] Deleting old cache:', k);
          return caches.delete(k);
        })
      );
    }).then(() => self.clients.claim())
  );
});

// ── Determinar tipo de request ──
function getRequestType(url) {
  const hostname = url.hostname;
  const pathname = url.pathname;

  // API externas → network-only (no cache)
  if (hostname !== self.location.hostname) {
    if (hostname.includes('binance.com') ||
        hostname.includes('coingecko.com') ||
        hostname.includes('alternative.me') ||
        hostname.includes('kucoin.com') ||
        hostname.includes('sonosanty.workers.dev') ||
        hostname.includes('cdn.jsdelivr.net')) {
      return 'external-api';
    }
    // CDN fonts/images → cache-first
    if (hostname.includes('fonts.googleapis.com') ||
        hostname.includes('fonts.gstatic.com') ||
        hostname.includes('jsdelivr.net')) {
      return 'cdn-static';
    }
    return 'external-other';
  }

  // Propio dominio
  // Assets estáticos → cache-first
  if (pathname.match(/\.(css|js)$/i) ||
      pathname.match(/\.(svg|png|jpg|ico|woff2?)$/i)) {
    return 'static-asset';
  }

  // JSON de configuración → network-first con stale
  if (pathname.includes('sono-score-config.json') ||
      pathname.includes('manifest.json')) {
    return 'config-json';
  }

  // HTML → network-first
  if (pathname.match(/\.html$/) || pathname === '/' || pathname === '') {
    return 'document';
  }

  return 'other';
}

// ── Fetch con timeout ──
function fetchWithTimeout(request, timeoutMs) {
  return new Promise((resolve, reject) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    fetch(request, { signal: controller.signal })
      .then((res) => {
        clearTimeout(timer);
        resolve(res);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

// ── Deduplicación de requests ──
function dedupFetch(request, timeoutMs) {
  const key = request.url + '_' + (request.method || 'GET');
  if (inflight.has(key)) {
    return inflight.get(key);
  }
  const promise = fetchWithTimeout(request, timeoutMs)
    .then((res) => {
      inflight.delete(key);
      return res;
    })
    .catch((err) => {
      inflight.delete(key);
      throw err;
    });
  inflight.set(key, promise);
  return promise;
}

// ── Stale-while-revalidate ──
function staleWhileRevalidate(request, timeoutMs, cacheName) {
  const cachePromise = caches.open(cacheName || CACHE);
  return cachePromise.then((cache) => {
    return cache.match(request).then((cached) => {
      const fetchPromise = dedupFetch(request, timeoutMs || 5000)
        .then((response) => {
          if (response && response.ok) {
            cache.put(request, response.clone());
          }
          return response;
        })
        .catch(() => cached);
      
      return cached || fetchPromise;
    });
  });
}

// ── Cache-first con network fallback ──
function cacheFirst(request, timeoutMs) {
  return caches.open(CACHE).then((cache) => {
    return cache.match(request).then((cached) => {
      if (cached) return cached;
      return dedupFetch(request, timeoutMs || TIMEOUTS.static).then((response) => {
        if (response && response.ok) cache.put(request, response.clone());
        return response;
      }).catch(() => new Response('/* SW: cached resource not available */', {
        status: 503, statusText: 'Service Unavailable',
        headers: new Headers({ 'Content-Type': 'text/plain' })
      }));
    });
  });
}

// ── Network-first con timeout ──
function networkFirst(request, timeoutMs) {
  return caches.open(CACHE).then((cache) => {
    return dedupFetch(request, timeoutMs || TIMEOUTS.klines)
      .then((response) => {
        if (response && response.ok) cache.put(request, response.clone());
        return response;
      })
      .catch(() => cache.match(request).then((cached) => {
        return cached || new Response(null, { status: 408, statusText: 'Timeout' });
      }));
  });
}

// ── Manejo principal de fetch ──
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  const type = getRequestType(url);

  switch (type) {
    case 'external-api':
      // API externas: no cache, solo network con timeout
      e.respondWith(dedupFetch(e.request, TIMEOUTS.klines).catch(() => {
        return new Response(null, { status: 502 });
      }));
      break;

    case 'cdn-static':
      // CDN estático: cache-first
      e.respondWith(cacheFirst(e.request, TIMEOUTS.static));
      break;

    case 'static-asset':
      // CSS, JS, imágenes propias: cache-first con network refresh
      e.respondWith(staleWhileRevalidate(e.request, TIMEOUTS.static));
      break;

    case 'config-json':
      // Config: stale-while-revalidate (siempre fresco si hay red)
      e.respondWith(staleWhileRevalidate(e.request, TIMEOUTS.macro));
      break;

    case 'document':
      // HTML: network-first
      e.respondWith(networkFirst(e.request, TIMEOUTS.static));
      break;

    default:
      // Otros: network-first
      e.respondWith(networkFirst(e.request, TIMEOUTS.klines));
      break;
  }
});

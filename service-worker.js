// Sono Pro Service Worker v1.0
// Cache-first para assets estáticos, network-first para datos

const CACHE = 'sono-v1'
const ASSETS = [
  '/',
  '/index.html',
  '/rangos',
  '/metodo',
  '/trades',
  '/manifest.json',
  '/favicon.svg',
]

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
  )
  self.clients.claim()
})

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url)

  // API calls: network only
  if (url.pathname.startsWith('/api/')) {
    return
  }

  // External APIs: network first, cache fallback
  if (url.hostname !== self.location.hostname) {
    e.respondWith(
      fetch(e.request).catch(() => caches.match(e.request))
    )
    return
  }

  // Static assets: cache first
  e.respondWith(
    caches.match(e.request).then((cached) => cached || fetch(e.request).then((res) => {
      const clone = res.clone()
      caches.open(CACHE).then((c) => c.put(e.request, clone))
      return res
    }))
  )
})

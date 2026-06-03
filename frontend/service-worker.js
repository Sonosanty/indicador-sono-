// Sono Pro Service Worker v1.1
// Network-first para todo, cache como fallback
// NO precachea ASSETS en install (evita cachear 404s)

const CACHE = 'sono-v1'

self.addEventListener('install', (e) => {
  self.skipWaiting()
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
  )
  self.clients.claim()
})

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url)

  // Solo cacheamos nuestro propio dominio
  if (url.hostname !== self.location.hostname) {
    return
  }

  // Network-first: intenta red, cache como fallback
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        const clone = res.clone()
        caches.open(CACHE).then((c) => c.put(e.request, clone))
        return res
      })
      .catch(() => caches.match(e.request))
  )
})

/* Service worker for HTML Studio.

   Strategy: NETWORK FIRST for the app itself, cache only as a fallback.

   The previous version was cache-first, which is great offline but means a new
   upload can sit unseen on the phone for a long time. Now the app checks for a
   newer copy whenever there is a connection, and falls back to the stored copy
   the moment there isn't - so it still opens in aeroplane mode. */

const CACHE = 'html-studio-v4'
const FILES = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-180.png',
  './icon-192.png',
  './icon-512.png',
  './icon-512-maskable.png',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(FILES))
      .then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return

  // Anything the user's own page pulls from the internet goes straight to the
  // network - only this app's own files are cached.
  if (new URL(req.url).origin !== self.location.origin) return

  const path = new URL(req.url).pathname
  const isAppShell =
    req.mode === 'navigate' ||
    req.destination === 'document' ||
    /\.(html|webmanifest)$/.test(path) ||
    path.endsWith('/')

  if (isAppShell) {
    // Network first: always prefer a fresh copy, keep one for offline.
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone()
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {})
          return res
        })
        .catch(() => caches.match(req).then((hit) => hit || caches.match('./index.html')))
    )
    return
  }

  // Icons and the like never change - serve them from the cache.
  event.respondWith(
    caches.match(req).then((hit) => hit || fetch(req).then((res) => {
      const copy = res.clone()
      caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {})
      return res
    }))
  )
})

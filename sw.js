/* Service worker: makes HTML Studio open with no connection at all.
   Everything the app needs is in these few files, so we cache them on install
   and serve from the cache first. */

const CACHE = 'html-studio-v3'
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

  // Anything the user's own page pulls from the internet (a CDN library, a
  // video) goes straight to the network - only the app shell is cached.
  const sameOrigin = new URL(req.url).origin === self.location.origin
  if (!sameOrigin) return

  event.respondWith(
    caches.match(req).then((hit) => hit || fetch(req).then((res) => {
      const copy = res.clone()
      caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {})
      return res
    }).catch(() => caches.match('./index.html')))
  )
})

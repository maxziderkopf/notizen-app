const CACHE = 'notizen-v3';
const ASSETS = ['./', './index.html', './manifest.webmanifest', './icon.png', './icon-maskable.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Seite selbst: erst Netz (damit Updates sofort ankommen), sonst Cache.
// Icons und Manifest: erst Cache, das ändert sich kaum.
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const isPage = e.request.mode === 'navigate' || e.request.destination === 'document';

  if (isPage) {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put('./index.html', copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  e.respondWith(
    caches.match(e.request).then(hit => hit || fetch(e.request).then(res => {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(e.request, copy)).catch(() => {});
      return res;
    }))
  );
});

/* ---------- Erinnerungen ---------- */
self.addEventListener('push', e => {
  let d = { title: 'Termin', body: '' };
  try { if (e.data) d = e.data.json(); } catch (_) { try { d.body = e.data.text(); } catch (_) {} }
  e.waitUntil(self.registration.showNotification(d.title || 'Termin', {
    body: d.body || '',
    icon: './icon.png',
    badge: './icon.png',
    tag: d.tag || 'termin',
    renotify: true,
    vibrate: [90, 40, 90],
    data: { url: './index.html' }
  }));
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil((async () => {
    const all = await clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of all) { if ('focus' in c) return c.focus(); }
    return clients.openWindow((e.notification.data && e.notification.data.url) || './index.html');
  })());
});

const CACHE_NAME = 'ferme-management-v2';
const STATIC_CACHE = 'ferme-static-v2';
const API_CACHE = 'ferme-api-v2';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
];

// Install: cache app shell & skip waiting immediately
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// Activate: clean old caches and claim clients immediately
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key !== STATIC_CACHE && key !== API_CACHE && key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// Fetch: Network-first for API, Cache-first for static
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests (let them pass through)
  if (request.method !== 'GET') {
    return;
  }

  // Supabase API calls: Network-first with cache fallback
  if (url.hostname.includes('supabase')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const cloned = response.clone();
            caches.open(API_CACHE).then((cache) => {
              cache.put(request, cloned);
            });
          }
          return response;
        })
        .catch(() => {
          return caches.match(request);
        })
    );
    return;
  }

  // Navigation requests & HTML: Network-first with cache fallback
  if (request.mode === 'navigate' || url.pathname === '/' || url.pathname === '/index.html') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const cloned = response.clone();
            caches.open(STATIC_CACHE).then((cache) => {
              cache.put(request, cloned);
            });
          }
          return response;
        })
        .catch(() => caches.match('/index.html'))
    );
    return;
  }

  // Static hashed assets (Vite js, css, images): Cache-first
  if (url.pathname.match(/\.(js|css|png|jpg|jpeg|svg|ico|woff2?)$/)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) {
          return cached;
        }
        return fetch(request).then((response) => {
          if (response.ok) {
            const cloned = response.clone();
            caches.open(STATIC_CACHE).then((cache) => {
              cache.put(request, cloned);
            });
          }
          return response;
        });
      })
    );
    return;
  }
});

// Push notification handler
self.addEventListener('push', (event) => {
  if (!event.data) return;

  let data;
  try {
    data = event.data.json();
  } catch (e) {
    data = {
      title: 'FERME MANAGEMENT',
      body: event.data.text(),
      icon: '/icons/icon-192x192.png',
    };
  }

  const options = {
    body: data.body || data.message || '',
    icon: data.icon || '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      url: data.url || '/',
      id: data.id,
    },
    actions: data.actions || [],
    tag: data.tag || 'ferme-notification',
    renotify: true,
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'FERME MANAGEMENT', options)
  );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const url = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      // Focus existing window if available
      for (const client of clients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      // Open new window
      return self.clients.openWindow(url);
    })
  );
});

// Background sync for offline mutations
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-mutations') {
    event.waitUntil(syncPendingMutations());
  }
});

async function syncPendingMutations() {
  // This will be handled by the main app's sync engine
  // The service worker just triggers the sync event
  const clients = await self.clients.matchAll({ type: 'window' });
  for (const client of clients) {
    client.postMessage({ type: 'SYNC_REQUESTED' });
  }
}

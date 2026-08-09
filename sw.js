const CACHE_NAME = 'chat-app-v1';
const urlsToCache = [
    '/',
    '/index.html',
    '/chat.html',
    '/css/style.css',
    '/js/app.js'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(urlsToCache))
    );
    self.skipWaiting();
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                if (response) return response;
                return fetch(event.request);
            })
    );
});

// Handle push notifications
self.addEventListener('push', event => {
    const data = event.data ? event.data.json() : {};
    const title = data.title || 'New Message';
    const body = data.body || 'You have a new message';
    const icon = data.icon || 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">💌</text></svg>';

    event.waitUntil(
        self.registration.showNotification(title, {
            body: body,
            icon: icon,
            badge: icon,
            vibrate: [200, 100, 200],
            tag: 'chat-message',
            renotify: true
        })
    );
});

// Handle notification click
self.addEventListener('notificationclick', event => {
    event.notification.close();
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true })
            .then(clientList => {
                for (const client of clientList) {
                    if (client.url.includes('chat.html') && 'focus' in client) {
                        return client.focus();
                    }
                }
                if (clients.openWindow) {
                    return clients.openWindow('/chat.html');
                }
            })
    );
});

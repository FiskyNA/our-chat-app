// Import Firebase messaging for background push handling
importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-messaging-compat.js');

firebase.initializeApp({
    apiKey: "AIzaSyDfOgdnm_-_YAhgpD-OLQO0z8tleYLzcNY",
    authDomain: "our-chat-10f48.firebaseapp.com",
    projectId: "our-chat-10f48",
    storageBucket: "our-chat-10f48.firebasestorage.app",
    messagingSenderId: "838349485901",
    appId: "1:838349485901:web:27be8e6f1117f91543a904"
});

const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage(function(payload) {
    const title = payload.notification?.title || 'Our Chat';
    const body = payload.notification?.body || 'New message';
    const icon = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">💬</text></svg>';

    self.registration.showNotification(title, {
        body: body,
        icon: icon,
        badge: icon,
        vibrate: [200, 100, 200],
        requireInteraction: true
    });
});

self.addEventListener('notificationclick', function(event) {
    event.notification.close();
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(windowClients) {
            for (var i = 0; i < windowClients.length; i++) {
                var client = windowClients[i];
                if (client.url.indexOf('chat.html') !== -1 && 'focus' in client) {
                    return client.focus();
                }
            }
            return clients.openWindow('chat.html');
        })
    );
});

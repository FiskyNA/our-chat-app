self.addEventListener('notificationclick', event => {
    event.notification.close();
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
            for (const client of windowClients) {
                if (client.url.includes('chat.html') && 'focus' in client) {
                    return client.focus();
                }
            }
            return clients.openWindow('chat.html');
        })
    );
});

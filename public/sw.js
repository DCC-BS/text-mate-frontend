self.addEventListener("install", (e) => {
    self.skipWaiting();
});

self.addEventListener("activate", (e) => {
    self.registration
        .unregister()
        .then(() => self.clients.matchAll())
        .then((clients) => {
            clients.forEach((client) => {
                if (client.url && "navigate" in client) {
                    client.navigate(client.url);
                }
            });
        })
        .then(() => {
            self.caches.keys().then((cacheNames) => {
                Promise.all(
                    cacheNames.map((cacheName) =>
                        self.caches.delete(cacheName),
                    ),
                );
            });
        });
});

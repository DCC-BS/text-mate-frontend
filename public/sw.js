self.addEventListener("install", (_e) => {
    self.skipWaiting();
});

self.addEventListener("activate", (_e) => {
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

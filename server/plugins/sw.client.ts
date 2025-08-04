export default defineNitroPlugin((nitroApp) => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
          registrations.forEach((registration) => {
          registration.unregister(); // Unregister all service workers
          });
      });

    if ('caches' in window) {
      caches.keys().then((cacheNames) => {
        cacheNames.forEach((cacheName) => {
          caches.delete(cacheName); // Delete all caches
        });
      });
    }
  }
});
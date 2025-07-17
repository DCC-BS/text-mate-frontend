/**
 * Middleware to handle PWA-related requests that shouldn't be processed by Vue Router
 * This prevents 404 errors and Vue Router warnings for service worker files
 */
export default defineEventHandler(async (event) => {
    const url = getRouterParam(event, "path") || event.node.req.url || "";

    // Only process if we have a valid URL
    if (!url) return;

    // List of PWA-related paths that should return 204 No Content in development
    const pwaFiles = ["/sw.js", "/manifest.webmanifest", "/workbox-*.js"];

    // Check if this is a PWA-related request
    const isPwaRequest = pwaFiles.some((pattern) => {
        if (pattern.includes("*")) {
            const regex = new RegExp(pattern.replace("*", ".*"));
            return regex.test(url);
        }
        return url === pattern;
    });

    if (isPwaRequest) {
        // In development, return empty response to prevent 404 errors
        if (process.dev) {
            setResponseStatus(event, 204); // No Content
            return "";
        }
    }
});

// Conditionally use authHandler if available, otherwise use backendHandlerBuilder
// Check if authHandler exists at runtime to support different layer configurations

/**
 * Initialize the API handler based on available layers.
 * Prefers authHandler from the auth layer if available, otherwise falls back to backendHandlerBuilder.
 * @returns The appropriate API handler based on which layer is loaded
 */
function initializeApiHandler(): ReturnType<typeof backendHandlerBuilder> {
    try {
        // Try to access authHandler from the auth layer
        // @ts-expect-error - authHandler may not exist if auth layer is not loaded
        if (typeof authHandler !== 'undefined' && authHandler) {
            // @ts-expect-error - authHandler may not exist if auth layer is not loaded
            return authHandler;
        }
    } catch {
        // authHandler not available, continue to fallback
    }

    // Fallback to backendHandlerBuilder when auth layer is not present
    return backendHandlerBuilder();
}

// Initialize and export the API handler
export const apiHandler = initializeApiHandler();

export default defineEventHandler(async (event) => {
    if (
        process.env.DUMMY === "true" &&
        event.node.req.url &&
        event.node.req.url.startsWith("/api/") &&
        !event.node.req.url.startsWith("/api/auth/") &&
        !event.node.req.url.startsWith("/api/_") &&
        !event.node.req.url.includes("/dummy/") &&
        !event.node.req.url.includes("/changelogs")
    ) {
        const originalUrl = event.node.req.url;
        const redirectUrl = originalUrl.replace("/api/", "/api/dummy/");

        return sendRedirect(
            event,
            redirectUrl,
            307, // or 308 for permanent redirect
        );
    }
});

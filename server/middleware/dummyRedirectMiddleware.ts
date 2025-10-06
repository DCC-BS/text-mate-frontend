export default defineEventHandler(async (event) => {
    if (
        process.env.DUMMY &&
        event.node.req.url &&
        !event.node.req.url.includes("/dummy/")
    ) {
        sendRedirect(event, event.node.req.url.replace("/api/", "/api/dummy/"));
    }
});

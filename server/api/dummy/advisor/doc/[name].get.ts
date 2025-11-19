export default defineEventHandler(async (_) => {
    throw createError({
        cause: "Not implemented",
        statusCode: 501,
        statusMessage: "Not implemented",
    });
});

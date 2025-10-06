export default defineEventHandler(async (event) => {
    const { text, docs } = await readBody(event);

    if (!text || !docs) {
        throw createError({
            statusCode: 400,
            statusMessage: "Invalid input",
        });
    }

    return {};
});

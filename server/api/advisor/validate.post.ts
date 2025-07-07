export default defineBackendHandler({
    url: "advisor/validate",
    async bodyProvider(event) {
        const { text, docs } = await readBody(event);

        if (!text || !docs) {
            throw createError({
                statusCode: 400,
                statusMessage: "Invalid input",
            });
        }

        return { text, docs };
    },
});

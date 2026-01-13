export default defineEventHandler(async (event) => {
    const body = await readBody(event);
    return {
        rewrittenText: `Rewritten: ${body.text}`,
    };
});

export default defineEventHandler(async (event) => {
    const body = await readBody(event);
    return {
        synonyms: [
            `Synonym1 for: ${body.word}`,
            `Synonym2 for: ${body.word}`,
            `Synonym3 for: ${body.word}`,
        ],
    };
});

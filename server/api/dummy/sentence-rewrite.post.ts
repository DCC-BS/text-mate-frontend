export default defineEventHandler(async (event) => {
    const body = await readBody(event);
    return {
        rewrittenSentence: `Rewritten Sentence: ${body.sentence}`,
    };
});

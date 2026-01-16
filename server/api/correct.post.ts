import type { FetcherOptions } from "#layers/backend_communication/server/types/fetcher";

type BodyType = { text: string };

export default apiHandler
    .withMethod("POST")
    .withBodyProvider<BodyType>()
    .withDummyFetcher(dummyFetcher)
    .build("/text-correction");

// DUMMY

type TextCorrectionBlock = {
    id: string;
    original: string;
    corrected: string[];
    explanation: string;
    offset: number;
    length: number;
};

type TextCorrectionResponse = {
    original: string;
    blocks: Omit<TextCorrectionBlock, "id">[];
};

function dummyFetcher(options: FetcherOptions<BodyType>) {
    const body = options.body;

    if (!body?.text || typeof body.text !== "string") {
        throw createError({
            statusCode: 400,
            message:
                'Invalid request body: "text" field is required and must be a string',
        });
    }

    const allWords = body.text.split(" ");

    const words = [];
    let currentOffset = 0;

    for (const [i, word] of allWords.entries()) {
        if (i % 2 !== 0) {
            words.push({
                text: word,
                offset: currentOffset,
                length: word.length,
            });
        }

        currentOffset += word.length + 1;
    }

    return {
        blocks: words.map((word) => ({
            original: word.text,
            corrected: [`${word.text}-corrected1`, `${word.text}-corrected2`],
            explanation: "Just a dummy correction.",
            offset: word.offset,
            length: word.length,
        })),
        original: body.text,
    } as TextCorrectionResponse;
}

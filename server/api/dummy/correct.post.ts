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

type CorrectedSegments = {
    id: string;
    text: string;
    from: number;
    to: number;
    blocks: TextCorrectionBlock[];
};

export default defineEventHandler(async (event) => {
    const body = await readBody<{ text: string }>(event);

    const allWords = body.text.split(" ");

    const words = [];
    let currentOffset = 0;

    // Solution 1: Use non-null assertion operator (!) when you're sure it's safe
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
});

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

export default defineEventHandler(async (event) => {
    const body = await readBody<{ text: string }>(event);

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
});

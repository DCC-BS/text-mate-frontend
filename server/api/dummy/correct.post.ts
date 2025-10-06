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

export default defineEventHandler((event) => {
    return {
        blocks: [],
        original: "",
    } as TextCorrectionResponse;
});

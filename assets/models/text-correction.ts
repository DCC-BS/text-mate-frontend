export type TextCorrectionBlock = {
    id: string;
    original: string;
    corrected: string[];
    explanation: string;
    offset: number;
    length: number;
};

export type TextCorrectionResponse = {
    original: string;
    blocks: Omit<TextCorrectionBlock, "id">[];
};

export type CorrectedSentence = {
    id: string;
    text: string;
    from: number;
    to: number;
    blocks: TextCorrectionBlock[];
};

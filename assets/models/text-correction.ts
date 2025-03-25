export type TextCorrectionBlock = {
    original: string;
    corrected: string[];
    explanation: string;
    offset: number;
    length: number;
};

export type TextCorrectionResponse = {
    original: string;
    blocks: TextCorrectionBlock[];
};

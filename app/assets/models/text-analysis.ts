export type TextAnalysisInput = {
    text: string;
};

export type TextAnalysisResult = {
    // ZIX understandability score (-10 to 10); null if text is too short
    zix_score: number | null;
    // CEFR level (A1–C2); null if score could not be computed
    cefr_level: string | null;
};

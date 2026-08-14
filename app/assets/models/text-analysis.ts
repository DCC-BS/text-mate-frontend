import type { ReadabilityBand } from "~~/shared/types/simplify";

export type TextAnalysisInput = {
    text: string;
};

export type TextAnalysisResult = {
    // ZIX understandability score (-10 to 10); null if text is too short
    zix_score: number | null;
    // CEFR level (A1–C2); null if score could not be computed.
    // Only German and English have a CEFR mapping — see spec §10.
    cefr_level: string | null;
    // The fields below are the additive, language-aware extension of the
    // endpoint (backend T2.4). They are optional so the frontend keeps working
    // against a backend that has not shipped them yet.
    // Detected language of the text; absent when detection was inconclusive
    language?: string | null;
    // Raw score on that language's own metric
    score?: number | null;
    // Name of the metric: ZIX | CEFR | LIX | Gulpease
    score_label?: string | null;
    // Calibrated band of the score
    band?: ReadabilityBand | null;
};

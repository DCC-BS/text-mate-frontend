import type { ReadabilityBand } from "#shared/types/simplify";

export type TextAnalysisInput = {
    text: string;
};

export type TextAnalysisResult = {
    /** Detected ISO 639-1 code ("de", "en", "fr", "it"), or unsupported code ("es", "zh"), or null if inconclusive */
    language: string | null;
    /** Raw metric value (ZIX: -10 to +10, Flesch/LIX/Gulpease: 0 to 100). Null for unsupported languages */
    score: number | null;
    /** Metric label: "ZIX" | "CEFR" | "LIX" | "Gulpease" | null */
    score_label: string | null;
    /** Calibrated band: "easy" (target) | "ok" | "hard" | null */
    band: ReadabilityBand | null;
    /** CEFR level: "A1" | "A2" | "B1" | "B2" | "C1" | "C2" | null (Only populated for DE and EN) */
    cefr_level: string | null;
    /** Legacy German ZIX score (-10 to +10). Populated only for German */
    zix_score: number | null;
};

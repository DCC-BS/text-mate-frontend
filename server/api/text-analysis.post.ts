import { z } from "zod";
import type { FetcherOptions } from "#layers/backend_communication/server/types/fetcher";
import type {
    TextAnalysisInput,
    TextAnalysisResult,
} from "#shared/types/textAnalysis";

export const TextAnalysisInputSchema = z.object({
    text: z.string(),
});

type BodyType = TextAnalysisInput;

/** Stopwords used for dummy language detection */
const DUMMY_STOPWORDS: Record<string, string[]> = {
    de: ["der", "die", "das", "und", "ist", "nicht", "sie", "für", "mit"],
    en: ["the", "and", "is", "of", "to", "you", "with", "for", "this"],
    fr: ["le", "la", "les", "et", "est", "vous", "pour", "des", "une"],
    it: ["il", "la", "e", "che", "di", "per", "sono", "con", "non"],
    es: ["el", "la", "de", "que", "en", "los", "se", "del", "por", "un"],
};

/**
 * Detect language based on simple stopword matching for dummy analysis.
 */
function detectDummyLanguage(text: string): string | null {
    const words = text.toLowerCase().match(/[\p{L}']+/gu) ?? [];
    if (words.length < 3) {
        return null;
    }

    const scores = Object.entries(DUMMY_STOPWORDS)
        .map(([lang, stopwords]) => ({
            lang,
            hits: words.filter((w) => stopwords.includes(w)).length,
        }))
        .sort((a, b) => b.hits - a.hits);

    const top = scores[0];
    if (top && top.hits > 0) {
        return top.lang;
    }
    return null;
}

/**
 * Dummy fetcher for text analysis returning language-specific metrics.
 */
function dummyFetcher(options: FetcherOptions<BodyType>): TextAnalysisResult {
    const text = options.body.text ?? "";
    if (text.trim().length === 0) {
        return {
            language: null,
            score: null,
            score_label: null,
            band: null,
            cefr_level: null,
            zix_score: null,
        };
    }

    const lang = detectDummyLanguage(text);
    if (lang === null) {
        return {
            language: null,
            score: null,
            score_label: null,
            band: null,
            cefr_level: null,
            zix_score: null,
        };
    }

    if (lang === "de") {
        return {
            language: "de",
            score: 1.5,
            score_label: "ZIX",
            band: "easy",
            cefr_level: "B2",
            zix_score: 1.5,
        };
    }

    if (lang === "en") {
        return {
            language: "en",
            score: 68.2,
            score_label: "CEFR",
            band: "easy",
            cefr_level: "B1",
            zix_score: null,
        };
    }

    if (lang === "fr") {
        return {
            language: "fr",
            score: 38.5,
            score_label: "LIX",
            band: "easy",
            cefr_level: null,
            zix_score: null,
        };
    }

    if (lang === "it") {
        return {
            language: "it",
            score: 75.0,
            score_label: "Gulpease",
            band: "ok",
            cefr_level: null,
            zix_score: null,
        };
    }

    return {
        language: lang,
        score: null,
        score_label: null,
        band: null,
        cefr_level: null,
        zix_score: null,
    };
}

/**
 * Nuxt API route for text analysis.
 * Proxies POST requests to `/text-analysis` on the FastAPI backend.
 */
export default apiHandler
    .withMethod("POST")
    .withBodyProvider<BodyType>(async (event) => {
        const body = await readBody(event);
        const result = TextAnalysisInputSchema.safeParse(body);
        if (!result.success) {
            throw createError({
                statusCode: 400,
                statusMessage: "Invalid input",
                data: z.prettifyError(result.error),
            });
        }
        return result.data;
    })
    .withDummyFetcher(dummyFetcher)
    .build("/text-analysis");

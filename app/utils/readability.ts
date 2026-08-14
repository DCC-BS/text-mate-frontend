import { hasCefrMapping, type ReadabilityBand } from "~~/shared/types/simplify";

/**
 * Presentation helpers for readability scores. Framework-agnostic on purpose:
 * the same rules drive the text-stats badge and the diff header.
 *
 * The one rule that matters (spec §10): only `de` and `en` map their metric
 * onto a CEFR level. `fr` (LIX) and `it` (Gulpease) have none, and an
 * unsupported language is not scored at all — so a level is shown when, and
 * only when, the backend sent one.
 */

/** A score as reported by the backend, in the analyzer's own scale. */
export type ReadabilityScore = {
    /** False for languages without an analyzer: render nothing at all. */
    scored: boolean;
    /** Detected language; absent when detection was inconclusive. */
    language?: string;
    /** Metric name, e.g. `ZIX`, `CEFR`, `LIX`, `Gulpease`. */
    scoreLabel?: string;
    /** Raw score on the metric's own scale. */
    score?: number;
    band?: ReadabilityBand;
    /** CEFR level — only ever sent for `de` and `en`. */
    cefr?: string;
};

/**
 * True when a CEFR level may be rendered: the backend sent one, and the
 * detected language is one that has a mapping (or is unknown, in which case the
 * presence of the level is the only evidence we have — we still never invent
 * one ourselves).
 */
export function showsCefrLevel(value: ReadabilityScore): boolean {
    if (!value.scored || value.cefr === undefined || value.cefr === "") {
        return false;
    }
    return value.language === undefined || hasCefrMapping(value.language);
}

/**
 * True when the metric itself should be rendered (`LIX 38`), i.e. there is a
 * score but no CEFR level to show in its place.
 */
export function showsRawScore(value: ReadabilityScore): boolean {
    return value.scored && value.score !== undefined && !showsCefrLevel(value);
}

/** True when there is nothing at all to render. */
export function isUnscored(value: ReadabilityScore): boolean {
    return !showsCefrLevel(value) && !showsRawScore(value);
}

/** One decimal place — the scales are coarse, more digits imply false precision. */
export function formatScore(score: number): string {
    return score.toFixed(1);
}

/** Colour of a CEFR level: blue = easy, orange = medium, red = complex. */
export function cefrLevelClass(cefr: string | undefined): string {
    const level = (cefr ?? "").toUpperCase();
    if (level === "A1" || level === "A2") {
        return "text-blue-500 dark:text-blue-400";
    }
    if (level === "B1" || level === "B2") {
        return "text-orange-500 dark:text-orange-400";
    }
    if (level === "C1" || level === "C2") {
        return "text-red-500 dark:text-red-400";
    }
    return "text-gray-400 dark:text-gray-500";
}

/** Colour of a readability band, matching the CEFR palette above. */
export function bandClass(band: ReadabilityBand | undefined): string {
    if (band === "easy") {
        return "text-blue-500 dark:text-blue-400";
    }
    if (band === "ok") {
        return "text-orange-500 dark:text-orange-400";
    }
    if (band === "hard") {
        return "text-red-500 dark:text-red-400";
    }
    return "text-gray-400 dark:text-gray-500";
}

/** i18n key of a band's label. */
export function bandLabelKey(band: ReadabilityBand): string {
    return `simplify.band.${band}`;
}

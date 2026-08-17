import { z } from "zod";
import type { FetcherOptions } from "#layers/backend_communication/server/types/fetcher";
import {
    type ReadabilityBand,
    type SimplifyEvent,
    type SimplifyInput,
    SimplifyInputSchema,
    type UnconvergedRange,
} from "~~/shared/types/simplify";

type BodyType = SimplifyInput;

export default apiHandler
    .withMethod("POST")
    .withBodyProvider<BodyType>(async (event) => {
        const body = await readBody(event);

        const result = SimplifyInputSchema.safeParse(body);

        if (!result.success) {
            throw createError({
                statusCode: 400,
                statusMessage: "Invalid input",
                data: z.prettifyError(result.error),
            });
        }

        return result.data;
    })
    .withRawFetcher()
    .withDummyFetcher(dummyFetcher)
    .build("/simplify");

// DUMMY

const CHUNKING_THRESHOLD_CHARS = 8000;

function dummyFetcher(options: FetcherOptions<BodyType>): Response {
    const text = options.body.text;
    const paragraphs = text.split("\n\n");
    const simplifiedParagraphs = paragraphs.map(simplifyDummyParagraph);
    const simplifiedText = simplifiedParagraphs.join("\n\n");

    const language = detectDummyLanguage(text);
    const analyzer =
        language === undefined ? undefined : DUMMY_ANALYZERS[language];

    const events =
        analyzer === undefined
            ? unscoredEvents(language, simplifiedText)
            : text.length > CHUNKING_THRESHOLD_CHARS
              ? chunkedEvents(
                    analyzer,
                    paragraphs,
                    simplifiedParagraphs,
                    simplifiedText,
                )
              : wholeEvents(analyzer, text, simplifiedParagraphs);

    return new Response(toJsonlStream(events), {
        headers: {
            "Content-Type": "application/x-ndjson",
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            Connection: "keep-alive",
        },
    });
}

function paragraphRanges(paragraphs: string[]): UnconvergedRange[] {
    const ranges: UnconvergedRange[] = [];
    let cursor = 0;
    for (const paragraph of paragraphs) {
        ranges.push({ start: cursor, end: cursor + paragraph.length });
        cursor += paragraph.length + 2;
    }
    return ranges;
}

function unconvergedRangesOf(
    paragraphs: string[],
    unconvergedIndices: number[],
): UnconvergedRange[] {
    const ranges = paragraphRanges(paragraphs);
    return unconvergedIndices
        .map((index) => ranges[index])
        .filter((range): range is UnconvergedRange => range !== undefined);
}

function wholeEvents(
    analyzer: DummyAnalyzer,
    text: string,
    simplifiedParagraphs: string[],
): SimplifyEvent[] {
    const simplifiedText = simplifiedParagraphs.join("\n\n");
    const unitCount = simplifiedParagraphs.length;
    const before = analyzer.score(text);
    const after = analyzer.score(simplifiedText);
    const midway = round(before + (after - before) / 2);
    const inTargetMidway = Math.max(1, Math.floor(unitCount / 2));

    const perUnitResults = simplifiedParagraphs.map((paragraph, index) => {
        const score = analyzer.score(paragraph);
        const band = analyzer.band(score);
        return { index, converged: band === "easy" };
    });
    const unconverged = perUnitResults
        .filter((res) => !res.converged)
        .map((res) => res.index);
    const converged = unconverged.length === 0;
    const unconvergedRanges = unconvergedRangesOf(
        simplifiedParagraphs,
        unconverged,
    );
    const inTargetFinal = Math.max(0, unitCount - unconverged.length);

    return [
        {
            event: "start",
            language: analyzer.language,
            score_label: analyzer.scoreLabel,
            scored: true,
            mode: "whole",
            units: unitCount,
            score_before: before,
            band_before: analyzer.band(before),
            cefr_before: analyzer.cefr(before),
        },
        {
            event: "progress",
            attempt: 1,
            stage: "rewriting",
            units_in_target: 0,
        },
        {
            event: "progress",
            attempt: 1,
            stage: "readability",
            score: midway,
            band: analyzer.band(midway),
            cefr: analyzer.cefr(midway),
            units_in_target: inTargetMidway,
        },
        {
            event: "progress",
            attempt: 2,
            stage: "rewriting",
            units_in_target: inTargetMidway,
        },
        {
            event: "progress",
            attempt: 2,
            stage: "readability",
            score: after,
            band: analyzer.band(after),
            cefr: analyzer.cefr(after),
            units_in_target: inTargetFinal,
        },
        {
            event: "done",
            text: simplifiedText,
            language: analyzer.language,
            score_label: analyzer.scoreLabel,
            scored: true,
            score_before: before,
            score_after: after,
            band_before: analyzer.band(before),
            band_after: analyzer.band(after),
            cefr_before: analyzer.cefr(before),
            cefr_after: analyzer.cefr(after),
            converged,
            unconverged_units: unconverged,
            unconverged_ranges: unconvergedRanges,
            rewrite_failures: 0,
        },
    ];
}

function chunkedEvents(
    analyzer: DummyAnalyzer,
    paragraphs: string[],
    simplifiedParagraphs: string[],
    simplifiedText: string,
): SimplifyEvent[] {
    const fullText = paragraphs.join("\n\n");
    const before = analyzer.score(fullText);
    const after = analyzer.score(simplifiedText);
    const midway = round(before + (after - before) / 2);

    const rewritten = paragraphs
        .map((paragraph, index) => ({ paragraph, index }))
        .filter((unit) => unit.paragraph.trim().split(/\s+/).length > 5)
        .slice(0, 4);

    const emissionOrder = [2, 0, 3, 1].filter(
        (position) => position < rewritten.length,
    );

    const chunkEvents: SimplifyEvent[] = emissionOrder.map((position, nth) => {
        const unit = rewritten[position];
        const index = unit?.index ?? 0;
        const chunkBefore = analyzer.score(paragraphs[index] ?? "");
        const chunkAfter = analyzer.score(simplifiedParagraphs[index] ?? "");
        const converged = nth < emissionOrder.length - 1;

        return {
            event: "chunk_done",
            index,
            text: simplifiedParagraphs[index] ?? "",
            score_before: chunkBefore,
            score_after: converged ? chunkAfter : chunkBefore,
            cefr_before: analyzer.cefr(chunkBefore),
            cefr_after: analyzer.cefr(converged ? chunkAfter : chunkBefore),
            attempts: converged ? 1 : 3,
            converged,
        };
    });

    const unconverged = chunkEvents
        .filter((event) => event.event === "chunk_done" && !event.converged)
        .map((event) => (event.event === "chunk_done" ? event.index : 0));
    const converged = unconverged.length === 0;
    const unconvergedRanges = unconvergedRangesOf(
        simplifiedParagraphs,
        unconverged,
    );

    return [
        {
            event: "start",
            language: analyzer.language,
            score_label: analyzer.scoreLabel,
            scored: true,
            mode: "chunked",
            units: paragraphs.length,
            score_before: before,
            band_before: analyzer.band(before),
            cefr_before: analyzer.cefr(before),
        },
        {
            event: "progress",
            attempt: 1,
            stage: "rewriting",
            units_in_target: Math.max(0, paragraphs.length - rewritten.length),
        },
        {
            event: "progress",
            attempt: 1,
            stage: "readability",
            score: before,
            band: analyzer.band(before),
            cefr: analyzer.cefr(before),
            units_in_target: Math.max(0, paragraphs.length - rewritten.length),
        },
        ...chunkEvents.slice(0, 2),
        {
            event: "progress",
            attempt: 2,
            stage: "readability",
            score: midway,
            band: analyzer.band(midway),
            cefr: analyzer.cefr(midway),
            units_in_target: Math.max(
                0,
                paragraphs.length - rewritten.length + 2,
            ),
        },
        ...chunkEvents.slice(2),
        {
            event: "done",
            text: simplifiedText,
            language: analyzer.language,
            score_label: analyzer.scoreLabel,
            scored: true,
            score_before: before,
            score_after: after,
            band_before: analyzer.band(before),
            band_after: analyzer.band(after),
            cefr_before: analyzer.cefr(before),
            cefr_after: analyzer.cefr(after),
            converged,
            unconverged_units: unconverged,
            unconverged_ranges: unconvergedRanges,
            rewrite_failures: 0,
        },
    ];
}

function unscoredEvents(
    language: string | undefined,
    simplifiedText: string,
): SimplifyEvent[] {
    return [
        {
            event: "start",
            language,
            scored: false,
            mode: "whole",
            units: simplifiedText.split("\n\n").length,
        },
        // No metric, so no measurement event — but the phase is still announced,
        // because the client needs to show something while the model works.
        {
            event: "progress",
            attempt: 1,
            stage: "rewriting",
        },
        {
            event: "done",
            text: simplifiedText,
            language,
            scored: false,
            converged: true,
            unconverged_units: [],
            unconverged_ranges: [],
            rewrite_failures: 0,
        },
    ];
}

/**
 * A stand-in for one backend readability analyzer: a crude sentence-length
 * based score on that language's scale, its band calibration and — for `de`
 * and `en` only — a CEFR mapping.
 */
type DummyAnalyzer = {
    language: string;
    scoreLabel: string;
    score: (text: string) => number;
    band: (score: number) => ReadabilityBand;
    cefr: (score: number) => string | undefined;
};

/** Mean words per sentence, the single driver of every dummy score. */
function meanSentenceLength(text: string): number {
    const sentences = text
        .split(/[.!?]+/)
        .map((sentence) => sentence.trim())
        .filter((sentence) => sentence.length > 0);
    const words = (text.match(/\S+/g) ?? []).length;
    if (sentences.length === 0 || words === 0) {
        return 0;
    }
    return words / sentences.length;
}

function round(value: number): number {
    return Math.round(value * 10) / 10;
}

function clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
}

/** ZIX → CEFR mapping of the German analyzer (backend §2.1). */
function zixToCefr(score: number): string {
    if (score >= 4) return "A1";
    if (score >= 2) return "A2";
    if (score >= 0) return "B1";
    if (score >= -2) return "B2";
    if (score >= -4) return "C1";
    return "C2";
}

const DUMMY_ANALYZERS: Record<string, DummyAnalyzer> = {
    // ZIX, [-10, 10], higher is easier; easy ⇔ ZIX >= 0.
    de: {
        language: "de",
        scoreLabel: "ZIX",
        score: (text) =>
            round(clamp(8 - meanSentenceLength(text) * 0.5, -10, 10)),
        band: (score) => (score >= 0 ? "easy" : score >= -2 ? "ok" : "hard"),
        cefr: (score) => zixToCefr(score),
    },
    // Flesch Reading Ease mapped to CEFR; easy >= 60, ok >= 50.
    en: {
        language: "en",
        scoreLabel: "CEFR",
        score: (text) =>
            round(clamp(110 - meanSentenceLength(text) * 2.2, 0, 100)),
        band: (score) => (score >= 60 ? "easy" : score >= 50 ? "ok" : "hard"),
        cefr: (score) =>
            score >= 80 ? "A2" : score >= 60 ? "B1" : score >= 50 ? "B2" : "C1",
    },
    // LIX, lower is easier; easy <= 40, ok <= 59. No CEFR mapping.
    fr: {
        language: "fr",
        scoreLabel: "LIX",
        score: (text) => round(clamp(meanSentenceLength(text) * 1.8, 0, 100)),
        band: (score) => (score <= 40 ? "easy" : score <= 59 ? "ok" : "hard"),
        cefr: () => undefined,
    },
    // Gulpease, higher is easier; easy >= 80, ok >= 60. No CEFR mapping.
    it: {
        language: "it",
        scoreLabel: "Gulpease",
        score: (text) =>
            round(clamp(105 - meanSentenceLength(text) * 1.6, 0, 100)),
        band: (score) => (score >= 80 ? "easy" : score >= 60 ? "ok" : "hard"),
        cefr: () => undefined,
    },
};

/** Stopword sets used for the dummy stand-in of `fast-langdetect`. */
const DUMMY_STOPWORDS: Record<string, string[]> = {
    de: [
        "der",
        "die",
        "das",
        "und",
        "ist",
        "nicht",
        "sie",
        "werden",
        "für",
        "mit",
    ],
    en: ["the", "and", "is", "of", "to", "you", "with", "for", "are", "this"],
    fr: ["le", "la", "les", "et", "est", "vous", "pour", "des", "une", "dans"],
    it: ["il", "la", "e", "che", "di", "per", "sono", "con", "non", "una"],
};

function detectDummyLanguage(text: string): string | undefined {
    const words = text.toLowerCase().match(/[\p{L}']+/gu) ?? [];
    if (words.length === 0) {
        return undefined;
    }

    const hitsByLanguage = Object.entries(DUMMY_STOPWORDS)
        .map(([language, stopwords]) => ({
            language,
            hits: words.filter((word) => stopwords.includes(word)).length,
        }))
        .sort((a, b) => b.hits - a.hits);

    const best = hitsByLanguage[0];
    const runnerUp = hitsByLanguage[1];
    if (best === undefined) {
        return undefined;
    }

    const decisive = best.hits >= 4 && best.hits >= (runnerUp?.hits ?? 0) * 2;
    return decisive ? best.language : undefined;
}

const DUMMY_REPLACEMENTS: Record<string, string> = {
    gemäss: "nach",
    beziehungsweise: "oder",
    "bzw.": "oder",
    diesbezüglich: "dazu",
    erforderlich: "nötig",
    unverzüglich: "sofort",
    mitzuteilen: "zu melden",
    "in Kenntnis": "Bescheid",
    demonstrate: "show",
    functionality: "features",
    application: "app",
    utilise: "use",
};

function simplifyDummyParagraph(paragraph: string): string {
    let result = paragraph;

    for (const [from, to] of Object.entries(DUMMY_REPLACEMENTS)) {
        const pattern = new RegExp(
            `\\b${from.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`,
            "gi",
        );
        result = result.replace(pattern, (match) =>
            match.charAt(0) === match.charAt(0).toUpperCase()
                ? capitalize(to)
                : to,
        );
    }

    return result.replace(/[^.!?]+[.!?]/g, (sentence) =>
        splitLongSentence(sentence),
    );
}

function splitLongSentence(sentence: string): string {
    const words = sentence.trim().split(/\s+/);
    if (words.length <= 15) {
        return sentence;
    }

    const middle = Math.floor(words.length / 2);
    const lowerBound = Math.floor(words.length * 0.3);
    const upperBound = Math.ceil(words.length * 0.75);

    let pivot = -1;
    for (let index = lowerBound; index < upperBound; index++) {
        const word = words[index] ?? "";
        const isBoundary =
            /[,;]$/.test(word) ||
            CLAUSE_STARTERS.includes(word.toLowerCase().replace(/[,;]$/, ""));
        if (
            isBoundary &&
            (pivot === -1 ||
                Math.abs(index - middle) < Math.abs(pivot - middle))
        ) {
            pivot = index;
        }
    }

    if (pivot === -1) {
        return sentence;
    }

    // Split *after* a comma-terminated word, *before* a conjunction.
    const splitAt = /[,;]$/.test(words[pivot] ?? "") ? pivot + 1 : pivot;
    const head = words.slice(0, splitAt).join(" ").replace(/[,;]$/, "");
    const tail = words.slice(splitAt).join(" ");
    if (head === "" || tail === "") {
        return sentence;
    }

    const leading = sentence.slice(
        0,
        sentence.length - sentence.trimStart().length,
    );

    return `${leading}${head}. ${capitalize(tail)}`;
}

/** Words that can legitimately start the second half of a split sentence. */
const CLAUSE_STARTERS = [
    "damit",
    "sofern",
    "wenn",
    "weil",
    "aber",
    "und",
    "oder",
    "so",
    "because",
    "but",
    "and",
    "or",
    "mais",
    "donc",
    "perché",
    "quindi",
];

function capitalize(value: string): string {
    return value.charAt(0).toUpperCase() + value.slice(1);
}

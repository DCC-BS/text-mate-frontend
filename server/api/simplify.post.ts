import { ApiError } from "@dcc-bs/communication.bs.js";
import { z } from "zod";
import type { FetcherOptions } from "#layers/backend_communication/server/types/fetcher";
import {
    type ReadabilityBand,
    type SimplifyEvent,
    SimplifyInputSchema,
    type UnconvergedRange,
} from "~~/shared/types/simplify";

type BodyType = { text: string; language?: string };

/**
 * Nuxt API route for the readability-gated simplification loop.
 * Proxies POST requests to `/simplify` on the FastAPI backend and streams the
 * JSON Lines event sequence (see `shared/types/simplify.ts`) straight through.
 */
export default apiHandler
    .withMethod("POST")
    .withBodyProvider<BodyType>(async (event) => {
        const body = await readBody(event);

        const result = SimplifyInputSchema.safeParse(body);

        if (!result.success) {
            throw new ApiError(
                "invalid_input",
                400,
                z.prettifyError(result.error),
            );
        }

        return result.data;
    })
    .withRawFetcher()
    .withDummyFetcher(dummyFetcher)
    .build("/simplify");

// DUMMY

/**
 * Chunking threshold of the backend orchestrator (`simplify_chunking_threshold_chars`).
 * Above it the pipeline rewrites paragraph-wise and emits `chunk_done` events.
 */
const CHUNKING_THRESHOLD_CHARS = 8000;

/**
 * Emits a realistic JSONL event sequence without a backend:
 * - unsupported language → `start(scored:false)` + single `done`
 * - text ≤ 8000 chars → WHOLE mode: `start` → several `progress` → `done`
 * - text > 8000 chars → CHUNKED mode: additionally `chunk_done` per rewritten
 *   paragraph, deliberately emitted out of index order so the client's
 *   reassembly-by-index is exercised.
 */
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

/**
 * Computes the `[start, end)` UTF-16 offset of every paragraph within the
 * text produced by joining `paragraphs` with `"\n\n"` — the same assembly the
 * client mirrors from `chunk_done`/`done.text` (`sourceParagraphs` in
 * `useSimplify`). Used to translate the dummy's paragraph-index shortfall
 * list into the `unconverged_ranges` offsets a real backend would report.
 */
function paragraphRanges(paragraphs: string[]): UnconvergedRange[] {
    const ranges: UnconvergedRange[] = [];
    let cursor = 0;
    for (const paragraph of paragraphs) {
        ranges.push({ start: cursor, end: cursor + paragraph.length });
        cursor += paragraph.length + 2; // + the "\n\n" separator
    }
    return ranges;
}

/**
 * Maps a set of unconverged unit indices to their character ranges in
 * the assembled text, dropping any index that (defensively) falls outside
 * `paragraphs`.
 */
function unconvergedRangesOf(
    paragraphs: string[],
    unconvergedIndices: number[],
): UnconvergedRange[] {
    const ranges = paragraphRanges(paragraphs);
    return unconvergedIndices
        .map((index) => ranges[index])
        .filter((range): range is UnconvergedRange => range !== undefined);
}

/**
 * WHOLE mode: two rewrites of the entire text, gated on the whole-text band.
 * Units still below target are reported but do not block (spec §9), so the
 * common path deliberately ends with `converged: true` *and* a non-empty
 * `unconverged_units` — the combination the UI has to render sensibly.
 *
 * The dummy does not merge short paragraphs forward the way the real backend
 * does, so here one unit is exactly one paragraph — but the wire field is
 * still `units`/`units_in_target`/`unconverged_units` throughout, matching
 * what a real backend reports.
 */
function wholeEvents(
    analyzer: DummyAnalyzer,
    text: string,
    simplifiedParagraphs: string[],
): SimplifyEvent[] {
    const simplifiedText = simplifiedParagraphs.join("\n\n");
    const unitCount = simplifiedParagraphs.length;
    const before = analyzer.score(text);
    const after = analyzer.score(simplifiedText);
    // Attempt 1 lands between before and after, so the progress UI moves.
    const midway = round(before + (after - before) / 2);
    const inTargetMidway = Math.max(1, Math.floor(unitCount / 2));

    // `converged` means "the assembled text reached the target band" — the same
    // meaning in both modes, and not a claim about every unit.
    const converged = analyzer.band(after) === "easy";
    const unconverged = unitCount > 1 ? [unitCount - 1] : [];
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
            stage: "readability",
            score: midway,
            band: analyzer.band(midway),
            cefr: analyzer.cefr(midway),
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
        },
    ];
}

/**
 * CHUNKED mode: paragraph-wise rewrites. `chunk_done` events are final and are
 * emitted out of order on purpose; the last rewritten paragraph does not reach
 * the target band, so the "needs a human look" hint is exercised too — while
 * the assembled text can still be `converged`.
 */
function chunkedEvents(
    analyzer: DummyAnalyzer,
    paragraphs: string[],
    simplifiedParagraphs: string[],
    simplifiedText: string,
): SimplifyEvent[] {
    const fullText = paragraphs.join("\n\n");
    const before = analyzer.score(fullText);
    const after = analyzer.score(simplifiedText);
    // Score of the second attempt, part-way between the two.
    const midway = round(before + (after - before) / 2);

    // Rewrite the first few non-trivial paragraphs, mimicking "only paragraphs
    // outside the target band are rewritten".
    const rewritten = paragraphs
        .map((paragraph, index) => ({ paragraph, index }))
        .filter((unit) => unit.paragraph.trim().split(/\s+/).length > 5)
        .slice(0, 4);

    // Deliberately non-monotonic emission order.
    const emissionOrder = [2, 0, 3, 1].filter(
        (position) => position < rewritten.length,
    );

    const chunkEvents: SimplifyEvent[] = emissionOrder.map((position, nth) => {
        const unit = rewritten[position];
        // `rewritten[position]` is guaranteed by the filter above.
        const index = unit?.index ?? 0;
        const chunkBefore = analyzer.score(paragraphs[index] ?? "");
        const chunkAfter = analyzer.score(simplifiedParagraphs[index] ?? "");
        // The last emitted chunk stays outside the target band.
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

    const lastPosition = emissionOrder[emissionOrder.length - 1];
    const unconverged =
        lastPosition === undefined
            ? []
            : [rewritten[lastPosition]?.index ?? 0].filter(
                  (index) => index >= 0,
              );
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
            // Same meaning as in WHOLE mode: the *assembled* text reached the
            // target band. Individual units may still fall short.
            converged: analyzer.band(after) === "easy",
            unconverged_units: unconverged,
            unconverged_ranges: unconvergedRanges,
        },
    ];
}

/**
 * Unsupported language: single rewrite, no scoring, no loop (§4.1 Stage 0).
 * `language` is omitted when detection was inconclusive — the UI must not
 * claim a language it does not know, and must not show a score either.
 */
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
        {
            event: "done",
            text: simplifiedText,
            language,
            scored: false,
            converged: true,
            unconverged_units: [],
            unconverged_ranges: [],
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

/**
 * Crude language detection: counts stopword hits per language. Returns
 * `undefined` when no language wins, which drives the unscored branch — the
 * frontend must then render no score at all.
 */
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

    // Needs a decisive win: neighbouring Romance languages share function
    // words, and a weak signal must fall through to the unscored branch
    // rather than mislabel the text.
    const decisive = best.hits >= 4 && best.hits >= (runnerUp?.hits ?? 0) * 2;
    return decisive ? best.language : undefined;
}

/** Officialese → plain word replacements, applied case-insensitively. */
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

/**
 * Stand-in for the LLM rewrite: replaces officialese words and splits
 * over-long sentences, so the DiffViewer always receives real hunks.
 */
function simplifyDummyParagraph(paragraph: string): string {
    let result = paragraph;

    for (const [from, to] of Object.entries(DUMMY_REPLACEMENTS)) {
        const pattern = new RegExp(
            `\\b${from.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`,
            "gi",
        );
        // Keep the original capitalisation, so a replacement at the start of a
        // sentence does not lower-case it.
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

/**
 * Splits a sentence of more than 15 words in two, at the comma or clause
 * boundary closest to the middle. Sentences without such a boundary in the
 * middle third are left alone rather than cut mid-clause.
 */
function splitLongSentence(sentence: string): string {
    const words = sentence.trim().split(/\s+/);
    if (words.length <= 15) {
        return sentence;
    }

    const middle = Math.floor(words.length / 2);
    const lowerBound = Math.floor(words.length * 0.3);
    const upperBound = Math.ceil(words.length * 0.75);

    // Candidate boundaries: a word ending in a comma/semicolon, or a
    // subordinating conjunction that can start a new sentence.
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

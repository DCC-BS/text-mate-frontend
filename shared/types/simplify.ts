import { z } from "zod";

/**
 * Streaming contract of `POST /simplify` (JSON Lines), mirroring
 * `docs/simplify_redesign.md` §4.7 in the backend repository.
 *
 * Rules that shape these schemas:
 * - `chunk_done` is final: the UI never retracts text it has shown. Events may
 *   arrive out of order and are reassembled by `index`.
 * - Retries are gated on readability alone; there is no fidelity gate.
 * - `done` always carries the fully assembled text, so in WHOLE mode a client
 *   can ignore everything except `progress` and `done`.
 * - When `scored` is false (language without a readability analyzer) the score
 *   fields are absent — nothing may be fabricated from them.
 */

/**
 * Readability band of a score, as calibrated per language by the backend
 * analyzer. `easy` is the target band.
 */
export const ReadabilityBandSchema = z.enum(["easy", "ok", "hard"]);

export type ReadabilityBand = z.output<typeof ReadabilityBandSchema>;

/** Rewrite unit selection: whole text (default) or paragraph-wise. */
export const SimplifyModeSchema = z.enum(["whole", "chunked"]);

export type SimplifyMode = z.output<typeof SimplifyModeSchema>;

/**
 * Which gate produced a progress event. The LLM fidelity gate was removed from
 * the pipeline (it only ever produced false positives, fired inconsistently on
 * identical content, and doubled the LLM calls per attempt), so retries are
 * driven by the readability band alone and this is a one-member union today.
 * Deliberately still a union, and optional on the event, so re-adding a stage
 * later is an additive change rather than a breaking one.
 */
export const SimplifyStageSchema = z.enum(["readability"]);

export type SimplifyStage = z.output<typeof SimplifyStageSchema>;

/**
 * Half-open UTF-16 code unit range `[start, end)` into `SimplifyDoneEvent.text`,
 * used by `unconverged_ranges` for inline highlighting. Deliberately its own,
 * lenient schema rather than reusing `AdvisorRangeSchema` (`#shared/types/advisor`):
 * that one `.refine`s `start < end` with `abort: true`, and a single
 * malformed/degenerate range (e.g. a genuinely empty paragraph) must not fail
 * `SimplifyDoneEventSchema.parse()` and drop the *entire* `done` event — text,
 * scores and `converged` included. Degenerate ranges are filtered out below
 * instead of aborting the parse.
 */
const UnconvergedRangeSchema = z.object({
    start: z.number().int().nonnegative(),
    end: z.number().int().nonnegative(),
});

export type UnconvergedRange = z.output<typeof UnconvergedRangeSchema>;

/**
 * Accepts a missing field, an explicit JSON `null` and the value itself, and
 * normalises all absent cases to `undefined` — the codebase prefers `undefined`
 * over `null`, and the backend may serialise unset optionals either way.
 */
function absentAsUndefined<TSchema extends z.ZodType>(schema: TSchema) {
    return schema
        .nullish()
        .transform(
            (value: z.output<TSchema> | null | undefined) => value ?? undefined,
        )
        .optional();
}

/**
 * Detected language of the text. Kept as a plain string because Stage 0 reports
 * the detected language even when it is unsupported (in which case `scored` is
 * false), and it is absent when detection was inconclusive — scores can still
 * be present in that case, so it must never gate them.
 */
const LanguageSchema = z.string();

export const SimplifyStartEventSchema = z.object({
    event: z.literal("start"),
    language: absentAsUndefined(LanguageSchema),
    /** Name of the metric, e.g. `ZIX`, `CEFR`, `LIX`, `Gulpease`. */
    score_label: absentAsUndefined(z.string()),
    scored: z.boolean(),
    mode: SimplifyModeSchema,
    /**
     * Number of units the text was split into. A unit is not one raw
     * blank-line-separated paragraph: short paragraphs are merged forward to
     * ~100 words before scoring, so this is the same denominator
     * `progress.units_in_target` counts against — using the raw paragraph
     * count here previously produced a 3-6x mismatch on real documents.
     */
    units: z.number().int().nonnegative(),
    score_before: absentAsUndefined(z.number()),
    band_before: absentAsUndefined(ReadabilityBandSchema),
    cefr_before: absentAsUndefined(z.string()),
});

export type SimplifyStartEvent = z.output<typeof SimplifyStartEventSchema>;

export const SimplifyProgressEventSchema = z.object({
    event: z.literal("progress"),
    /** 1-based attempt counter of the rewrite loop. */
    attempt: z.number().int().positive(),
    /** Optional: with one gate left there is nothing to disambiguate. */
    stage: absentAsUndefined(SimplifyStageSchema),
    score: absentAsUndefined(z.number()),
    band: absentAsUndefined(ReadabilityBandSchema),
    cefr: absentAsUndefined(z.string()),
    /** Units whose band already reached the target. */
    units_in_target: absentAsUndefined(z.number().int().nonnegative()),
});

export type SimplifyProgressEvent = z.output<
    typeof SimplifyProgressEventSchema
>;

export const SimplifyChunkDoneEventSchema = z.object({
    event: z.literal("chunk_done"),
    /** Index of the paragraph unit in the original text. */
    index: z.number().int().nonnegative(),
    text: z.string(),
    score_before: absentAsUndefined(z.number()),
    score_after: absentAsUndefined(z.number()),
    cefr_before: absentAsUndefined(z.string()),
    cefr_after: absentAsUndefined(z.string()),
    attempts: z.number().int().nonnegative(),
    converged: z.boolean(),
});

export type SimplifyChunkDoneEvent = z.output<
    typeof SimplifyChunkDoneEventSchema
>;

export const SimplifyDoneEventSchema = z.object({
    event: z.literal("done"),
    /** Fully assembled simplified text — authoritative for the diff. */
    text: z.string(),
    language: absentAsUndefined(LanguageSchema),
    score_label: absentAsUndefined(z.string()),
    scored: z.boolean(),
    score_before: absentAsUndefined(z.number()),
    score_after: absentAsUndefined(z.number()),
    band_before: absentAsUndefined(ReadabilityBandSchema),
    band_after: absentAsUndefined(ReadabilityBandSchema),
    cefr_before: absentAsUndefined(z.string()),
    cefr_after: absentAsUndefined(z.string()),
    /**
     * True when the assembled text reached the target band — the same meaning
     * in both modes. It is therefore *not* a claim about every unit:
     * `converged: true` can arrive together with a non-empty
     * `unconverged_units`, meaning the text cleared the bar overall while
     * individual units did not.
     */
    converged: z.boolean(),
    /** Unit indices that never reached the target band. */
    unconverged_units: z
        .array(z.number().int().nonnegative())
        .nullish()
        .transform((value) => value ?? []),
    /**
     * Half-open UTF-16 code unit ranges (`[start, end)`) into `text` above,
     * covering the same shortfall as `unconverged_units` but addressable
     * for inline highlighting instead of by unit index — the offset
     * convention `useAdvisor`/`advisorText` already use for advisor ranges.
     * Optional so an older backend that has not shipped it yet does not break
     * the client; absent is treated the same as empty. Ranges with
     * `end <= start` are dropped rather than rejected outright — see
     * {@link UnconvergedRangeSchema}.
     */
    unconverged_ranges: z
        .array(UnconvergedRangeSchema)
        .nullish()
        .transform((value) => (value ?? []).filter((r) => r.end > r.start)),
});

export type SimplifyDoneEvent = z.output<typeof SimplifyDoneEventSchema>;

export const SimplifyEventSchema = z.discriminatedUnion("event", [
    SimplifyStartEventSchema,
    SimplifyProgressEventSchema,
    SimplifyChunkDoneEventSchema,
    SimplifyDoneEventSchema,
]);

export type SimplifyEvent = z.output<typeof SimplifyEventSchema>;

/** Request body of `POST /api/simplify`. */
export const SimplifyInputSchema = z.object({
    text: z.string().nonempty(),
    /**
     * The UI locale, sent as a hint only. Detection from the text always wins;
     * the backend uses this solely as a fallback for text too short to detect,
     * and logs detected-vs-hinted disagreement so we can tell whether the hint
     * is worth anything. Omitting it would make that metric unmeasurable.
     */
    language: z.string().optional(),
});

export type SimplifyInput = z.output<typeof SimplifyInputSchema>;

/**
 * Languages for which the backend maps its metric onto a CEFR level (§10).
 * `fr` (LIX) and `it` (Gulpease) have no CEFR mapping, so no level may be
 * displayed for them.
 */
const CEFR_LANGUAGES = ["de", "en"];

/** True when `language` has a CEFR mapping, i.e. a level may be rendered. */
export function hasCefrMapping(language: string | undefined): boolean {
    if (language === undefined) {
        return false;
    }
    // Detected codes may carry a region suffix (e.g. `de-CH`).
    const base = language.toLowerCase().split("-")[0] ?? "";
    return CEFR_LANGUAGES.includes(base);
}

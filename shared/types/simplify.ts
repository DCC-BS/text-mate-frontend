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

export const SimplifyStageSchema = z.enum(["rewriting", "readability"]);

export type SimplifyStage = z.output<typeof SimplifyStageSchema>;

export const UnconvergedRangeSchema = z.object({
    start: z.number().int().nonnegative(),
    end: z.number().int().nonnegative(),
});

export type UnconvergedRange = z.output<typeof UnconvergedRangeSchema>;

function absentAsUndefined<TSchema extends z.ZodTypeAny>(
    schema: TSchema,
): z.ZodOptional<
    z.ZodType<
        z.output<TSchema> | undefined,
        z.input<TSchema> | null | undefined
    >
> {
    return schema
        .nullish()
        .transform(
            (value: z.output<TSchema> | null | undefined) => value ?? undefined,
        )
        .optional();
}

const LanguageSchema = z.string();

export const SimplifyStartEventSchema = z.object({
    event: z.literal("start"),
    language: absentAsUndefined(LanguageSchema),
    score_label: absentAsUndefined(z.string()),
    scored: z.boolean(),
    mode: SimplifyModeSchema,
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
    converged: z.boolean(),
    unconverged_units: z
        .array(z.number().int().nonnegative())
        .nullish()
        .transform((value) => value ?? []),
    unconverged_ranges: z
        .array(UnconvergedRangeSchema)
        .nullish()
        .transform((value) => (value ?? []).filter((r) => r.end > r.start)),
    rewrite_failures: z
        .number()
        .int()
        .nonnegative()
        .nullish()
        .transform((value) => value ?? 0),
});

export type SimplifyDoneEvent = z.output<typeof SimplifyDoneEventSchema>;

export const SimplifyEventSchema = z.discriminatedUnion("event", [
    SimplifyStartEventSchema,
    SimplifyProgressEventSchema,
    SimplifyChunkDoneEventSchema,
    SimplifyDoneEventSchema,
]);

export type SimplifyEvent = z.output<typeof SimplifyEventSchema>;

export const SimplifyInputSchema = z.object({
    text: z.string().nonempty(),
    language: z.string().optional(),
});

export type SimplifyInput = z.output<typeof SimplifyInputSchema>;

const CEFR_LANGUAGES = ["de", "en"];

export function hasCefrMapping(language: string | undefined): boolean {
    if (language === undefined) {
        return false;
    }
    const base = language.toLowerCase().split("-")[0] ?? "";
    return CEFR_LANGUAGES.includes(base);
}

import { z } from "zod";

export const AdvisorDocumentDescriptionSchema = z.object({
    title: z.string(),
    description: z.string(),
    author: z.string(),
    edition: z.string(),
    id: z.string(),
    files: z.array(z.string()),
});

export type AdvisorDocumentDescription = z.infer<
    typeof AdvisorDocumentDescriptionSchema
>;

export const AdvisorRangeSchema = z
    .object({
        start: z.number().min(0),
        end: z.number().min(0),
    })
    .refine((x) => x.start < x.end, {
        error: "Start must be less than end",
        abort: true,
    })
    .refine((x) => x.start >= 0, {
        error: "Start must be non-negative",
        abort: true,
    });

/**
 * Half-open character range `[start, end)` into the validated text.
 */
export type AdvisorRange = z.infer<typeof AdvisorRangeSchema>;

export const AdvisorRuleViolationSchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string(),
    file_name: z.string(),
    page_number: z.number(),
    example: z.string(),
    reason: z.string(),
    proposal: z.string(),
    source: z.string(),
    collection: z.string(),
    range: AdvisorRangeSchema,
});

export type AdvisorRuleViolation = z.infer<typeof AdvisorRuleViolationSchema>;

export const ValidationResultSchema = z.object({
    rules: z.array(AdvisorRuleViolationSchema),
    checked: z.number(),
    total: z.number(),
});

export type ValidationResult = z.infer<typeof ValidationResultSchema>;

/**
 * Payload sent to `/advisor/fix`. Only `to-fix` threads are shipped; rule
 * definitions are intentionally omitted — the fix LLM receives the text
 * plus per-thread `source` + `proposal`/`reason` + notes only.
 */
export type FixThread = {
    source: string;
    proposal?: string;
    reason?: string;
    notes: string[];
};

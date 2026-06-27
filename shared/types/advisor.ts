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

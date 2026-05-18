import * as z from "zod";

export const TextActionsSchema = z.enum([
    "plain_language",
    "bullet_points",
    "summarize",
    "social_mediafy",
    "formality",
    "medium",
    "custom",
    "proofread",
    "character_speech",
]);

export type TextActions = z.output<typeof TextActionsSchema>;

export const TextActionInputSchema = z.object({
    action: TextActionsSchema,
    options: z.string(),
    text: z.string(),
});

export const TextActionGetOutputSchema = z.object({
    id: z.string(),
    name: z.string(),
});

export type TextActionGetOutput = z.output<typeof TextActionGetOutputSchema>;

import * as z from "zod";

/** Maximum length of a saved prompt's name, after trimming. */
export const SAVED_PROMPT_NAME_MAX_LENGTH = 80;

/** User-editable fields of a saved prompt. Trims both values. */
export const SavedPromptInputSchema = z.object({
    name: z.string().trim().min(1).max(SAVED_PROMPT_NAME_MAX_LENGTH),
    prompt: z.string().trim().min(1),
});

export type SavedPromptInput = z.output<typeof SavedPromptInputSchema>;

/** Shape of an exported prompts file (`textmate-prompts.json`). */
export const SavedPromptExportSchema = z.object({
    version: z.literal(1),
    prompts: z.array(SavedPromptInputSchema),
});

export type SavedPromptExport = z.output<typeof SavedPromptExportSchema>;

/** A prompt the user saved in this browser. */
export interface SavedPrompt extends SavedPromptInput {
    /** uuid v7 */
    id: string;
    /** Epoch milliseconds. */
    createdAt: number;
    /** Epoch milliseconds. */
    updatedAt: number;
}

/**
 * Checks a name and prompt against the save rules, so forms can disable
 * their save button before calling the store.
 */
export function isValidSavedPromptInput(name: string, prompt: string): boolean {
    return SavedPromptInputSchema.safeParse({ name, prompt }).success;
}

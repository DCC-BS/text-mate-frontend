import {
    type SavedPrompt,
    type SavedPromptExport,
    SavedPromptExportSchema,
    type SavedPromptInput,
    SavedPromptInputSchema,
} from "~/types/savedPrompt";

/** Largest import file accepted (1 MB). */
export const MAX_IMPORT_BYTES = 1024 * 1024;

/** File name used when exporting saved prompts. */
export const EXPORT_FILE_NAME = "textmate-prompts.json";

/** Why an import file was rejected. Also the i18n key suffix of the error toast. */
export type ImportError = "invalidJson" | "invalidFormat";

/** Result of parsing an import file. */
export type ImportResult =
    | { ok: true; prompts: SavedPromptInput[] }
    | { ok: false; error: ImportError };

/**
 * Builds the export file content. Ids and timestamps are local details and
 * are left out.
 */
export function buildExport(
    prompts: readonly SavedPrompt[],
): SavedPromptExport {
    return {
        version: 1,
        prompts: prompts.map((prompt) => ({
            name: prompt.name,
            prompt: prompt.prompt,
        })),
    };
}

/**
 * Checks a name and prompt against the save rules, so forms can disable
 * their save button before calling the store.
 */
export function isValidSavedPromptInput(name: string, prompt: string): boolean {
    return SavedPromptInputSchema.safeParse({ name, prompt }).success;
}

/** Parses and validates the text of an import file. */
export function parseImport(text: string): ImportResult {
    let data: unknown;
    try {
        data = JSON.parse(text);
    } catch {
        return { ok: false, error: "invalidJson" };
    }

    const parsed = SavedPromptExportSchema.safeParse(data);
    if (!parsed.success) {
        return { ok: false, error: "invalidFormat" };
    }
    return { ok: true, prompts: parsed.data.prompts };
}

/** Identity of a prompt for duplicate detection: exact name and text. */
function promptKey(prompt: SavedPromptInput): string {
    return JSON.stringify([prompt.name, prompt.prompt]);
}

/**
 * Returns the incoming prompts that are not stored yet, dropping repeats
 * inside the incoming list as well.
 */
export function findNewPrompts(
    incoming: readonly SavedPromptInput[],
    existing: readonly SavedPromptInput[],
): SavedPromptInput[] {
    const seen = new Set(existing.map(promptKey));
    const fresh: SavedPromptInput[] = [];
    for (const prompt of incoming) {
        const key = promptKey(prompt);
        if (seen.has(key)) {
            continue;
        }
        seen.add(key);
        fresh.push(prompt);
    }
    return fresh;
}

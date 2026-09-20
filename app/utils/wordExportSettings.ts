import { z } from "zod";
import type { WordExportSettings } from "~/types/wordExport";

/** Validate browser storage and form input before creating Word XML. */
export const wordExportSettingsSchema = z.object({
    fontFamily: z.string().trim().min(1).max(100),
    fontSize: z.number().min(6).max(72),
    language: z.enum(["de-CH", "en-GB"]),
    lineSpacing: z.number().min(1).max(3),
    marginPreset: z.enum(["normal", "narrow", "wide"]),
});
export const WORD_EXPORT_STORAGE_KEY = "textmate-word-export-settings";
export const DEFAULT_WORD_EXPORT_SETTINGS: Readonly<WordExportSettings> = {
    fontFamily: "Arial",
    fontSize: 12,
    language: "de-CH",
    lineSpacing: 1.15,
    marginPreset: "normal",
};

/** Corrupt or outdated settings must not prevent a download. */
export function parseWordExportSettings(
    value: string | null,
): WordExportSettings {
    try {
        return wordExportSettingsSchema.parse(JSON.parse(value ?? "{}"));
    } catch {
        return { ...DEFAULT_WORD_EXPORT_SETTINGS };
    }
}

/** Keep filenames portable and add exactly one DOCX extension. */
export function wordExportFilename(value: string): string {
    // Strip filesystem control characters as well as reserved punctuation.
    const name = value
        // biome-ignore lint/suspicious/noControlCharactersInRegex: filenames must not contain control characters.
        .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "-")
        .replace(/\.docx$/i, "")
        .trim()
        .replace(/[. ]+$/, "")
        .slice(0, 120);
    return `${name || "textmate"}.docx`;
}

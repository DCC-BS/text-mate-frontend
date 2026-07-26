/**
 * Escapes the five significant HTML characters so that user text is never
 * interpreted as markup when it is parsed back into the editor.
 */
function escapeHtml(value: string): string {
    return value
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;");
}

/**
 * Converts plain text into editor HTML while preserving its layout.
 *
 * The conversion mirrors the round-trip of Tiptap's `editor.getText()` (whose
 * default block separator is `"\n\n"`) and the advisor's
 * `serializeAdvisorText`:
 *
 *   - a run of two or more newlines (a blank line) starts a new paragraph,
 *   - a single newline becomes a hard break (`<br>`),
 *   - the empty string maps to a single empty paragraph so the editor keeps a
 *     valid selection.
 *
 * Using one shared loader across both editors guarantees that the document
 * structure (paragraphs vs. hard breaks) survives the plain-text interchange
 * when switching between the rewrite and advisor tools.
 *
 * @param text Plain text, using `\n\n` for paragraph boundaries.
 * @returns An HTML string of `<p>` blocks suitable for `editor.commands.setContent`.
 */
export function plainTextToEditorHtml(text: string): string {
    if (text === "") {
        return "<p></p>";
    }
    return text
        .split(/\n{2,}/)
        .map((line) => `<p>${escapeHtml(line).replaceAll("\n", "<br>")}</p>`)
        .join("");
}

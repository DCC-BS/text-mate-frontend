/**
 * Converts a markdown/plain-text string to a Word (.docx) Blob.
 *
 * Uses the same library as the bs-translator app. The dynamic import keeps the
 * library out of the SSR bundle (it relies on browser APIs).
 */
export async function markdownToDocx(markdown: string): Promise<Blob> {
    if (typeof window === "undefined") {
        throw new Error("markdownToDocx must run in the browser");
    }

    const { convertMarkdownToDocx } = await import("@mohtasham/md-to-docx");
    return await convertMarkdownToDocx(markdown);
}

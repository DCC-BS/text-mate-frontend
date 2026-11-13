/** Only safe navigational links are written into the document relationships. */
export function safeWordLink(value: unknown): string | undefined {
    if (typeof value !== "string") return undefined;
    try {
        const url = new URL(value);
        return ["http:", "https:", "mailto:"].includes(url.protocol)
            ? url.href
            : undefined;
    } catch {
        return undefined;
    }
}

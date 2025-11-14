import type { Editor } from "@tiptap/core";

/**
 * Gets the bounding box for a text range in the Tiptap editor
 * @param from - Starting position of the range
 * @param to - Ending position of the range
 * @returns DOMRect representing the bounding box
 */
export function getRangeBoundingBox(
    editor: Editor,
    from: number,
    to: number,
): DOMRect | undefined {
    // Ensure positions are within document bounds
    const docSize = editor.state.doc.content.size;
    const validFrom = Math.max(0, Math.min(from, docSize));
    const validTo = Math.max(validFrom, Math.min(to, docSize - 1));

    try {
        // Get coordinates for start and end positions
        const fromCoords = editor.view.coordsAtPos(validFrom, 1);
        const toCoords = editor.view.coordsAtPos(validTo, -1);

        // Create a DOMRect from the coordinates
        return new DOMRect(
            Math.min(fromCoords.left, toCoords.left),
            Math.min(fromCoords.top, toCoords.top),
            Math.abs(toCoords.left - fromCoords.left),
            Math.max(toCoords.bottom, fromCoords.bottom) -
                Math.min(toCoords.top, fromCoords.top),
        );
    } catch (error) {
        console.error("Error calculating range bounding box:", error);
        return undefined;
    }
}

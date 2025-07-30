import { Mark, mergeAttributes } from "@tiptap/core";

/**
 * TextRemovedMark is a custom mark for the Tiptap editor that highlights removed text.
 * It provides visual feedback to users about which text has been removed during editing.
 */
export const TextRemovedMark = Mark.create({
    name: "textRemoved",

    /**
     * Specifies how the TextRemovedMark should be parsed from HTML.
     * @returns {Array} The HTML parsing rules.
     */
    parseHTML() {
        return [
            {
                tag: "span.text-removed",
            },
        ];
    },

    /**
     * Specifies how the TextRemovedMark should be rendered to HTML.
     * @param {Object} HTMLAttributes - The HTML attributes to be merged.
     * @returns {Array} The HTML rendering rules.
     */
    renderHTML({ HTMLAttributes }) {
        return [
            "span",
            mergeAttributes({ class: "text-removed" }, HTMLAttributes),
            0,
        ];
    },
});

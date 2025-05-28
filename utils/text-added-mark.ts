import { Mark, mergeAttributes } from "@tiptap/core";

/**
 * TextAddedMark is a custom mark for the Tiptap editor that highlights newly added text.
 * It provides visual feedback to users about which text has been added during editing.
 */
export const TextAddedMark = Mark.create({
    name: "textAdded",

    /**
     * Specifies how the TextAddedMark should be parsed from HTML.
     * @returns {Array} The HTML parsing rules.
     */
    parseHTML() {
        return [
            {
                tag: "span.text-added",
            },
        ];
    },

    /**
     * Specifies how the TextAddedMark should be rendered to HTML.
     * @param {Object} HTMLAttributes - The HTML attributes to be merged.
     * @returns {Array} The HTML rendering rules.
     */
    renderHTML({ HTMLAttributes }) {
        return [
            "span",
            mergeAttributes({ class: "text-added" }, HTMLAttributes),
            0,
        ];
    },
});

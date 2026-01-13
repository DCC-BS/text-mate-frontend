import { mergeAttributes } from "@tiptap/vue-3";
import { schema } from "prosemirror-schema-basic";

/**
 * TextRemovedMark is a custom mark for the Tiptap editor that highlights removed text.
 * It provides visual feedback to users about which text has been removed during editing.
 */
export const TextRemovedMark = schema.mark("span", {
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
    renderHTML({
        HTMLAttributes,
    }: {
        HTMLAttributes: Record<string, unknown>;
    }) {
        return [
            "span",
            mergeAttributes({ class: "text-removed" }, HTMLAttributes),
            0,
        ];
    },
});

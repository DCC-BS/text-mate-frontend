import { Mark, mergeAttributes } from "@tiptap/core";

/**
 * FocusedWordMark is a custom mark for the Tiptap editor that highlights the currently focused word.
 * It provides visual feedback to users about which word is currently being edited or focused.
 */
export const FocusedWordMark = Mark.create({
    name: "focusedWord",

    /**
     * Specifies how the FocusedWordMark should be parsed from HTML.
     * @returns {Array} The HTML parsing rules.
     */
    parseHTML() {
        return [
            {
                tag: "span.focused-word",
            },
        ];
    },

    /**
     * Specifies how the FocusedWordMark should be rendered to HTML.
     * @param {Object} HTMLAttributes - The HTML attributes to be merged.
     * @returns {Array} The HTML rendering rules.
     */
    renderHTML({ HTMLAttributes }) {
        return [
            "span",
            mergeAttributes({ class: "focused-word" }, HTMLAttributes),
            0,
        ];
    },
});

import { Mark, mergeAttributes } from "@tiptap/vue-3";

/**
 * FocusedSentenceMark is a custom mark for the Tiptap editor that underlines the currently focused sentence.
 * It provides visual feedback to users about which sentence is currently being edited or focused.
 */
export const FocusedSentenceMark = Mark.create({
    name: "focusedSentence",

    /**
     * Specifies how the FocusedSentenceMark should be parsed from HTML.
     * @returns {Array} The HTML parsing rules.
     */
    parseHTML() {
        return [
            {
                tag: "span.focused-sentence",
            },
        ];
    },

    /**
     * Specifies how the FocusedSentenceMark should be rendered to HTML.
     * @param {Object} HTMLAttributes - The HTML attributes to be merged.
     * @returns {Array} The HTML rendering rules.
     */
    renderHTML({ HTMLAttributes }) {
        return [
            "span",
            mergeAttributes({ class: "focused-sentence" }, HTMLAttributes),
            0,
        ];
    },
});

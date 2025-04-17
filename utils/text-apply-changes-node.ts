import { mergeAttributes, Node } from "@tiptap/core";
import { NodeViewContent, VueNodeViewRenderer } from "@tiptap/vue-3";
import TextApplyChanges from "~/components/text-editor/text-apply-changes.vue";

/**
 * TextRemovedNode is a custom node for the Tiptap editor that displays removed text.
 * It renders removed text as non-selectable, making it easy to see what was deleted
 * without interfering with normal text editing.
 */
export const TextApplyNode = Node.create({
    name: "textApply",

    /**
     * Sets group and inline attributes to determine how the node behaves in the editor.
     */
    group: "block",
    inline: false,
    atom: true,

    /**
     * Controls whether the node should be selectable by the user.
     */
    selectable: false, // Prevents selection of the node

    /**
     * Custom attributes to store with the node.
     * @returns {Object} The custom attributes.
     */
    addAttributes() {
        return {
            from: {
                default: 0,
            },
            to: {
                default: 0,
            },
            oldText: {
                default: "",
            },
            newText: {
                default: "",
            },
        };
    },

    /**
     * Parses HTML content to determine if it should be converted to this node.
     * @returns {Array} The HTML parsing rules.
     */
    parseHTML() {
        return [
            {
                tag: "text-apply",
            },
        ];
    },

    /**
     * Renders the node to HTML when serializing the document.
     * @param {Object} attributes - The node attributes.
     * @returns {Array} The HTML rendering rules.
     */
    renderHTML({ HTMLAttributes }) {
        return ["text-apply", mergeAttributes(HTMLAttributes)];
    },

    /**
     * Adds a custom Vue component as the node view.
     * @returns {Function} The node view renderer.
     */
    addNodeView() {
        return VueNodeViewRenderer(TextApplyChanges);
    },
});

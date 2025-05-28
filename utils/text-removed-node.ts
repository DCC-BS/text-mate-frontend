import { Node, type NodeConfig, type NodeViewRenderer } from "@tiptap/core";
import { VueNodeViewRenderer } from "@tiptap/vue-3";
import TextRemovedComponent from "~/components/text-editor/text-removed.vue";

/**
 * TextRemovedNode is a custom node for the Tiptap editor that displays removed text.
 * It renders removed text as non-selectable, making it easy to see what was deleted
 * without interfering with normal text editing.
 */
export const TextRemovedNode: NodeConfig = Node.create({
    name: "textRemoved",

    /**
     * Sets group and inline attributes to determine how the node behaves in the editor.
     */
    group: "inline",
    inline: true,

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
            text: {
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
                tag: "span.text-removed",
                getAttrs: (node) => {
                    if (typeof node === "string") return {};

                    const element = node as HTMLElement;
                    return {
                        text: element.textContent,
                    };
                },
            },
        ];
    },

    /**
     * Renders the node to HTML when serializing the document.
     * @param {Object} attributes - The node attributes.
     * @returns {Array} The HTML rendering rules.
     */
    renderHTML({ HTMLAttributes }) {
        return ["span", { class: "text-removed" }, HTMLAttributes.text || ""];
    },

    /**
     * Adds a custom Vue component as the node view.
     * @returns {Function} The node view renderer.
     */
    addNodeView(): NodeViewRenderer {
        return VueNodeViewRenderer(TextRemovedComponent);
    },
});

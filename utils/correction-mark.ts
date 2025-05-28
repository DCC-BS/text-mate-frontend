import { Mark, mergeAttributes } from "@tiptap/core";
import type {
    Mark as ProseMirrorMark,
    Node as ProseMirrorNode,
} from "@tiptap/pm/model";
import { Plugin } from "@tiptap/pm/state";
import type { EditorView } from "@tiptap/pm/view";

type CorrectionMarkOptions = {
    onClick: (event: MouseEvent, node: ProseMirrorNode) => void;
    onMouseEnter: (event: MouseEvent, node: ProseMirrorNode) => void;
    onMouseLeave: (event: MouseEvent, node: ProseMirrorNode) => void;
    active: boolean;
};

/**
 * Checks if an element is obstructed by another element at the event coordinates.
 * @param {MouseEvent} event - The mouse event.
 * @param {HTMLElement} element - The element to check.
 * @returns {boolean} True if the element is not obstructed, false otherwise.
 */
function isElementNotObstructed(
    event: MouseEvent,
    element: HTMLElement,
): boolean {
    // Get the element at the event coordinates
    const x = event.clientX;
    const y = event.clientY;
    const elementAtPoint = document.elementFromPoint(x, y);

    // Check if the element or one of its descendants is at the point
    return element === elementAtPoint || element.contains(elementAtPoint);
}

/**
 * CorrectionMark is a custom mark for the Tiptap editor that highlights text corrections.
 * It provides options for handling click events and toggling active state.
 */
export const CorrectionMark = Mark.create<CorrectionMarkOptions>({
    name: "correction",

    /**
     * Adds default options for the CorrectionMark.
     * @returns {CorrectionMarkOptions} The default options.
     */
    addOptions() {
        return {
            onClick: () => {},
            onMouseEnter: () => {},
            onMouseLeave: () => {},
            active: false,
        };
    },

    /**
     * Specifies how the CorrectionMark should be parsed from HTML.
     * @returns {Array} The HTML parsing rules.
     */
    parseHTML() {
        return [
            {
                tag: "span.correction",
            },
        ];
    },

    /**
     * Specifies how the CorrectionMark should be rendered to HTML.
     * @param {Object} HTMLAttributes - The HTML attributes to be merged.
     * @returns {Array} The HTML rendering rules.
     */
    renderHTML({ HTMLAttributes }) {
        const classNames = this.options.active
            ? "correction active"
            : "correction";
        return [
            "span",
            mergeAttributes({ class: classNames }, HTMLAttributes),
            0,
        ];
    },

    /**
     * Adds custom attributes to the CorrectionMark.
     * @returns {Object} The custom attributes.
     */
    addAttributes() {
        return {
            "data-block-id": {
                default: null,
                parseHTML: (element) => element.getAttribute("data-block-id"),
                renderHTML: (attributes) => {
                    if (!attributes["data-block-id"]) {
                        return {};
                    }
                    return { "data-block-id": attributes["data-block-id"] };
                },
            },
        };
    },

    /**
     * Adds ProseMirror plugins to handle custom behavior for the CorrectionMark.
     * @returns {Array} The ProseMirror plugins.
     */
    addProseMirrorPlugins() {
        const correctionMark = this;
        return [
            new Plugin({
                props: {
                    /**
                     * Handles click events on the CorrectionMark.
                     * @param {EditorView} view - The editor view.
                     * @param {number} pos - The position of the click.
                     * @param {MouseEvent} event - The mouse event.
                     * @returns {boolean} Whether the click was handled.
                     */
                    handleClick: (
                        view: EditorView,
                        pos: number,
                        event: MouseEvent,
                    ) => {
                        const { state } = view;
                        const { doc, selection } = state;
                        const range = selection.$from.blockRange(selection.$to);

                        if (!range) return false;

                        const node = doc.nodeAt(pos);

                        if (
                            node?.marks.find(
                                (mark: ProseMirrorMark) =>
                                    mark.type.name === "correction",
                            )
                        ) {
                            this.options.onClick(event, node);
                            this.options.active = true;
                            return true;
                        }

                        this.options.active = false;

                        return false;
                    },

                    /**
                     * Handle DOM events for mouse interactions with the CorrectionMark
                     */
                    handleDOMEvents: {
                        /**
                         * Handles mouse enter events on the CorrectionMark
                         * @param {EditorView} view - The editor view
                         * @param {MouseEvent} event - The mouse event
                         * @returns {boolean} Whether the event was handled
                         */
                        mouseover(
                            view: EditorView,
                            event: MouseEvent,
                        ): boolean {
                            // Get the DOM element that triggered the event
                            const target = event.target as HTMLElement;

                            // Check if the target has the correction class
                            if (target?.classList.contains("correction")) {
                                // Check if the element is not obstructed
                                if (!isElementNotObstructed(event, target)) {
                                    return false;
                                }

                                // Find the position of the node in the document
                                const pos = view.posAtDOM(target, 0);
                                const { state } = view;
                                const { doc } = state;
                                const node = doc.nodeAt(pos);

                                if (node) {
                                    correctionMark.options.onMouseEnter(
                                        event,
                                        node,
                                    );
                                    return true;
                                }
                            }

                            return false;
                        },

                        /**
                         * Handles mouse leave events on the CorrectionMark
                         * @param {EditorView} view - The editor view
                         * @param {MouseEvent} event - The mouse event
                         * @returns {boolean} Whether the event was handled
                         */
                        mouseout(view: EditorView, event: MouseEvent): boolean {
                            // Get the DOM element that triggered the event
                            const target = event.target as HTMLElement;

                            // Check if the target has the correction class
                            if (target?.classList.contains("correction")) {
                                // Find the position of the node in the document
                                const pos = view.posAtDOM(target, 0);
                                const { state } = view;
                                const { doc } = state;
                                const node = doc.nodeAt(pos);

                                if (node) {
                                    correctionMark.options.onMouseLeave(
                                        event,
                                        node,
                                    );
                                    return true;
                                }
                            }

                            return false;
                        },
                    },
                },
            }),
        ];
    },
});

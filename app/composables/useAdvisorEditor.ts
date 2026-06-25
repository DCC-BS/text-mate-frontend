import Document from "@tiptap/extension-document";
import HardBreak from "@tiptap/extension-hard-break";
import Paragraph from "@tiptap/extension-paragraph";
import Text from "@tiptap/extension-text";
import { useEditor } from "@tiptap/vue-3";
import type { AdvisorRange, AdvisorThread } from "~/types/advisorV2";
import {
    AdvisorHighlightExtension,
    setAdvisorHighlights,
} from "~/utils/advisorHighlight";

export interface UseAdvisorEditorOptions {
    text: Ref<string>;
    threads: Ref<AdvisorThread[]>;
    focusedId: Ref<string | null>;
    /** Called when the user clicks an inline violation/comment mark. */
    onMarkClick: (threadId: string) => void;
}

export interface AdvisorSelection {
    range: AdvisorRange;
    rect: DOMRect;
}

function escapeHtml(value: string): string {
    return value
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;");
}

/** Renders plain text as one paragraph per source line. */
function textToHtml(text: string): string {
    const lines = text.length === 0 ? [""] : text.split("\n");
    return lines.map((line) => `<p>${escapeHtml(line)}</p>`).join("");
}

/**
 * Read-only TipTap editor for the advisor review surface. Renders the document
 * with inline highlight decorations that stay in sync with the thread store,
 * forwards mark clicks, and converts native text selections into character
 * ranges for the "add comment" flow.
 */
export function useAdvisorEditor(options: UseAdvisorEditorOptions) {
    const { text, threads, focusedId, onMarkClick } = options;

    const editor = useEditor({
        content: textToHtml(text.value),
        editable: false,
        extensions: [
            Document,
            Paragraph,
            Text,
            HardBreak,
            AdvisorHighlightExtension,
        ],
        editorProps: {
            handleClick(_view, _pos, event) {
                const target = (event.target as HTMLElement | null)?.closest(
                    "[data-thread]",
                );
                const id = target?.getAttribute("data-thread");
                if (id) {
                    onMarkClick(id);
                    return true;
                }
                return false;
            },
        },
    });

    function syncHighlights(): void {
        const view = editor.value?.view;
        setAdvisorHighlights(view, {
            threads: threads.value,
            focusedId: focusedId.value,
        });
    }

    // Reload content when the text changes (e.g. after applying a fix).
    watch(text, (value) => {
        const current = editor.value;
        if (!current) {
            return;
        }
        if (current.getText() === value) {
            return;
        }
        current.commands.setContent(textToHtml(value), { emitUpdate: false });
        nextTick(syncHighlights);
    });

    // Keep decorations in sync with the thread store and focus.
    watch([threads, focusedId], () => nextTick(syncHighlights), { deep: true });

    watch(
        () => editor.value,
        (instance) => {
            if (instance) {
                nextTick(syncHighlights);
            }
        },
    );

    /**
     * Converts the current native selection inside the editor into a character
     * range (offsets into the plain text, with `\n` between paragraphs).
     */
    function getSelection(): AdvisorSelection | null {
        const dom = editor.value?.view.dom as HTMLElement | undefined;
        const selection = window.getSelection();
        if (
            !dom ||
            !selection ||
            selection.isCollapsed ||
            selection.rangeCount === 0
        ) {
            return null;
        }

        const domRange = selection.getRangeAt(0);
        if (!dom.contains(domRange.commonAncestorContainer)) {
            return null;
        }

        const start = offsetWithin(
            dom,
            domRange.startContainer,
            domRange.startOffset,
        );
        const end = offsetWithin(
            dom,
            domRange.endContainer,
            domRange.endOffset,
        );
        if (start === null || end === null) {
            return null;
        }

        const range: AdvisorRange = {
            start: Math.min(start, end),
            end: Math.max(start, end),
        };
        if (range.end - range.start < 1) {
            return null;
        }

        return { range, rect: domRange.getBoundingClientRect() };
    }

    function clearSelection(): void {
        window.getSelection()?.removeAllRanges();
    }

    onBeforeUnmount(() => {
        editor.value?.destroy();
    });

    return { editor, getSelection, clearSelection };
}

/**
 * Character offset of a DOM point within the editor, counting one `\n` between
 * top-level paragraphs so offsets match the plain submitted text.
 */
function offsetWithin(
    root: HTMLElement,
    container: Node,
    offsetInContainer: number,
): number | null {
    const paragraphs = Array.from(
        root.querySelectorAll<HTMLElement>(":scope > p"),
    );
    if (paragraphs.length === 0) {
        return null;
    }

    let total = 0;
    for (const paragraph of paragraphs) {
        if (paragraph.contains(container) || paragraph === container) {
            const range = document.createRange();
            range.setStart(paragraph, 0);
            range.setEnd(container, offsetInContainer);
            return total + range.toString().length;
        }
        total += (paragraph.textContent?.length ?? 0) + 1;
    }

    return total;
}

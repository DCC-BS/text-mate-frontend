import CharacterCount from "@tiptap/extension-character-count";
import Document from "@tiptap/extension-document";
import HardBreak from "@tiptap/extension-hard-break";
import History from "@tiptap/extension-history";
import Paragraph from "@tiptap/extension-paragraph";
import Text from "@tiptap/extension-text";
import { useEditor } from "@tiptap/vue-3";
import type { AdvisorPhase, AdvisorThread } from "~/assets/models/advisor";
import { ChangeActiveThreadId } from "~/assets/models/commands";
import {
    advisorDecorationKey,
    createAdvisorDecorationExtension,
} from "~/utils/advisorDecorations";
import {
    type SelectionInfo,
    selectionInfo,
    serializeAdvisorText,
} from "~/utils/advisorText";

export type AdvisorEditor = ReturnType<typeof useAdvisorEditor>;

/**
 * Owns the advisor Tiptap editor. The editor is editable only while the
 * store is in the `edit` phase; from `review` onward it is read-only but
 * remains selectable so the user can create user-comment threads.
 *
 * Responsibilities: sync text into the store, render inline decorations
 * for every thread, surface click-to-focus on a decoration, and expose the
 * current text selection (positions + offsets) for the "Add Note" bubble.
 */
export function useAdvisorEditor(
    threads: Ref<AdvisorThread[]>,
    activeThreadId: Ref<string | null>,
    limit: number,
    phase: Ref<AdvisorPhase>,
    text: Ref<string>,
) {
    const { executeCommand } = useCommandBus();

    const editor = useEditor({
        editable: phase.value === "edit",
        content: text.value,
        extensions: [
            Document,
            Paragraph,
            Text,
            HardBreak,
            History,
            CharacterCount.configure({ limit: limit }),
            createAdvisorDecorationExtension({
                getThreads: () => threads.value as AdvisorThread[],
                getActiveId: () => activeThreadId.value,
                onSelect: (id) => executeCommand(new ChangeActiveThreadId(id)),
            }),
        ],
        onUpdate: ({ editor }) => {
            if (!editor.isEditable) {
                return;
            }
            text.value = serializeAdvisorText(editor.state.doc);
        },
    });

    // Reflect phase changes in the editor's editable flag.
    watch(
        () => phase.value,
        (phase) => {
            editor.value?.setEditable(phase === "edit");
        },
    );

    // Rebuild decorations whenever threads or the focused thread change.
    watch(
        [threads, activeThreadId],
        () => {
            const view = editor.value?.view;
            if (!view) {
                return;
            }
            view.dispatch(view.state.tr.setMeta(advisorDecorationKey, true));
        },
        { deep: true },
    );

    // Reconcile programmatic text mutations (apply / upload) with the editor.
    watch(
        () => text.value,
        (value) => {
            const ed = editor.value;
            if (!ed) {
                return;
            }
            if (serializeAdvisorText(ed.state.doc) === value) {
                return;
            }
            ed.commands.setContent(textToParagraphHtml(value || ""));
        },
    );

    // Surface the current selection for the add-comment bubble.
    const selection = ref<SelectionInfo | null>(null);

    function syncSelection(): void {
        const ed = editor.value;
        if (!ed) {
            selection.value = null;
            return;
        }
        const { from, to } = ed.state.selection;
        selection.value = selectionInfo(ed.state.doc, from, to);
    }

    onMounted(() => {
        editor.value?.on("selectionUpdate", syncSelection);
        editor.value?.on("blur", syncSelection);
    });

    onBeforeUnmount(() => {
        editor.value?.off("selectionUpdate", syncSelection);
        editor.value?.off("blur", syncSelection);
    });

    function setContent(text: string): void {
        // Build explicit <p> blocks so `setContent` (which parses as HTML)
        // preserves newlines instead of collapsing them to whitespace.
        editor.value?.commands.setContent(textToParagraphHtml(text));
    }

    return { editor, selection, setContent };
}

function escapeHtml(value: string): string {
    return value
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;");
}

function textToParagraphHtml(text: string): string {
    if (text === "") {
        return "<p></p>";
    }
    return text
        .split("\n")
        .map((line) => `<p>${escapeHtml(line)}</p>`)
        .join("");
}

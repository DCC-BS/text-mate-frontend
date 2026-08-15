import type { Editor as CoreEditor, Extensions } from "@tiptap/core";
import CharacterCount from "@tiptap/extension-character-count";
import Document from "@tiptap/extension-document";
import HardBreak from "@tiptap/extension-hard-break";
import History from "@tiptap/extension-history";
import Paragraph from "@tiptap/extension-paragraph";
import Text from "@tiptap/extension-text";
import { EditorState } from "@tiptap/pm/state";
import type { EditorProps } from "@tiptap/pm/view";
import { useEditor } from "@tiptap/vue-3";
import {
    type ClearTextCommand,
    Cmds,
    type RedoCommand,
    type UndoCommand,
    UndoRedoStateChanged,
} from "~/assets/models/commands";
import { plainTextToEditorHtml } from "~/utils/plainTextToEditorHtml";

/**
 * A non-collapsed editor selection reduced to the bits a selection-driven
 * bubble needs: absolute ProseMirror positions and the selected text.
 */
export type EditorSelection = {
    from: number;
    to: number;
    text: string;
};

export interface UseBaseEditorOptions {
    /** Two-way text interchange (plain text, `\n\n` between paragraphs). */
    text: Ref<string>;
    /** Character-count limit. */
    limit: Ref<number> | number;
    /** Variant-specific extensions appended after the shared base set. */
    extraExtensions: Extensions;
    /** Serializes the doc to the plain-text interchange. Defaults to getText. */
    serialize?: (editor: CoreEditor) => string;
    /** Initial `editable` flag; variants may toggle it later via setEditable. */
    initialEditable?: boolean;
    /** Extra ProseMirror editor props (e.g. key handlers). */
    editorProps?: EditorProps;
    /** Forwarded to `useEditor`; defaults to Tiptap's defaults. */
    enableInputRules?: boolean;
    /** Forwarded to `useEditor`; defaults to Tiptap's defaults. */
    enablePasteRules?: boolean;
}

/**
 * Shared Tiptap editor factory used by both the rewrite and advisor editors.
 *
 * Owns the base extension set, the plain-text model reconciliation, the
 * shared undo/redo/clear command handlers, the undo/redo state broadcast,
 * and a generic selection ref for selection-driven bubbles. Variants layer
 * their own extensions (focus marks, decorations) and command handlers
 * (apply-text, tool-switch, ...) on top.
 */
export function useBaseEditor(options: UseBaseEditorOptions) {
    const {
        text,
        limit,
        extraExtensions,
        serialize,
        initialEditable = true,
        editorProps = {},
        enableInputRules,
        enablePasteRules,
    } = options;

    const serializeContent =
        serialize ?? ((editor: CoreEditor) => editor.getText());
    const limitValue = typeof limit === "number" ? limit : limit.value;

    const { onCommand, executeCommand } = useCommandBus();

    // Last broadcasted undo/redo state, used to suppress duplicate events.
    const undoRedoState = { canUndo: false, canRedo: false };

    const editor = useEditor({
        editable: initialEditable,
        // Parse through HTML so paragraph boundaries (`\n\n`) and hard breaks
        // survive the initial render instead of being collapsed as whitespace.
        content: plainTextToEditorHtml(text.value),
        extensions: [
            Document,
            Paragraph,
            Text,
            HardBreak,
            History,
            CharacterCount.configure({ limit: limitValue }),
            ...extraExtensions,
        ],
        enableInputRules,
        enablePasteRules,
        editorProps,
        onUpdate: ({ editor }) => {
            if (!editor.isEditable) {
                return;
            }
            text.value = serializeContent(editor);

            const canUndo = editor.can().undo();
            const canRedo = editor.can().redo();
            if (
                undoRedoState.canUndo !== canUndo ||
                undoRedoState.canRedo !== canRedo
            ) {
                undoRedoState.canUndo = canUndo;
                undoRedoState.canRedo = canRedo;
                executeCommand(new UndoRedoStateChanged(canUndo, canRedo));
            }
        },
    });

    // Reconcile programmatic text mutations (apply / upload) with the editor.
    watch(
        () => text.value,
        (value) => {
            const ed = editor.value;
            if (!ed) {
                return;
            }
            if (serializeContent(ed) === value) {
                return;
            }
            ed.commands.setContent(plainTextToEditorHtml(value || ""));
        },
    );

    // Shared command handlers: undo / redo / clear content.
    onCommand<UndoCommand>(Cmds.UndoCommand, async () => {
        if (!editor.value?.can().undo()) {
            return;
        }
        editor.value.commands.undo();
    });

    onCommand<RedoCommand>(Cmds.RedoCommand, async () => {
        if (!editor.value?.can().redo()) {
            return;
        }
        editor.value.commands.redo();
    });

    onCommand<ClearTextCommand>(Cmds.ClearTextCommand, async () => {
        if (!editor.value) {
            return;
        }
        text.value = "";
        editor.value.commands.clearContent();
        const state = editor.value.state;
        const newState = EditorState.create({
            schema: state.schema,
            plugins: state.plugins,
            doc: state.doc,
        });
        editor.value.view.updateState(newState);
        undoRedoState.canUndo = false;
        undoRedoState.canRedo = false;
        executeCommand(new UndoRedoStateChanged(false, false));
    });

    // Surface the current (non-collapsed) selection for selection-driven bubbles.
    const selection = ref<EditorSelection | null>(null);

    function syncSelection(): void {
        const ed = editor.value;
        if (!ed) {
            selection.value = null;
            return;
        }
        const { from, to } = ed.state.selection;
        if (from === to) {
            selection.value = null;
            return;
        }
        const lo = Math.min(from, to);
        const hi = Math.max(from, to);
        selection.value = {
            from: lo,
            to: hi,
            text: ed.state.doc.textBetween(lo, hi, "\n"),
        };
    }

    onMounted(() => {
        editor.value?.on("selectionUpdate", syncSelection);
        editor.value?.on("blur", syncSelection);
    });

    onBeforeUnmount(() => {
        editor.value?.off("selectionUpdate", syncSelection);
        editor.value?.off("blur", syncSelection);
    });

    onUnmounted(() => {
        editor.value?.destroy();
    });

    function setContent(value: string): void {
        // Build explicit <p> blocks so `setContent` (which parses as HTML)
        // preserves newlines instead of collapsing them to whitespace.
        editor.value?.commands.setContent(plainTextToEditorHtml(value));
    }

    return { editor, selection, setContent };
}

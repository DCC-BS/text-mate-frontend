import {
    type ApplyTextAtOffsetCommand,
    type ApplyTextCommand,
    Cmds,
    type ToolSwitchCommand,
} from "~/assets/models/commands";
import { useBaseEditor } from "~/composables/useBaseEditor";
import { FocusedSentenceMark } from "~/utils/focusedSentenceMark";
import { FocusedWordMark } from "~/utils/focusedWordMark";
import { mapTextOffsetsToDocPositions } from "~/utils/mapTextOffsets";

export interface UseRewriteEditorOptions {
    /** Two-way text interchange. */
    text: Ref<string>;
    /** Character-count limit. */
    limit: Ref<number> | number;
}

/**
 * Rewrite-tool editor. Builds on {@link useBaseEditor} and adds the
 * focus/sentence/word marks plus the apply-text and tool-switch command
 * handlers. The bubble menu and quick-action streaming live in the wrapper
 * component; this composable only owns editor-adjacent state.
 */
export function useRewriteEditor(options: UseRewriteEditorOptions) {
    const { text, limit } = options;

    const { onCommand } = useCommandBus();
    const toast = useToast();

    // Whether the rewrite bubble/marks are active (toggled by tool switches).
    const isRewriteActive = ref(true);

    const { FocusExtension, focusedSentence, focusedWord, focusedSelection } =
        useTextFocus(isRewriteActive);

    const base = useBaseEditor({
        text,
        limit,
        extraExtensions: [FocusExtension, FocusedSentenceMark, FocusedWordMark],
        enableInputRules: true,
        enablePasteRules: true,
        editorProps: {
            handleKeyDown: (view, event) => {
                // With no active selection, Ctrl+C selects all text first so
                // the user can copy the whole document in one keystroke.
                if (event.ctrlKey && event.key === "c") {
                    if (view.state.selection.empty) {
                        base.editor.value?.commands.selectAll();
                        toast.add({
                            title: "Ctrl+C pressed",
                            description: "Select all",
                            color: "info",
                            icon: "i-lucide-clipboard-list",
                        });
                    }
                }
                return false;
            },
        },
    });

    onCommand<ApplyTextCommand>(Cmds.ApplyTextCommand, async (command) => {
        const ed = base.editor.value;
        if (!ed) {
            return;
        }
        const chain = ed.chain();
        if (!command.addToHistory) {
            chain.setMeta("addToHistory", false);
        }
        chain
            .setTextSelection(command.range)
            .insertContent(command.text, { applyInputRules: true })
            .focus(command.range.from)
            .run();
    });

    onCommand<ApplyTextAtOffsetCommand>(
        Cmds.ApplyTextAtOffsetCommand,
        async (command) => {
            const ed = base.editor.value;
            if (!ed) {
                return;
            }
            // Translate the serialised-text offsets into ProseMirror positions
            // before applying, otherwise node opening tokens shift the range.
            const { from, to } = mapTextOffsetsToDocPositions(
                ed.state.doc,
                command.from,
                command.to,
            );

            const chain = ed.chain();
            if (!command.addToHistory) {
                chain.setMeta("addToHistory", false);
            }
            chain
                .setTextSelection({ from, to })
                .insertContent(command.text, { applyInputRules: true })
                .focus(from)
                .run();
        },
    );

    onCommand<ToolSwitchCommand>(Cmds.ToolSwitchCommand, async (command) => {
        isRewriteActive.value = command.tool === "rewrite";
    });

    return {
        editor: base.editor,
        selection: base.selection,
        focusedSentence,
        focusedWord,
        focusedSelection,
        isRewriteActive,
    };
}

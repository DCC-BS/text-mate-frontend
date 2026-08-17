import type { AdvisorThread } from "~/assets/models/advisor";
import {
    type ApplyTextAtOffsetCommand,
    type ApplyTextCommand,
    ChangeActiveThreadId,
    Cmds,
    RemoveThreadCommand,
} from "~/assets/models/commands";
import { useBaseEditor } from "~/composables/useBaseEditor";
import {
    advisorDecorationKey,
    createAdvisorDecorationExtension,
} from "~/utils/advisorDecorations";
import { serializeAdvisorText } from "~/utils/advisorText";
import { FocusedSentenceMark } from "~/utils/focusedSentenceMark";
import { FocusedWordMark } from "~/utils/focusedWordMark";
import { mapTextOffsetsToDocPositions } from "~/utils/mapTextOffsets";
import {
    createSimplifyDecorationExtension,
    simplifyDecorationKey,
} from "~/utils/simplifyDecorations";

export interface UseWorkspaceEditorOptions {
    /** Two-way text interchange. */
    text: Ref<string>;
    /** Character-count limit. */
    limit: Ref<number> | number;
    /** Whether the editor accepts edits; false during a Diff Review or a stream. */
    editable: Ref<boolean>;
    /** Whether thread decorations render (threads exist + editor visible). */
    decorationsEnabled: Ref<boolean>;
    threads: Ref<AdvisorThread[]>;
    activeThreadId: Ref<string | null>;
}

/**
 * Unified editor factory for the single workspace. Merges the former rewrite
 * editor (focus marks + selection bubble support) and the advisor editor
 * (inline thread decorations + add-note selection) into one Tiptap instance.
 *
 * Editability is driven by {@link UseWorkspaceEditorOptions.editable} (the
 * workspace's 2-state model), not by any tool/phase concept.
 */
export function useWorkspaceEditor(options: UseWorkspaceEditorOptions) {
    const {
        text,
        limit,
        editable,
        decorationsEnabled,
        threads,
        activeThreadId,
    } = options;

    const { onCommand, executeCommand } = useCommandBus();
    const toast = useToast();

    const isRewriteActive = ref(false);

    const { FocusExtension, focusedSentence, focusedWord, focusedSelection } =
        useTextFocus(isRewriteActive);

    const decorationExtension = createAdvisorDecorationExtension({
        getThreads: () => threads.value as AdvisorThread[],
        getActiveId: () => activeThreadId.value,
        getEnabled: () => decorationsEnabled.value,
        onSelect: (id) => executeCommand(new ChangeActiveThreadId(id)),
        onDismiss: (ids) => {
            for (const id of ids) {
                const thread = threads.value.find((t) => t.id === id);
                if (thread) {
                    executeCommand(new RemoveThreadCommand(thread));
                }
            }
        },
    });

    const { result: simplifyResult } = useSimplify();
    const simplifyRangesApi = useSimplifyRanges();
    const simplifyDecorationExtension = createSimplifyDecorationExtension({
        getRanges: () => simplifyRangesApi.ranges.value,
        getActiveId: () => simplifyRangesApi.activeRangeId.value,
        getEnabled: () =>
            editable.value && simplifyRangesApi.ranges.value.length > 0,
        getSeverity: () =>
            simplifyResult.value?.converged === true ? "info" : "amber",
        onSelect: (id) => simplifyRangesApi.selectRange(id),
        onDismiss: (ids) => simplifyRangesApi.dismiss(ids),
    });

    const base = useBaseEditor({
        text,
        limit,
        extraExtensions: [
            FocusExtension,
            FocusedSentenceMark,
            FocusedWordMark,
            decorationExtension,
            simplifyDecorationExtension,
        ],
        serialize: (editor) => serializeAdvisorText(editor.state.doc),
        initialEditable: editable.value,
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

    // Drive editability from the workspace state.
    watch(
        () => editable.value,
        (value) => {
            base.editor.value?.setEditable(value);
        },
    );

    // Rebuild decorations whenever threads, the focused thread, or the enabled
    // flag change.
    watch(
        [threads, activeThreadId, decorationsEnabled],
        () => {
            const view = base.editor.value?.view;
            if (!view) {
                return;
            }
            view.dispatch(view.state.tr.setMeta(advisorDecorationKey, true));
        },
        { deep: true },
    );

    // Rebuild the unconverged-passage highlights whenever the range set or
    // the active range changes.
    watch(
        [
            () => simplifyRangesApi.ranges.value.map((r) => r.id).join(","),
            simplifyRangesApi.activeRangeId,
        ],
        () => {
            const view = base.editor.value?.view;
            if (!view) {
                return;
            }
            view.dispatch(view.state.tr.setMeta(simplifyDecorationKey, true));
        },
    );

    // Scroll the active unconverged passage into view when it changes from
    // elsewhere (e.g. a nav-bar prev/next click).
    watch(
        () => simplifyRangesApi.activeRangeId.value,
        (id) => {
            if (!id) {
                return;
            }
            nextTick(() => {
                const el = base.editor.value?.view.dom.querySelector(
                    `[data-simplify-range-id="${CSS.escape(id)}"]`,
                ) as HTMLElement | null;
                el?.scrollIntoView({ behavior: "smooth", block: "center" });
            });
        },
    );

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

    return {
        editor: base.editor,
        selection: base.selection,
        setContent: base.setContent,
        focusedSentence,
        focusedWord,
        focusedSelection,
        isRewriteActive,
    };
}

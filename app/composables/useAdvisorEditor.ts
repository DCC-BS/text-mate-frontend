import type { AdvisorPhase, AdvisorThread } from "~/assets/models/advisor";
import { ChangeActiveThreadId } from "~/assets/models/commands";
import { useBaseEditor } from "~/composables/useBaseEditor";
import {
    advisorDecorationKey,
    createAdvisorDecorationExtension,
} from "~/utils/advisorDecorations";
import { serializeAdvisorText } from "~/utils/advisorText";

export type AdvisorEditor = ReturnType<typeof useAdvisorEditor>;

/**
 * Owns the advisor Tiptap editor. Builds on {@link useBaseEditor} and adds the
 * inline-decoration plugin for advisor threads. The editor is editable only
 * while the store is in the `edit` phase; from `review` onward it is
 * read-only but remains selectable so the user can create user-comment
 * threads.
 */
export function useAdvisorEditor(
    threads: Ref<AdvisorThread[]>,
    activeThreadId: Ref<string | null>,
    limit: number,
    phase: Ref<AdvisorPhase>,
    text: Ref<string>,
) {
    const { executeCommand } = useCommandBus();

    const decorationExtension = createAdvisorDecorationExtension({
        getThreads: () => threads.value as AdvisorThread[],
        getActiveId: () => activeThreadId.value,
        getPhase: () => phase.value,
        onSelect: (id) => executeCommand(new ChangeActiveThreadId(id)),
    });

    const base = useBaseEditor({
        text,
        limit,
        extraExtensions: [decorationExtension],
        serialize: (editor) => serializeAdvisorText(editor.state.doc),
        initialEditable: phase.value === "edit",
    });

    // Reflect phase changes in the editor's editable flag.
    watch(
        () => phase.value,
        (phase) => {
            base.editor.value?.setEditable(phase === "edit");
        },
    );

    // Rebuild decorations whenever threads, the focused thread, or the phase
    // change (decorations are phase-gated to reviewing/review).
    watch(
        [threads, activeThreadId, phase],
        () => {
            const view = base.editor.value?.view;
            if (!view) {
                return;
            }
            view.dispatch(view.state.tr.setMeta(advisorDecorationKey, true));
        },
        { deep: true },
    );

    return {
        editor: base.editor,
        selection: base.selection,
        setContent: base.setContent,
    };
}

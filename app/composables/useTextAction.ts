import type { Editor } from "@tiptap/vue-3";
import {
    Cmds,
    type ExecuteTextActionCommand,
    RegisterDiffCommand,
    RejectDiffCommand,
    type RetryQuickActionCommand,
    type RunExampleQuickActionCommand,
    ToggleLockEditorCommand,
} from "~/assets/models/commands";

export function useTextAction(editor: Ref<Editor | undefined>) {
    const { onCommand, executeCommand } = useCommandBus();
    const { applyStreamToEditor } = useStreamWriter();
    const { addProgress, removeProgress } = useUseProgressIndication();
    const { lastRequest, runQuickAction } = useQuickAction();
    const { t } = useI18n();

    onCommand<ExecuteTextActionCommand>(
        Cmds.ExecuteTextActionCommand,
        async (command) => {
            if (!editor.value) {
                console.warn("Editor is not initialized yet");
                return;
            }

            try {
                await executeCommand(
                    new RegisterDiffCommand(
                        editor.value.getText(),
                        editor.value.getText(),
                    ),
                );

                await executeCommand(new ToggleLockEditorCommand(true));
                const reader = command.stream.getReader();
                addProgress("quick-action", {
                    icon: "i-lucide-text-search",
                    title: t("status.quickAction"),
                });

                await applyStreamToEditor(reader, editor.value);
            } finally {
                removeProgress("quick-action");
                await executeCommand(new ToggleLockEditorCommand(false));
            }
        },
    );

    onCommand<RetryQuickActionCommand>(
        Cmds.RetryQuickActionCommand,
        async () => {
            if (!editor.value || !lastRequest.value) {
                return;
            }

            // Reject the current suggestion first so the editor holds the
            // original text before the new diff baseline is captured. The revert
            // is suppressed from history so a retry collapses to a single
            // undo step.
            await executeCommand(new RejectDiffCommand(false));
            await runQuickAction(lastRequest.value);
        },
    );

    onCommand<RunExampleQuickActionCommand>(
        Cmds.RunExampleQuickActionCommand,
        async () => {
            if (!editor.value) {
                return;
            }

            await runQuickAction({
                action: "proofread",
                text: editor.value.getText(),
                options: ";language code: auto",
            });
        },
    );
}

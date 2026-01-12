import type { Editor } from "@tiptap/vue-3";
import {
    Cmds,
    type ExecuteTextActionCommand,
    RegisterDiffCommand,
    ToggleLockEditorCommand,
} from "~/assets/models/commands";

export function useTextAction(editor: Ref<Editor | undefined>) {
    const { onCommand, executeCommand } = useCommandBus();
    const { applyStreamToEditor } = useStreamWriter();
    const { addProgress, removeProgress } = useUseProgressIndication();
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
}

import { Extension, getNodeType } from "@tiptap/vue-3";
import type { Editor } from "@tiptap/core";
import type { Node } from "@tiptap/pm/model";
import {
    Cmds,
    CompleteRequestChangeCommand,
    type RequestChangesCommand,
} from "~/assets/models/commands";
import { TextAddedMark } from "~/utils/text-added-mark";
import { TextApplyNode } from "~/utils/text-apply-changes-node";
import { colorPicker } from "#build/ui";

/**
 * Composable for tracking changes in the editor, showing added and removed text
 * in a way similar to VS Code's change tracking.
 *
 * @returns {Object} TrackChangesExtension - Extension to be added to the editor
 */
export const useTrackChanges = () => {
    const { registerHandler, unregisterHandler } = useCommandBus();

    const logger = useLogger();
    const isActive = ref(false);
    const textToCompare = ref("");
    const editor = ref<Editor>();
    const applyNode = ref<Node>();

    onMounted(() => {
        registerHandler(
            Cmds.RequestChangesCommand,
            handleRequestChangesCommand,
        );
        registerHandler(
            Cmds.CompleteRequestChangeCommand,
            handleCompleteRequestChangeCommand,
        );
    });

    onUnmounted(() => {
        unregisterHandler(
            Cmds.RequestChangesCommand,
            handleRequestChangesCommand,
        );
        unregisterHandler(
            Cmds.CompleteRequestChangeCommand,
            handleCompleteRequestChangeCommand,
        );
    });

    /**
     * Handle track changes commands
     * @param {RequestChangesCommand} command - The command to handle
     */
    async function handleRequestChangesCommand(command: RequestChangesCommand) {
        if (!editor.value) {
            logger.error("Editor is not initialized");
            return;
        }

        editor.value
            .chain()
            .focus(command.to)
            .insertContent(
                `<text-apply from="${command.from}" to="${command.to}" newText="${command.newText}" oldText="${command.oldText}"></text-apply>`,
            )
            .setTextSelection({ from: command.from, to: command.to })
            .run();

        editor.value.setEditable(false, false);
    }

    async function handleCompleteRequestChangeCommand(
        command: CompleteRequestChangeCommand,
    ) {
        if (!editor.value) {
            logger.error("Editor is not initialized");
            return;
        }

        console.log(command);

        let nodeFrom = 0;
        let nodeTo = 0;
        editor.value.state.doc.descendants((node, pos) => {
            if (node.type.name === "textApply") {
                nodeFrom = pos;
                nodeTo = pos + node.nodeSize;
            }
        });

        editor.value
            .chain()
            .setMeta("addToHistory", false)
            .deleteRange({ from: nodeFrom, to: nodeTo })
            .run();

        if (command.mode === "reject") {
            editor.value
                .chain()
                .setMeta("addToHistory", false)
                .setTextSelection({
                    from: command.requestCommand.from,
                    to: command.requestCommand.to,
                })
                .insertContent(command.requestCommand.oldText)
                .run();
        }

        editor.value.setEditable(true, true);
    }

    /**
     * Track Changes Extension for Tiptap
     */
    const TrackChangesExtension = Extension.create({
        name: "trackChangesExtension",

        /**
         * Store editor reference on creation
         */
        onCreate() {
            editor.value = this.editor;
        },

        /**
         * Add required extensions
         */
        addExtensions() {
            return [TextRemovedMark, TextAddedMark, TextApplyNode];
        },

        /**
         * Track changes on document updates
         */
        onUpdate() {
            if (
                !isActive.value ||
                !textToCompare.value ||
                !applyNode.value ||
                !("newText" in applyNode.value.attrs)
            ) {
                return;
            }

            const currentText = this.editor.getText();
        },
    });

    return {
        TrackChangesExtension,
    };
};

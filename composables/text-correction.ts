import { Extension } from "@tiptap/vue-3";
import type { Editor } from "@tiptap/core";
import { CorrectionMark } from "~/utils/correction-mark";
import type { MarkType, Node } from "@tiptap/pm/model";
import type {
    CorrectedSentence,
    TextCorrectionBlock,
} from "~/assets/models/text-correction";
import { getMarkType } from "@tiptap/vue-3";
import {
    type ApplyCorrectionCommand,
    ApplyTextCommand,
    Cmds,
    type CorrectedSentenceChangedCommand,
    JumpToBlockCommand,
} from "~/assets/models/commands";
import { makeCorrectedSentenceAbsolute } from "~/assets/services/CorrectionService";

export function useTextCorrectionMarks(
    container: Ref<HTMLElement | undefined>,
    isActive: Ref<boolean>,
) {
    const { registerHandler, unregisterHandler, executeCommand } =
        useCommandBus();

    const logger = useLogger();

    const hoverRect = ref<DOMRect>();
    const hoverBlock = ref<TextCorrectionBlock>();
    const editor = ref<Editor>();
    const correctedSentence = ref<Record<string, CorrectedSentence>>({});
    const blocks = computed(() => {
        if (!correctedSentence.value) {
            return [];
        }

        return Object.values(correctedSentence.value).flatMap((sentence) => {
            return makeCorrectedSentenceAbsolute(sentence).blocks;
        });
    });

    const relativeHoverRect = computed(() => {
        if (!hoverRect.value) return;

        const containerRect = container.value?.getBoundingClientRect();

        if (!containerRect) return;

        return {
            top: hoverRect.value.top - containerRect.top,
            left: hoverRect.value.left - containerRect.left,
            width: hoverRect.value.width,
            height: hoverRect.value.height,
        };
    });

    const CorrectionExtension = Extension.create({
        onCreate(this) {
            editor.value = this.editor;
        },
        name: "correctionExtension",
        addExtensions: () => [
            CorrectionMark.configure({
                onMouseEnter: (event: MouseEvent, node: Node) => {
                    if (hoverBlock.value || !isActive.value) {
                        return;
                    }

                    const mark = node.marks.find(
                        (m) => m.attrs["data-block-id"],
                    );

                    const id = mark?.attrs["data-block-id"];
                    const block = blocks.value.find((b) => b.offset === id);

                    if (
                        !block ||
                        !editor.value ||
                        block.corrected.length === 0
                    ) {
                        return;
                    }

                    hoverBlock.value = block;
                    hoverRect.value = getRangeBoundingBox(
                        editor.value,
                        block.offset + 1,
                        block.offset + block.length + 1,
                    );

                    executeCommand(new JumpToBlockCommand(block));
                },
            }),
        ],
    });

    // Wait for both the editor to be available and the container to be mounted
    watch(
        [() => editor.value, () => container.value],
        ([editorValue, containerValue]) => {
            if (!editorValue || !containerValue || !isActive.value) return;

            containerValue.onmousemove = (event) => {
                if (!hoverRect.value) return;

                const bottomThreshold = 50;
                const xThreshold = 2;

                // check if the mouse is far away from the hover rect
                if (
                    event.clientX < hoverRect.value.left - xThreshold ||
                    event.clientX > hoverRect.value.right + xThreshold ||
                    event.clientY < hoverRect.value.top ||
                    event.clientY > hoverRect.value.bottom + bottomThreshold
                ) {
                    hoverBlock.value = undefined;
                    hoverRect.value = undefined;
                }
            };
        },
        { immediate: true },
    );

    watch(isActive, (value) => {
        hoverBlock.value = undefined;
        hoverRect.value = undefined;

        if (!editor.value) {
            return;
        }

        const type = getCorrectionMarkType(editor.value);

        if (value) {
            addMarks(editor.value, blocks.value, 0, type);
        } else {
            editor.value.view.dispatch(
                editor.value.state.tr
                    .setMeta("addToHistory", false)
                    .removeMark(0, editor.value.state.doc.content.size, type),
            );
        }
    });

    async function handleCorrectedSentenceChanged(
        command: CorrectedSentenceChangedCommand,
    ) {
        if (!editor.value || editor.value.getText().length === 0) {
            return;
        }

        hoverBlock.value = undefined;
        hoverRect.value = undefined;

        const type = getCorrectionMarkType(editor.value);

        function removeMarks(sentence: CorrectedSentence) {
            if (!editor.value) {
                logger.warn("Editor not available");
                return;
            }

            if (!editor.value.state.doc) {
                return;
            }

            if (
                sentence.from > sentence.to ||
                sentence.to > editor.value.state.doc.content.size
            ) {
                logger.warn(
                    `Invalid range for removing marks: ${sentence.from} - ${sentence.to} doc size: ${editor.value.state.doc.content.size}`,
                );
                return;
            }

            editor.value.view.dispatch(
                editor.value.state.tr
                    .setMeta("addToHistory", false)
                    .removeMark(sentence.from, sentence.to, type),
            );
        }

        function addMarksForSentence(sentence: CorrectedSentence) {
            if (!editor.value) {
                logger.warn("Editor not available");
                return;
            }

            if (!isActive.value) {
                return;
            }

            addMarks(editor.value, sentence.blocks, sentence.from, type);
        }

        if (command.change === "add") {
            correctedSentence.value[command.correctedSentence.id] =
                command.correctedSentence;

            addMarksForSentence(command.correctedSentence);
        } else if (command.change === "remove") {
            if (command.correctedSentence.id in correctedSentence.value) {
                delete correctedSentence.value[command.correctedSentence.id];
            } else {
                logger.warn(
                    `Corrected sentence not found in correctedSentence ${
                        command.correctedSentence
                    }`,
                );
            }

            removeMarks(command.correctedSentence);
        } else {
            correctedSentence.value[command.correctedSentence.id] =
                command.correctedSentence;

            removeMarks(command.correctedSentence);
            addMarksForSentence(command.correctedSentence);
        }
    }

    async function applyCorrection(command: ApplyCorrectionCommand) {
        if (!editor.value) return;

        hoverBlock.value = undefined;
        hoverRect.value = undefined;

        const block = command.block;
        const corrected = command.corrected;

        const start = block.offset + 1;
        const end = start + block.length;

        await executeCommand(
            new ApplyTextCommand(corrected, { from: start, to: end }),
        );
    }

    onMounted(() => {
        registerHandler(
            Cmds.CorrectedSentenceChangedCommand,
            handleCorrectedSentenceChanged,
        );
        registerHandler(Cmds.ApplyCorrectionCommand, applyCorrection);
    });

    onUnmounted(() => {
        unregisterHandler(
            Cmds.CorrectedSentenceChangedCommand,
            handleCorrectedSentenceChanged,
        );
        unregisterHandler(Cmds.ApplyCorrectionCommand, applyCorrection);
    });

    return {
        CorrectionExtension,
        hoverBlock,
        relativeHoverRect,
    };
}

function getCorrectionMarkType(editor: Editor) {
    return getMarkType("correction", editor.state.schema);
}

function addMarks(
    editor: Editor,
    blocks: TextCorrectionBlock[],
    offset: number,
    type: MarkType,
) {
    if (editor.getText().length === 0) {
        return;
    }

    for (const block of blocks) {
        const start = block.offset + offset + 1;
        const end = start + block.length;

        editor.view.dispatch(
            editor.state.tr.setMeta("addToHistory", false).addMark(
                start,
                end,
                type.create({
                    "data-block-id": start - 1,
                }),
            ),
        );
    }
}

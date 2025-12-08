import type { ILogger } from "@dcc-bs/logger.bs.js";
import type { Editor } from "@tiptap/core";
import type { MarkType, Node } from "@tiptap/pm/model";
import { Extension, getMarkType } from "@tiptap/vue-3";
import {
    type ApplyCorrectionCommand,
    ApplyTextCommand,
    Cmds,
    JumpToBlockCommand,
} from "~/assets/models/commands";
import type { TextCorrectionBlock } from "~/assets/models/text-correction";
import { CorrectionMark } from "~/utils/correctionMark";
import { useCorrection } from "./correction";

export function useTextCorrectionMarks(
    container: Ref<HTMLElement | undefined>,
    isActive: Ref<boolean>,
) {
    const { executeCommand, registerHandler, unregisterHandler } =
        useCommandBus();
    const logger = useLogger();
    const {
        onCorrectedBlockAdded,
        onCorrectedBlockRemoved,
        onCorrectedBlockUpdated,
        blocks,
    } = useCorrection();

    const hoverRect = ref<DOMRect>();
    const hoverBlock = ref<TextCorrectionBlock>();
    const editor = ref<Editor>();
    const markType = computed(() =>
        editor.value ? getCorrectionMarkType(editor.value) : undefined,
    );

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
                onMouseEnter: (_: MouseEvent, node: Node) => {
                    if (!isActive.value) {
                        return;
                    }

                    const mark = node.marks.find(
                        (m) => m.attrs["data-block-id"],
                    );

                    const id = mark?.attrs["data-block-id"];
                    const block = blocks.value.find((b) => b.id === id);

                    if (
                        !block ||
                        !editor.value ||
                        block.corrected.length === 0
                    ) {
                        logger.warn(`Block not found or empty: ${id} ${block}`);
                        return;
                    }

                    hoverBlock.value = block;
                    hoverRect.value = getRangeBoundingBox(
                        editor.value,
                        block.offset,
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
            addMarks(editor.value, blocks.value, 0, type, logger);
        } else {
            editor.value.view.dispatch(
                editor.value.state.tr
                    .setMeta("addToHistory", false)
                    .removeMark(0, editor.value.state.doc.content.size, type),
            );
        }
    });

    function removeMark(block: TextCorrectionBlock) {
        if (!editor.value || !markType.value) {
            logger.warn("Editor not available");
            return;
        }

        hoverBlock.value = undefined;
        hoverRect.value = undefined;

        try {
            let foundMark = undefined as
                | {
                      from: number;
                      to: number;
                  }
                | undefined;

            editor.value.state.doc.descendants((node, pos) => {
                if (node.marks.length === 0) return true;
                const mark = node.marks.find(
                    (m) => m.attrs["data-block-id"] === block.id,
                );

                if (mark) {
                    foundMark = {
                        from: pos,
                        to: pos + node.nodeSize,
                    };
                }
            });

            // if mark was found, remove it
            // when the node of the mark for example the word which was marked was completely removed the mark is also removed
            // so we don't need to remove it
            if (foundMark) {
                editor.value.view.dispatch(
                    editor.value.state.tr
                        .setMeta("addToHistory", false)
                        .removeMark(
                            foundMark.from,
                            foundMark.to,
                            markType.value,
                        ),
                );
            }
        } catch (e) {
            logger.error("Error removing mark", e);
            // ignore
        }
    }

    function addMark(block: TextCorrectionBlock) {
        if (!editor.value || !markType.value) {
            logger.warn("Editor not available");
            return;
        }

        if (!isActive.value) {
            return;
        }

        editor.value.view.dispatch(
            editor.value.state.tr.setMeta("addToHistory", false).addMark(
                block.offset,
                block.offset + block.length,
                markType.value.create({
                    "data-block-id": block.id,
                }),
            ),
        );
    }

    onCorrectedBlockAdded((block) => {
        removeMark(block);
        addMark(block);
    });

    onCorrectedBlockRemoved((block) => {
        removeMark(block);
    });

    onCorrectedBlockUpdated((block) => {
        removeMark(block);
        addMark(block);
    });

    onMounted(() => {
        registerHandler(Cmds.ApplyCorrectionCommand, applyCorrection);
    });

    onUnmounted(() => {
        unregisterHandler(Cmds.ApplyCorrectionCommand, applyCorrection);
    });

    async function applyCorrection(command: ApplyCorrectionCommand) {
        if (!editor.value) return;

        hoverBlock.value = undefined;
        hoverRect.value = undefined;

        const block = command.block;
        const corrected = command.corrected;

        const start = block.offset;
        const end = start + block.length;

        await executeCommand(
            new ApplyTextCommand(corrected, { from: start, to: end }),
        );
    }

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
    logger: ILogger,
) {
    for (const block of blocks) {
        const start = block.offset + offset + 1;
        const end = start + block.length;

        if (!editor.view.state.doc) {
            logger.warn("Editor document not available");
            return;
        }

        editor.view.dispatch(
            editor.state.tr.setMeta("addToHistory", false).addMark(
                start,
                end,
                type.create({
                    "data-block-id": block.id,
                }),
            ),
        );
    }
}

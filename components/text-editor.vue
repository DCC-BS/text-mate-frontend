<script setup lang="ts">
import CharacterCount from "@tiptap/extension-character-count";
import type { Node } from "@tiptap/pm/model";
import StarterKit from "@tiptap/starter-kit";
import {
    BubbleMenu,
    EditorContent,
    type Range,
    getMarkType,
    useEditor,
} from "@tiptap/vue-3";
// biome-ignore lint/style/useImportType: This is a bug in the biome plugin ApplyCorrectionCommand cannot be imported as a type
import {
    ApplyCorrectionCommand,
    ApplyTextCommand,
    Cmds,
    UndoRedoStateChanged,
} from "~/assets/models/commands";
import type { TextCorrectionBlock } from "~/assets/models/text-correction";
import { CorrectionMark } from "~/utils/correction-mark";
import type { ICommand } from "#build/types/commands";

// input
const props = defineProps<{
    blocks: TextCorrectionBlock[];
}>();

// output
const emit = defineEmits<{
    blockClick: [block: TextCorrectionBlock];
    blockSelected: [block: TextCorrectionBlock];
    completeText: [text: string, position: number];
    rewriteText: [text: string, Range];
    correctionApplied: [block: TextCorrectionBlock, corrected: string];
}>();

// model
const model = defineModel<string>("modelValue", { required: true });

// refs
const limit = ref(10_000);
const container = ref<HTMLDivElement>();
const hoverBlock = ref<TextCorrectionBlock>();
const hoverRect = ref<DOMRect>();
const focusedWord = ref<string>();
const focusedSentence = ref<string>();
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
const undoRedoState = ref({
    canUndo: false,
    canRedo: false,
});

// computed
const characterCountPercentage = computed(() =>
    Math.round(
        (100 / limit.value) * editor.value?.storage.characterCount.characters(),
    ),
);

// composables
const toast = useToast();
const { t } = useI18n();
const { registerHandler, unregisterHandler, executeCommand } = useCommandBus();

const editor = useEditor({
    content: model.value,
    extensions: [
        StarterKit,
        // @ts-expect-error
        BubbleMenu,
        CharacterCount.configure({
            limit: limit.value,
        }),
        CorrectionMark.configure({
            onMouseEnter: (event: MouseEvent, node: Node) => {
                if (hoverBlock.value) {
                    return;
                }

                const mark = node.marks.find((m) => m.attrs["data-block-id"]);

                const id = mark?.attrs["data-block-id"];
                const block = props.blocks.find((b) => b.offset === id);

                if (!block || !editor.value || block.corrected.length === 0) {
                    return;
                }

                hoverBlock.value = block;
                hoverRect.value = getRangeBoundingBox(
                    editor.value,
                    block.offset + 1,
                    block.offset + block.length + 1,
                );

                emit("blockClick", block);
            },
        }),
    ],
    editorProps: {
        handleKeyDown: (view, event) => {
            // Check if Ctrl+C is pressed
            if (event.ctrlKey && event.key === "c") {
                // Check if there is no text selection
                if (editor.value?.state.selection.empty) {
                    // Select all text
                    editor.value?.commands.selectAll();
                    toast.add({
                        title: "Ctrl+C pressed",
                        description: "Select all text",
                        color: "info",
                        icon: "i-heroicons-clipboard-document-list",
                    });
                }
            }
        },
    },
    onSelectionUpdate: ({ editor }) => {
        const doc = editor.state.doc;
        const { from, to } = editor.state.selection;
        const startOfWord = findStartOfWord(doc, from);
        const endOfWord = findEndOfWord(doc, to);
        const word = doc.textBetween(startOfWord, endOfWord);
        const startOfSentence = findStartOfSentence(doc, from);
        const endOfSentence = findEndOfSentence(doc, to);
        const sentence = doc.textBetween(startOfSentence, endOfSentence);

        console.log("word", word);

        focusedWord.value = word;
        focusedSentence.value = sentence;
    },
    onUpdate: ({ editor }) => {
        model.value = editor.getText();

        const canUndo = editor.can().undo();
        const canRedo = editor.can().redo();

        if (
            undoRedoState.value.canUndo !== canUndo ||
            undoRedoState.value.canRedo !== canRedo
        ) {
            undoRedoState.value = { canUndo, canRedo };
            executeCommand(new UndoRedoStateChanged(canUndo, canRedo));
        }
    },
});

function findStartOfWord(doc: Node, pos: number) {
    let current = pos;

    while (current > 0 && /\S/.test(doc.textBetween(current - 1, current))) {
        current--;
    }
    return current;
}

function findEndOfWord(doc: Node, pos: number) {
    let current = pos;

    while (
        current < doc.content.size &&
        /\S/.test(doc.textBetween(current, current + 1))
    ) {
        current++;
    }
    return current;
}

function findStartOfSentence(doc: Node, pos: number) {
    let current = pos;

    while (
        current > 0 &&
        !".!?".includes(doc.textBetween(current - 1, current))
    ) {
        current--;
    }
    return current;
}

function findEndOfSentence(doc: Node, pos: number) {
    let current = pos;
    while (
        current < doc.content.size &&
        !".!?".includes(doc.textBetween(current, current + 1))
    ) {
        current++;
    }
    return current;
}

// lifecycle
onMounted(() => {
    registerHandler(Cmds.ApplyCorrectionCommand, applyCorrection);
    registerHandler(Cmds.ApplyTextCommand, applyText);
    registerHandler(Cmds.UndoCommand, applyUndo);
    registerHandler(Cmds.RedoCommand, applyRedo);
});

// Wait for both the editor to be available and the container to be mounted
watch(
    [() => editor.value, () => container.value],
    ([editorValue, containerValue]) => {
        if (!editorValue || !containerValue) return;

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

onUnmounted(() => {
    editor.value?.destroy();

    unregisterHandler(Cmds.ApplyCorrectionCommand, applyCorrection);
    unregisterHandler(Cmds.ApplyTextCommand, applyText);
    unregisterHandler(Cmds.UndoCommand, applyUndo);
    unregisterHandler(Cmds.RedoCommand, applyRedo);
});

// listeners
watch(model, (value) => {
    if (!editor.value) return;

    if (editor.value.getText() === value) {
        return;
    }

    editor.value.commands.setContent(value);
});

watch(
    () => props.blocks,
    (value) => {
        if (!editor.value) return;

        hoverBlock.value = undefined;
        hoverRect.value = undefined;

        const type = getMarkType("correction", editor.value.state.schema);

        editor.value.view.dispatch(
            editor.value.state.tr.removeMark(
                0,
                editor.value.state.doc.content.size,
                type,
            ),
        );

        for (const block of value) {
            const start = block.offset + 1;
            const end = start + block.length;

            editor.value.view.dispatch(
                editor.value.state.tr.addMark(
                    start,
                    end,
                    type.create({
                        "data-block-id": block.offset,
                    }),
                ),
            );
        }
    },
);

// functions
function rewriteText() {
    if (!editor.value) {
        return;
    }

    emit("rewriteText", editor.value.getText(), editor.value.state.selection);
}

async function applyCorrection(command: ApplyCorrectionCommand) {
    if (!editor.value) return;

    hoverBlock.value = undefined;
    hoverRect.value = undefined;

    const block = command.block;
    const corrected = command.corrected;

    const start = block.offset + 1;
    const end = start + block.length;

    applyText(new ApplyTextCommand(corrected, { from: start, to: end }));

    emit("correctionApplied", block, corrected);
}

async function applyText(command: ApplyTextCommand) {
    if (!editor.value) return;
    const text = command.text;
    const range = command.range;

    editor.value
        .chain()
        .deleteRange(range)
        .insertContentAt(range.from, text)
        .focus(range.from)
        .run();
}

async function applyUndo(_: ICommand) {
    if (!editor.value || !editor.value.can().undo()) return;

    editor.value.commands.undo();
}

async function applyRedo(_: ICommand) {
    if (!editor.value || !editor.value.can().redo()) return;

    editor.value.commands.redo();
}
</script>

<template>
    <div ref="container" v-if="editor" class="w-full h-full flex flex-col gap-2 p-2 @container relative">
        <QuickActionsPanel :editor="editor" />

        <UPopover :open="!!hoverBlock" :content="{onOpenAutoFocus: (e) => e.preventDefault()}" class="absolute">
            <div class="absolute pointer-events-none select-none touch-none" :style="{
                top: relativeHoverRect?.top + 'px', 
                left: relativeHoverRect?.left + 'px',
                width: relativeHoverRect?.width + 'px',
                height: relativeHoverRect?.height + 'px',}">
            </div>

            <template #content>
                <div
                    v-if="hoverBlock && hoverBlock.corrected.length > 0"
                    class="flex flex-wrap gap-1 justify-center p-2">
                    <UButton
                        v-for="correction in hoverBlock.corrected.slice(0, 5)" :key="correction"
                        @click="applyCorrection(new ApplyCorrectionCommand(hoverBlock, correction))">
                        {{ correction }}
                    </UButton>
                </div>
            </template>
        </UPopover>

        <bubble-menu :editor="editor" :tippy-options="{ duration: 100 }" :should-show="() => true">
            <div class="bubble-menu">
                <div v-if="focusedSentence && focusedSentence.length > 0">
                    <UButton variant="subtle">
                        Satzt umformulieren
                    </UButton>
                    <span class="text-sm text-gray-500">

                        {{ focusedSentence }}
                    </span>
                </div>

                <div v-if="focusedSentence && focusedWord && focusedWord.length > 0">
                        <UButton
                            variant="subtle">
                            Wort umformulieren
                        </UButton>
                    <span class="text-sm text-gray-500">
                        {{ focusedWord }}
                    </span>
                </div>

                <UButton variant="ghost" @click="rewriteText">
                    {{ t('editor.rewrite') }}
                </UButton>
            </div>
        </bubble-menu>
        <div class="ring-1 ring-gray-400 w-full h-full overflow-y-scroll">
            <editor-content :editor="editor" spellcheck="false" class="w-full h-full" />
        </div>
        <div
            class="flex gap-2 items-start justify-between"
            :class="{ 'character-count--warning': editor.storage.characterCount.characters() === limit }">
            <DisclaimerLlm />
            <div class="data-bs-banner">
                <DataBsBanner class="text-center" />
            </div>

            <div class="flex items-center gap-2">
                <svg height="20" width="20" viewBox="0 0 20 20">
                    <circle r="10" cx="10" cy="10" fill="#e9ecef" />
                    <circle
                        r="5" cx="10" cy="10" fill="transparent" stroke="currentColor" stroke-width="10"
                        :stroke-dasharray="`calc(${characterCountPercentage} * 31.4 / 100) 31.4`"
                        transform="rotate(-90) translate(-20)" />
                    <circle r="6" cx="10" cy="10" fill="white" />
                </svg>

                {{ editor.storage.characterCount.characters() }} / {{ limit }} characters
                <br class="hidden md:block">
                {{ editor.storage.characterCount.words() }} words
            </div>
        </div>
    </div>
</template>


<style>
@reference "../assets/css/main.css";

.correction {
    @apply underline decoration-wavy decoration-red-500 cursor-pointer;

    text-decoration-line: underline;
    text-decoration-style: wavy;
    text-decoration-color: var(--color-red-500);
    cursor: pointer;
}

.correction:hover {
    text-decoration-color: blueviolet;
}

.correction .active {
    @apply bg-blue-100;
}

.character-count--warning {
    @apply text-red-500;
}

.data-bs-banner {
    @apply hidden @md:inline max-md:hidden;
}

@media screen and (max-height: 600px) {
    .data-bs-banner {
        @apply hidden;
    }
}

.fade-in {
  opacity: 0; /* Start completely transparent */
  animation: fadeIn 2s ease-in forwards; /* Apply the fadeIn animation */
}

/* Keyframes for the fade-in effect */
@keyframes fadeIn {
  from {
    opacity: 0; /* Start transparent */
  }
  to {
    opacity: 1; /* End fully visible */
  }
}
</style>

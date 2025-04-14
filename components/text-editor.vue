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
    CorrectedSentenceChangedCommand,
    UndoRedoStateChanged,
} from "~/assets/models/commands";
import type {
    CorrectedSentence,
    TextCorrectionBlock,
} from "~/assets/models/text-correction";
import { CorrectionMark } from "~/utils/correction-mark";
import { FocusedSentenceMark } from "~/utils/focused-sentence-mark";
import { FocusedWordMark } from "~/utils/focused-word-mark";
import type { ICommand } from "#build/types/commands";

import { makeCorrectedSentenceAbsolute } from "~/assets/services/CorrectionService";

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
const selectedText = defineModel<TextFocus>("selectedText");

// refs
const limit = ref(10_000);
const container = ref<HTMLDivElement>();
const hoverBlock = ref<TextCorrectionBlock>();
const hoverRect = ref<DOMRect>();
const wordSynonyms = ref<string[]>();
const alternativeSentences = ref<string[]>();
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
const { FocusExtension, focusedSentence, focusedWord, focusedSelection } =
    useTextFocus();
const { addProgress, removeProgress } = useUseProgressIndication();

const editor = useEditor({
    content: model.value,
    extensions: [
        StarterKit,
        // @ts-expect-error
        BubbleMenu,
        FocusExtension,
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
                const block = blocks.value.find((b) => b.offset === id);

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
        FocusedSentenceMark,
        FocusedWordMark,
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
    onUpdate: ({ editor }) => {
        if (!editor.isEditable) return;

        model.value = getContent();

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

// lifecycle
onMounted(() => {
    registerHandler(
        Cmds.CorrectedSentenceChangedCommand,
        handleCorrectedSentenceChanged,
    );
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

watch(focusedSelection, (value) => {
    selectedText.value = value;
});

onUnmounted(() => {
    editor.value?.destroy();

    unregisterHandler(
        Cmds.CorrectedSentenceChangedCommand,
        handleCorrectedSentenceChanged,
    );
    unregisterHandler(Cmds.ApplyCorrectionCommand, applyCorrection);
    unregisterHandler(Cmds.ApplyTextCommand, applyText);
    unregisterHandler(Cmds.UndoCommand, applyUndo);
    unregisterHandler(Cmds.RedoCommand, applyRedo);
});

// listeners
watch(model, (value) => {
    if (!editor.value) return;

    if (getContent() === value) {
        return;
    }

    editor.value.commands.setContent(value);
});

watch(
    () => blocks.value,
    (value) => {
        if (!editor.value) return;

        hoverBlock.value = undefined;
        hoverRect.value = undefined;

        const type = getMarkType("correction", editor.value.state.schema);

        editor.value.view.dispatch(
            editor.value.state.tr
                .setMeta("addToHistory", false)
                .removeMark(0, editor.value.state.doc.content.size, type),
        );

        for (const block of value) {
            const start = block.offset + 1;
            const end = start + block.length;

            editor.value.view.dispatch(
                editor.value.state.tr.setMeta("addToHistory", false).addMark(
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

watch(focusedWord, (newValue, oldValue) => {
    if (newValue !== oldValue) {
        wordSynonyms.value = [];
    }
});

watch(focusedSentence, (newValue, oldValue) => {
    if (newValue !== oldValue) {
        alternativeSentences.value = [];
    }
});

function getContent() {
    if (!editor.value) {
        return "";
    }

    return editor.value.getText();
}

// functions
async function handleCorrectedSentenceChanged(
    command: CorrectedSentenceChangedCommand,
) {
    if (!editor.value) return;

    hoverBlock.value = undefined;
    hoverRect.value = undefined;

    const type = getMarkType("correction", editor.value.state.schema);

    function removeMarks(sentence: CorrectedSentence) {
        if (!editor.value) return;

        editor.value.view.dispatch(
            editor.value.state.tr
                .setMeta("addToHistory", false)
                .removeMark(sentence.from, sentence.to, type),
        );
    }

    function addMarks(sentence: CorrectedSentence) {
        if (!editor.value) return;

        for (const block of sentence.blocks) {
            const start = block.offset + sentence.from;
            const end = start + block.length;

            editor.value.view.dispatch(
                editor.value.state.tr.setMeta("addToHistory", false).addMark(
                    start,
                    end,
                    type.create({
                        "data-block-id": block.offset,
                    }),
                ),
            );
        }
    }

    if (command.change === "add") {
        correctedSentence.value[command.correctedSentence.id] =
            command.correctedSentence;

        addMarks(command.correctedSentence);
    } else if (command.change === "remove") {
        delete correctedSentence.value[command.correctedSentence.id];

        removeMarks(command.correctedSentence);
    } else {
        correctedSentence.value[command.correctedSentence.id] =
            command.correctedSentence;

        removeMarks(command.correctedSentence);
        addMarks(command.correctedSentence);
    }
}

async function findWordSynonym() {
    if (
        !focusedSentence.value ||
        !focusedWord.value ||
        focusedWord.value.text.length === 0 ||
        focusedSentence.value.text.length === 0
    ) {
        return;
    }

    addProgress("finding-synonym", {
        title: t("text-editor.finding-synonym"),
        icon: "i-heroicons-magnifying-glass",
    });

    try {
        const result = await getWordSynonym(
            focusedWord.value.text,
            focusedSentence.value.text,
        );

        wordSynonyms.value = result.synonyms;
    } finally {
        removeProgress("finding-synonym");
    }
}

async function applyWordSynonym(synonym: string) {
    if (!focusedWord.value || !focusedSentence.value) {
        return;
    }

    await applyText(
        new ApplyTextCommand(synonym, {
            from: focusedWord.value.start,
            to: focusedWord.value.end,
        }),
    );

    wordSynonyms.value = [];
}

async function findAlternativeSentence() {
    if (!focusedSentence.value) {
        return;
    }

    addProgress("finding-alternative-sentence", {
        title: t("text-editor.finding-alternative-sentence"),
        icon: "i-heroicons-magnifying-glass",
    });

    try {
        const result = await getAlternativeSentences(
            focusedSentence.value.text,
            model.value,
        );

        alternativeSentences.value = result.options;
    } finally {
        removeProgress("finding-alternative-sentence");
    }
}

async function applyAlternativeSentence(sentence: string) {
    if (!focusedSentence.value) {
        return;
    }

    await applyText(
        new ApplyTextCommand(sentence, {
            from: focusedSentence.value.start,
            to: focusedSentence.value.end,
        }),
    );

    alternativeSentences.value = [];
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

        <bubble-menu
            :editor="editor" 
            :tippy-options="{ duration: 100, placement: 'bottom', arrow: true, popperOptions: { placement: 'bottom'} }"
            :should-show="() => true">
            <div class="bg-gray-100 p-2 rounded-lg flex gap-2 border border-gray-300"
            v-if="focusedSentence || focusedWord">
                <div v-if="focusedWord">
                        <UButton
                            @click="findWordSynonym"
                            variant="subtle">
                            Wort umformulieren
                        </UButton>

                        <div class="flex gap-1 flex-col pt-1">
                            <UButton
                                v-for="synonym in wordSynonyms"
                                :key="synonym"
                                @click="applyWordSynonym(synonym)">
                                {{ synonym }}
                            </UButton>
                        </div>
                </div>
                <div v-if="focusedSentence">
                    <UButton
                        @click="findAlternativeSentence"
                        variant="subtle">
                        Satzt umformulieren
                    </UButton>

                    <div class="flex gap-1 flex-col pt-1">
                        <UButton
                            v-for="sentence in alternativeSentences"
                            :key="sentence"
                            @click="applyAlternativeSentence(sentence)">
                            {{ sentence }}
                        </UButton>
                    </div>
                </div>
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


<style lang="css">
@reference "../assets/css/main.css";

.correction {
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

.focused-sentence {
    @apply bg-blue-100;

    background-color: var(--color-blue-100);
    border-radius: 2px;
    padding: 1px 0;
}

.focused-word {
    color: var(--color-blue-500);
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

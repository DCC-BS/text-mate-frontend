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
import {
    type ApplyCorrectionCommand,
    ApplyTextCommand,
    Cmds,
} from "~/assets/models/commands";
import type { TextCorrectionBlock } from "~/assets/models/text-correction";
import { CorrectionMark } from "~/utils/correction-mark";

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

// computed
const currentPosition = computed(
    () => editor.value?.state.selection.from ?? -1,
);
const currentBlock = computed(() =>
    props.blocks.find((b) => b.offset + 1 === currentPosition.value),
);
const characterCountPercentage = computed(() =>
    Math.round(
        (100 / limit.value) * editor.value?.storage.characterCount.characters(),
    ),
);

// composables
const toast = useToast();
const { t } = useI18n();
const { registerHandler, unregisterHandler } = useCommandBus();

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
            onClick: (event: MouseEvent, node: Node) => {
                const mark = node.marks.find((m) => m.attrs["data-block-id"]);

                const id = mark?.attrs["data-block-id"];
                const block = props.blocks.find((b) => b.offset === id);

                if (!block) return;

                editor.value
                    ?.chain()
                    .setTextSelection({
                        from: block.offset + 1,
                        to: block.offset + block.length + 1,
                    })
                    .run();

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
    onUpdate: ({ editor }) => {
        model.value = editor.getText();
    },
});

// lifecycle
onMounted(() => {
    registerHandler(Cmds.ApplyCorrectionCommand, applyCorrection);
    registerHandler(Cmds.ApplyTextCommand, applyText);
});

onUnmounted(() => {
    editor.value?.destroy();

    unregisterHandler(Cmds.ApplyCorrectionCommand, applyCorrection);
    unregisterHandler(Cmds.ApplyTextCommand, applyText);
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
</script>

<template>
    <div v-if="editor" class="w-full h-full flex flex-col gap-2 p-2 @container">
        <bubble-menu :editor="editor" :tippy-options="{ duration: 100 }">
            <div class="bubble-menu">
                <div
v-if="editor.isActive('correction') && currentBlock && currentBlock.corrected.length > 0"
                    class="flex flex-wrap gap-1 justify-center">
                    <UButton
v-for="correction in currentBlock.corrected.slice(0, 5)" :key="correction"
                        @click="applyCorrection(new ApplyCorrectionCommand(currentBlock, correction))">
                        {{ correction }}
                    </UButton>
                </div>
                <UButton v-else variant="ghost" @click="rewriteText">
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


<style scoped>
@reference "../assets/css/main.css";

.correction {
    @apply underline decoration-wavy decoration-red-500 cursor-pointer;

    /* text-decoration-style: wavy;
    text-decoration-color: var(--color-red-500); */
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
</style>

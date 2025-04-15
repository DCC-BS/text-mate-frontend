<script setup lang="ts">
import CharacterCount from "@tiptap/extension-character-count";
import StarterKit from "@tiptap/starter-kit";
import { BubbleMenu, EditorContent, useEditor } from "@tiptap/vue-3";
import {
    type ApplyTextCommand,
    Cmds,
    UndoRedoStateChanged,
} from "~/assets/models/commands";
import { FocusedSentenceMark } from "~/utils/focused-sentence-mark";
import { FocusedWordMark } from "~/utils/focused-word-mark";
import type { ICommand } from "#build/types/commands";
import TextCorrection from "./text-editor/text-correction.vue";
import TextRewrite from "./text-editor/text-rewrite.vue";

// model
const model = defineModel<string>("modelValue", { required: true });
const selectedText = defineModel<TextFocus>("selectedText");

// refs
const container = ref<HTMLElement>();
const limit = ref(10_000);

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
const isTextCorrectionActive = ref(true);
const isInteractiableFocusActive = ref(false);

const toast = useToast();
const { registerHandler, unregisterHandler, executeCommand } = useCommandBus();
const { FocusExtension, focusedSentence, focusedWord, focusedSelection } =
    useTextFocus(isInteractiableFocusActive);
const { CorrectionExtension, hoverBlock, relativeHoverRect } =
    useTextCorrectionMarks(container, isTextCorrectionActive);

const editor = useEditor({
    content: model.value,
    enablePasteRules: false,
    extensions: [
        StarterKit,
        // @ts-expect-error
        BubbleMenu,
        FocusExtension,
        CorrectionExtension,
        CharacterCount.configure({
            limit: limit.value,
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
    registerHandler(Cmds.ApplyTextCommand, applyText);
    registerHandler(Cmds.UndoCommand, applyUndo);
    registerHandler(Cmds.RedoCommand, applyRedo);
});

watch(focusedSelection, (value) => {
    selectedText.value = value;
});

onUnmounted(() => {
    editor.value?.destroy();

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

function getContent() {
    if (!editor.value) {
        return "";
    }

    return editor.value.getText();
}

// functions

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

        <TextCorrection
            v-if="isTextCorrectionActive"
            :hover-block="hoverBlock"
            :relative-hover-rect="relativeHoverRect" />

        <TextRewrite
            :focused-sentence="focusedSentence"
            :focused-word="focusedWord"
            :text="model"
            :editor="editor"
            :is-text-correction-active="isTextCorrectionActive" />

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

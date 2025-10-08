<script setup lang="ts">
import Bold from "@tiptap/extension-bold";
import BulletList from "@tiptap/extension-bullet-list";
import CharacterCount from "@tiptap/extension-character-count";
import Document from "@tiptap/extension-document";
import HardBreak from "@tiptap/extension-hard-break";
import Heading from "@tiptap/extension-heading";
import History from "@tiptap/extension-history";
import Italic from "@tiptap/extension-italic";
import ListItem from "@tiptap/extension-list-item";
import OrderedList from "@tiptap/extension-ordered-list";
import Paragraph from "@tiptap/extension-paragraph";
import Strike from "@tiptap/extension-strike";
import Text from "@tiptap/extension-text";
import { EditorContent, useEditor } from "@tiptap/vue-3";
import {
    type ApplyTextCommand,
    Cmds,
    type RedoCommand,
    type ToggleEditableEditorCommand,
    type ToggleLockEditorCommand,
    type ToolSwitchCommand,
    type UndoCommand,
    UndoRedoStateChanged,
} from "~/assets/models/commands";
import { FocusedSentenceMark } from "~/utils/focused-sentence-mark";
import { FocusedWordMark } from "~/utils/focused-word-mark";
import TextAutocomplete from "./text-editor/text-autocomplete.vue";
import TextCorrection from "./text-editor/text-correction.vue";
import TextRewrite from "./text-editor/text-rewrite.vue";

const { t } = useI18n();

const {
    dropZoneRef,
    isOverDropZone,
    isConverting,
    error: conversionError,
    fileName,
    handleFileSelect,
    clearError,
} = useFileConvert((text: string) => {
    editor.value?.commands.setContent(text);
    lockEditor.value = false;
});

// model
const model = defineModel<string>("modelValue", { required: true });
const selectedText = defineModel<TextFocus>("selectedText");

// refs
const container = ref<HTMLElement>();
const limit = ref(100_000);
const isTextCorrectionActive = ref(true);
const isInteractiableFocusActive = ref(false);
const lockEditor = ref(false);
const fileInputRef = ref<HTMLInputElement | null>(null);

// Autocomplete state
const undoRedoState = ref({
    canUndo: false,
    canRedo: false,
});

// composables
const toast = useToast();
const { onCommand, executeCommand } = useCommandBus();
const { FocusExtension, focusedSentence, focusedWord, focusedSelection } =
    useTextFocus(isInteractiableFocusActive);
const { CorrectionExtension, hoverBlock, relativeHoverRect } =
    useTextCorrectionMarks(container, isTextCorrectionActive);

const editor = useEditor({
    content: model.value,
    extensions: [
        Text,
        Document,
        BulletList,
        ListItem,
        OrderedList,
        Paragraph,
        HardBreak,
        Bold,
        Italic,
        Strike,
        History,
        Heading,
        FocusExtension,
        CorrectionExtension,
        CharacterCount.configure({
            limit: limit.value,
        }),
        FocusedSentenceMark,
        FocusedWordMark,
    ],
    enablePasteRules: false,
    enableInputRules: false,
    editorProps: {
        handleKeyDown: (_, event) => {
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
                        icon: "i-lucide-clipboard-list",
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
onCommand<ApplyTextCommand>(Cmds.ApplyTextCommand, async (command) => {
    if (!editor.value) return;
    const text = command.text;
    const range = command.range;

    editor.value
        .chain()
        .setTextSelection(range)
        .insertContent(text)
        .focus(range.from)
        .run();
});

onCommand<UndoCommand>(Cmds.UndoCommand, async () => {
    if (!editor.value || !editor.value.can().undo()) return;

    editor.value.commands.undo();
});

onCommand<RedoCommand>(Cmds.RedoCommand, async () => {
    if (!editor.value || !editor.value.can().redo()) return;

    editor.value.commands.redo();
});

onCommand<ToggleEditableEditorCommand>(
    Cmds.ToggleEditableEditorCommand,
    async (command) => {
        if (!editor.value) return;

        editor.value.setEditable(!command.locked, !command.locked);
        editor.value.isFocused = !command.locked;
    },
);

onCommand<ToggleLockEditorCommand>(
    Cmds.ToggleLockEditorCommand,
    async (command) => {
        lockEditor.value = command.locked;
        if (!editor.value) return;
    },
);

onCommand<ToolSwitchCommand>(Cmds.ToolSwitchCommand, async (command) => {
    isTextCorrectionActive.value = command.tool === "correction";
    isInteractiableFocusActive.value = command.tool === "rewrite";
});

watch(focusedSelection, (value) => {
    selectedText.value = value;
});

onUnmounted(() => {
    editor.value?.destroy();
});

// listeners
watch(model, (value) => {
    if (!editor.value) return;

    if (getContent() === value) {
        return;
    }
    editor.value.commands.setContent(value);
});

watch(isConverting, (value) => {
    lockEditor.value = value;
});

/**
 * Watch for error changes to show error toast
 */
watch(conversionError, (newError) => {
    if (newError) {
        toast.add({
            title: t("upload.error"),
            description: `${newError}. ${t("upload.errorDescription")}`,
            color: "error",
            icon: "i-lucide-alert-circle",
            duration: 5000,
            actions: [
                {
                    label: t("upload.dismiss"),
                    onClick: () => clearError(),
                },
            ],
        });
    }
});

/**
 * Watch for fileName changes to show success toast
 */
watch(
    () => fileName.value,
    (newFileName, oldFileName) => {
        if (
            newFileName &&
            !conversionError.value &&
            !isConverting.value &&
            newFileName !== oldFileName
        ) {
            toast.add({
                title: t("upload.fileConvertedSuccess"),
                description: newFileName,
                color: "success",
                icon: "i-lucide-check-circle",
                duration: 3000,
            });
        }
    },
);

// functions
function getContent(): string {
    if (!editor.value) {
        return "";
    }

    return editor.value.getText();
}

/**
 * Gets the current cursor position and selection information
 */
function getCursorInfo() {
    if (!editor.value) return null;

    const { from, to } = editor.value.state.selection;
    const selectedText = editor.value.state.doc.textBetween(from, to);

    return {
        from,
        to,
        selectedText,
        currentLine: 1, // Simplified for now
        column: from + 1,
        isEmpty: from === to,
    };
}

/**
 * Inserts text at the current cursor position
 */
function insertText(text: string): void {
    if (!editor.value) return;

    editor.value.chain().focus().insertContent(text).run();
}

/**
 * Replaces the current selection with new text
 */
function replaceSelection(text: string): void {
    if (!editor.value) return;

    const cursorInfo = getCursorInfo();
    if (!cursorInfo) return;

    editor.value
        .chain()
        .focus()
        .setTextSelection({ from: cursorInfo.from, to: cursorInfo.to })
        .insertContent(text)
        .run();
}

/**
 * Gets the word at the current cursor position
 */
function getCurrentWord(): string {
    if (!editor.value) return "";

    const cursorInfo = getCursorInfo();
    if (!cursorInfo) return "";

    const text = editor.value.getText();
    const beforeCursor = text.substring(0, cursorInfo.from);
    const afterCursor = text.substring(cursorInfo.from);

    // Match word boundaries
    const wordBefore = beforeCursor.match(/\w+$/)?.[0] || "";
    const wordAfter = afterCursor.match(/^\w+/)?.[0] || "";

    return wordBefore + wordAfter;
}

/**
 * Autoformats the current paragraph
 */
function autoformatParagraph(): void {
    if (!editor.value) return;

    const cursorInfo = getCursorInfo();
    if (!cursorInfo) return;

    // Get the full text and apply formatting rules
    const fullText = editor.value.getText();
    const sentences = fullText.split(/([.!?]+)/);

    let formattedText = "";
    for (let i = 0; i < sentences.length; i++) {
        let sentence = sentences[i] || "";

        // Capitalize standalone 'i'
        sentence = sentence.replace(/\b(i)\b/g, "I");

        // Capitalize first letter after punctuation
        if (i > 0 && /[.!?]/.test(sentences[i - 1] || "")) {
            sentence = sentence.charAt(0).toUpperCase() + sentence.slice(1);
        }

        // Remove extra spaces
        sentence = sentence.replace(/\s{2,}/g, " ");

        formattedText += sentence;
    }

    editor.value.commands.setContent(formattedText);
}

function triggerFileUpload(): void {
    if (fileInputRef.value) {
        fileInputRef.value.click();
    }
}

function onFileSelect(event: Event): void {
    handleFileSelect(event);
    // Reset the input so the same file can be selected again
    if (fileInputRef.value) {
        fileInputRef.value.value = "";
    }
}
</script>

<template>
    <div ref="container" v-if="editor" class="w-full h-full flex flex-col gap-2 p-2 @container relative">
        <div v-if="lockEditor" class="absolute top-0 left-0 right-0 bottom-0 z-10">
        </div>

        <TextCorrection v-if="isTextCorrectionActive" :hover-block="hoverBlock"
            :relative-hover-rect="relativeHoverRect" />

        <TextRewrite :focused-sentence="focusedSentence" :focused-word="focusedWord" :text="model" :editor="editor" />

        <div ref="dropZoneRef" class="ring-1 ring-gray-400 w-full h-full overflow-y-scroll relative">
            <!-- Drop zone overlay -->
            <div v-if="isOverDropZone" class="absolute inset-0 bg-gray-100/80 dark:bg-gray-800/80 border-2 border-dashed border-primary-500 rounded-lg 
                    flex flex-col items-center justify-center z-10 transition-all duration-200 backdrop-blur-sm">
                <div class="text-5xl text-primary-500 mb-2">
                    <div class="i-lucide-file-down animate-bounce"></div>
                </div>
                <span class="text-lg font-medium text-primary-600 dark:text-primary-400">
                    {{ t('upload.dropFileToConvert') }}
                </span>
                <span class="text-sm text-gray-500 dark:text-gray-400">{{ t('upload.supportedFormats') }}</span>
            </div>
            <!-- Loading overlay -->
            <div v-if="isConverting"
                class="absolute inset-0 bg-gray-50/90 dark:bg-gray-900/90 rounded-lg flex flex-col items-center justify-center z-10">
                <!-- Loading spinner -->
                <div class="text-4xl text-primary-500 mb-4">
                    <UIcon name="i-lucide-loader-circle" class="animate-spin-slow" />
                </div>
                <span class="text-gray-600 dark:text-gray-300">{{ t('upload.convertingFile') }}</span>
            </div>
            <editor-content :editor="editor" spellcheck="false" class="w-full h-full" />

            <div class="absolute bottom-0 inset-x-0">
                <TextEditorTextToolbar :text="model" :characters="editor.storage.characterCount.characters()"
                    :words="editor.storage.characterCount.words()" :limit="limit" />
            </div>
        </div>

        <div class="flex gap-2 items-start justify-between"
            :class="{ 'character-count--warning': editor.storage.characterCount.characters() === limit }">
            <UButton size="xs" color="primary" @click="triggerFileUpload" :loading="isConverting"
                :disabled="isConverting" icon="i-lucide-file-up" variant="soft">
                {{ isConverting ? t('upload.uploading') : t('upload.uploadFile') }}
            </UButton>
            <input type="file" ref="fileInputRef" class="hidden" @change="onFileSelect"
                accept=".txt,.doc,.docx,.pdf,.md,.html,.rtf,.pptx" />
        </div>
    </div>
</template>


<style lang="css">
@reference "../assets/css/main.css";

.correction {
    text-decoration-line: underline;
    text-decoration-style: solid;
    text-decoration-thickness: 2px;
    text-decoration-color: var(--color-red-300);
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

.text-added {
    @apply bg-green-100;
    background-color: var(--color-green-100);
}

.text-removed {
    @apply bg-red-100;
    background-color: var(--color-red-100);
}

.character-count--warning {
    @apply text-red-500;
}

@media screen and (max-height: 600px) {
    .data-bs-banner {
        @apply hidden;
    }
}

.fade-in {
    opacity: 0;
    /* Start completely transparent */
    animation: fadeIn 2s ease-in forwards;
    /* Apply the fadeIn animation */
}

/* Keyframes for the fade-in effect */
@keyframes fadeIn {
    from {
        opacity: 0;
        /* Start transparent */
    }

    to {
        opacity: 1;
        /* End fully visible */
    }
}

/* Slower spinning animation for loading spinner */
.animate-spin-slow {
    animation: spin 2s linear infinite;
}

@keyframes spin {
    from {
        transform: rotate(0deg);
    }

    to {
        transform: rotate(360deg);
    }
}
</style>

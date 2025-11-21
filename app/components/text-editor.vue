<script setup lang="ts">
import { EditorContent } from "@tiptap/vue-3";
import { useTextAction } from "~/composables/textAction.composable";
import { useTextFileUpload } from "~/composables/useFileUpload";
import { useTextEditor } from "~/composables/useTextEditor";
import TextClear from "./text-editor/text-clear.vue.vue";
import TextCorrection from "./text-editor/text-correction.vue";
import TextRewrite from "./text-editor/text-rewrite.vue";
import TextToolbar from "./text-editor/text-toolbar.vue";

const { t } = useI18n();

// Model bindings
const model = defineModel<string>("modelValue", { required: true });
const selectedText = defineModel<TextFocus>("selectedText");

// Refs
const container = ref<HTMLElement>();
const limit = ref(100_000);
const lockEditor = ref(false);

// Text editor composable
const {
    editor,
    focusedSentence,
    focusedWord,
    focusedSelection,
    hoverBlock,
    relativeHoverRect,
    isTextCorrectionActive,
} = useTextEditor({
    container,
    modelValue: model,
    limit,
    lockEditor,
});

useTextAction(editor);

// File upload composable
const {
    dropZoneRef,
    fileInputRef,
    lockEditor: fileLockEditor,
    isOverDropZone,
    isConverting,
    triggerFileUpload,
    onFileSelect,
} = useTextFileUpload({
    onFileConverted: (text: string) => {
        editor.value?.commands.setContent(text);
        lockEditor.value = false;
    },
});

// Sync lock states
watch(fileLockEditor, (value) => {
    lockEditor.value = value;
});

// Watch for selection changes
watch(focusedSelection, (value) => {
    selectedText.value = value;
});

// File input handler
function handleFileSelect(event: Event): void {
    onFileSelect(event);
}


</script>

<template>
    <div class="w-full h-full">
        <div ref="container" v-if="editor" class="w-full h-full flex flex-col gap-2 p-2 @container relative"
            data-tour="text-editor">
            <!-- Clear text button -->
            <div class="z-5">
                <TextClear />
            </div>

            <!-- Lock overlay -->
            <div v-if="lockEditor" class="absolute top-0 left-0 right-0 bottom-0 z-10" />

            <!-- Text correction overlay -->
            <TextCorrection v-if="isTextCorrectionActive" :hover-block="hoverBlock"
                :relative-hover-rect="relativeHoverRect" />

            <!-- Text rewrite bubble menu -->
            <TextRewrite v-if="!lockEditor" :focused-sentence="focusedSentence" :focused-word="focusedWord"
                :text="model" :editor="editor" />

            <!-- Main editor area -->
            <div ref="dropZoneRef" class="w-full h-full overflow-y-auto overflow-x-hidden relative mb-[35px]">
                <!-- Drop zone overlay -->
                <div v-if="isOverDropZone" class="absolute inset-0 bg-gray-100/80 dark:bg-gray-800/80 border-2 border-dashed border-primary-500 rounded-lg 
                       flex flex-col items-center justify-center z-10 transition-all duration-200 backdrop-blur-sm">
                    <div class="text-5xl text-primary-500 mb-2">
                        <div class="i-lucide-file-down animate-bounce" />
                    </div>
                    <span class="text-lg font-medium text-primary-600 dark:text-primary-400">
                        {{ t('upload.dropFileToConvert') }}
                    </span>
                    <span class="text-sm text-gray-500 dark:text-gray-400">
                        {{ t('upload.supportedFormats') }}
                    </span>
                </div>

                <!-- Loading overlay -->
                <div v-if="isConverting"
                    class="absolute inset-0 bg-gray-50/90 dark:bg-gray-900/90 rounded-lg flex flex-col items-center justify-center z-10">
                    <div class="text-4xl text-primary-500 mb-4">
                        <UIcon name="i-lucide-loader-circle" class="animate-spin-slow" />
                    </div>
                    <span class="text-gray-600 dark:text-gray-300">
                        {{ t('upload.convertingFile') }}
                    </span>
                </div>

                <!-- Editor content -->
                <EditorContent :editor="editor" spellcheck="false" class="w-full h-full" />
            </div>

            <!-- Toolbar -->
            <div class="absolute bottom-0 inset-x-0">
                <TextToolbar :text="model" :characters="editor.storage.characterCount.characters()"
                    :words="editor.storage.characterCount.words()" :limit="limit" @upload-file="triggerFileUpload" />
            </div>

            <input type="file" ref="fileInputRef" class="hidden" @change="handleFileSelect"
                accept=".txt,.doc,.docx,.pdf,.md,.html,.rtf,.pptx" />
        </div>
    </div>
</template>

<style lang="css">
@reference "../assets/css/main.css";

/* Text correction styles */
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

/* Text focus styles */
.focused-sentence {
    @apply bg-blue-100;
    background-color: var(--color-blue-100);
    border-radius: 2px;
    padding: 1px 0;
}

.focused-word {
    color: var(--color-blue-500);
}

/* Text modification styles */
.text-added {
    @apply bg-green-100;
    background-color: var(--color-green-100);
}

.text-removed {
    @apply bg-red-100;
    background-color: var(--color-red-100);
}

/* Character count warning */
.character-count--warning {
    @apply text-red-500;
}

/* Responsive design */
@media screen and (max-height: 600px) {
    .data.bs-banner {
        @apply hidden;
    }
}

/* Animations */
.fade-in {
    opacity: 0;
    animation: fadeIn 2s ease-in forwards;
}

@keyframes fadeIn {
    from {
        opacity: 0;
    }

    to {
        opacity: 1;
    }
}

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

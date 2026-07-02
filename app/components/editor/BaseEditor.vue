<script lang="ts" setup>
import type { Editor } from "@tiptap/vue-3";
import { EditorContent } from "@tiptap/vue-3";
import { Cmds, type ToggleLockEditorCommand } from "~/assets/models/commands";
import type { EditorSelection } from "~/composables/useBaseEditor";
import { useTextFileUpload } from "~/composables/useFileUpload";
import { plainTextToEditorHtml } from "~/utils/plainTextToEditorHtml";
import EditorTextClear from "./TextClear.vue";
import EditorTextToolbar from "./TextToolbar.vue";

interface Props {
    /** Tiptap editor instance, created and owned by the variant wrapper. */
    editor?: Editor;
    /** Plain-text interchange, used for the toolbar (copy/download/wordcount). */
    text: string;
    /** Character-count limit, shown in the toolbar. */
    limit: number;
    /** Current selection, forwarded to the bubble slot. */
    selection?: EditorSelection | null;
    /** When true, mutating toolbar actions (undo/redo/upload) are disabled. */
    readonly?: boolean;
    /** Optional `data-tour` hook for the onboarding tour. */
    tour?: string;
}

const props = withDefaults(defineProps<Props>(), {
    selection: null,
    readonly: false,
    tour: "editor",
});

const { t } = useI18n();

// Outer wrapper element, exposed to the bubble slot for positioning/queries.
const container = ref<HTMLElement | null>(null);

// File upload — shared by both editors. The converted text is pushed straight
// into the variant-owned editor.
const {
    dropZoneRef,
    fileInputRef,
    lockEditor,
    isOverDropZone,
    isConverting,
    triggerFileUpload,
    onFileSelect,
} = useTextFileUpload({
    onFileConverted: (text: string) => {
        props.editor?.commands.setContent(plainTextToEditorHtml(text));
    },
});

// Quick-action streaming locks the editor surface via this command.
const { onCommand } = useCommandBus();
onCommand<ToggleLockEditorCommand>(
    Cmds.ToggleLockEditorCommand,
    async (command) => {
        lockEditor.value = command.locked;
    },
);

const characters = computed(
    () => props.editor?.storage.characterCount?.characters() ?? 0,
);
const words = computed(
    () => props.editor?.storage.characterCount?.words() ?? 0,
);
</script>

<template>
    <div class="w-full h-full">
        <ClientOnly>
            <div
                v-if="editor"
                ref="container"
                class="w-full h-full flex flex-col gap-2 p-2 @container relative"
                :data-tour="tour"
            >
                <!-- Clear text button (top-right) -->
                <div class="z-5"><EditorTextClear /></div>

                <!-- Lock overlay (quick-action streaming / file conversion) -->
                <div
                    v-if="lockEditor"
                    class="absolute top-0 left-0 right-0 bottom-0 z-10"
                />

                <!-- Variant-supplied bubble menu -->
                <slot
                    name="bubble"
                    :editor="editor"
                    :container="container"
                    :selection="selection ?? null"
                    :lock-editor="lockEditor"
                />

                <!-- Editor area + drop target -->
                <div
                    ref="dropZoneRef"
                    class="w-full h-full overflow-y-auto overflow-x-hidden relative mb-[35px]"
                >
                    <!-- Drop zone overlay -->
                    <div
                        v-if="isOverDropZone"
                        class="absolute inset-0 bg-gray-100/80 dark:bg-gray-800/80 border-2 border-dashed border-primary-500 rounded-lg flex flex-col items-center justify-center z-10 transition-all duration-200 backdrop-blur-sm"
                    >
                        <div class="text-5xl text-primary-500 mb-2">
                            <div class="i-lucide-file-down animate-bounce" />
                        </div>
                        <span
                            class="text-lg font-medium text-primary-600 dark:text-primary-400"
                        >
                            {{ t("upload.dropFileToConvert") }}
                        </span>
                        <span class="text-sm text-gray-500 dark:text-gray-400">
                            {{ t("upload.supportedFormats") }}
                        </span>
                    </div>

                    <!-- Loading overlay -->
                    <div
                        v-if="isConverting"
                        class="absolute inset-0 bg-gray-50/90 dark:bg-gray-900/90 rounded-lg flex flex-col items-center justify-center z-10"
                    >
                        <div class="text-4xl text-primary-500 mb-4">
                            <UIcon
                                name="i-lucide-loader-circle"
                                class="animate-spin-slow"
                            />
                        </div>
                        <span class="text-gray-600 dark:text-gray-300">
                            {{ t("upload.convertingFile") }}
                        </span>
                    </div>

                    <!-- Editor content -->
                    <EditorContent
                        :editor="editor"
                        spellcheck="false"
                        class="w-full h-full"
                    />
                </div>

                <!-- Toolbar + wordcount (bottom) -->
                <div class="absolute bottom-0 inset-x-0">
                    <EditorTextToolbar
                        :text="text"
                        :characters="characters"
                        :words="words"
                        :limit="limit"
                        :readonly="readonly"
                        @upload-file="triggerFileUpload"
                    />
                </div>

                <input
                    type="file"
                    ref="fileInputRef"
                    class="hidden"
                    @change="onFileSelect"
                    accept=".txt,.doc,.docx,.pdf,.md,.html,.rtf,.pptx"
                >
            </div>

            <template #fallback>
                <div class="flex items-center justify-center h-full text-muted">
                    <UIcon
                        name="i-lucide-loader-circle"
                        class="animate-spin text-2xl"
                    />
                </div>
            </template>
        </ClientOnly>
    </div>
</template>

<style lang="css">
@reference "../../assets/css/main.css";

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

<script lang="ts" setup>
import StarterKit from "@tiptap/starter-kit";
import { EditorContent, useEditor, type AnyExtension } from "@tiptap/vue-3";

interface ComparePanelProps {
    text: string;
}

const props = defineProps<ComparePanelProps>();

const oldText = ref<string>("");
const currentText = ref<string>("");

watch(
    () => props.text,
    (newValue) => {
        if (newValue !== currentText.value) {
            oldText.value = currentText.value;
            currentText.value = newValue;
        }
    },
);

const editor = useEditor({
    extensions: [StarterKit as AnyExtension],
    editable: true,
});
</script>

<template>
    <div
        v-if="editor"
        class="w-full h-full flex flex-col gap-2 p-2 @container relative"
    >
        <div class="ring-1 ring-gray-400 w-full h-full overflow-y-scroll">
            <EditorContent
                :editor="editor"
                spellcheck="false"
                class="w-full h-full"
            />
        </div>
    </div>
</template>

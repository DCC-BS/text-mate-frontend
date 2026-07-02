<script setup lang="ts">
import BaseEditor from "~/components/editor/BaseEditor.vue";
import { useRewriteEditor } from "~/composables/useRewriteEditor";
import { useTextAction } from "~/composables/useTextAction";
import TextRewrite from "./TextRewrite.vue";

// Model bindings
const model = defineModel<string>("modelValue", { required: true });
const selectedText = defineModel<TextFocus>("selectedText");

const limit = ref(100_000);

// Rewrite editor composable
const { editor, focusedSentence, focusedWord, focusedSelection } =
    useRewriteEditor({
        text: model,
        limit,
    });

useTextAction(editor);

// Watch for selection changes
watch(focusedSelection, (value) => {
    selectedText.value = value;
});
</script>

<template>
    <BaseEditor
        :editor="editor"
        :text="model"
        :limit="limit"
        tour="text-editor"
    >
        <template #bubble="{ editor: ed, lockEditor }">
            <TextRewrite
                v-if="!lockEditor"
                :focused-sentence="focusedSentence"
                :focused-word="focusedWord"
                :text="model"
                :editor="ed"
            />
        </template>
    </BaseEditor>
</template>

<style lang="css">
@reference "../../assets/css/main.css";

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
</style>

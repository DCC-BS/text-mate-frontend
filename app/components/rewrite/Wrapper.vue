<script setup lang="ts">
import TextEditor from "./TextEditor.vue";
import ToolPanel from "./ToolPanel.vue";

interface InputProps {
    selectedText: TextFocus | undefined;
}

const text = defineModel<string>({ default: "" });

const props = defineProps<InputProps>();
</script>

<template>
    <div class="flex-1">
        <div class="w-full md:h-full relative h-100">
            <TextEditor
                v-model="text"
                v-model:selectedText="props.selectedText"
            />
        </div>
    </div>

    <div class="border-t md:border-l md:border-t-0 border-default"></div>

    <div class="flex-1 h-100 md:h-full">
        <ToolPanel :text="text" />
    </div>
</template>

<template>
    <node-view-wrapper class="text-removed" contenteditable="false">
        {{ node.attrs.text }}
    </node-view-wrapper>
</template>

<script setup lang="ts">
import { NodeViewWrapper } from "@tiptap/vue-3";
import { nodeViewProps } from "@tiptap/vue-3";

defineProps({
    ...nodeViewProps,
});
</script>

<style>
@reference "../../assets/css/main.css";

.text-removed {
    @apply bg-red-100;
    background-color: var(--color-red-100);
    text-decoration: line-through;
    user-select: none;
    pointer-events: none;
    display: inline-block;
}
</style>
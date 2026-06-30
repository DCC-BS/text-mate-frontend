<script lang="ts" setup>
import RewriteDiffViewer from "./RewriteDiffViewer.vue";
import TextQuickActionPanel from "./TextQuickActionPanel.vue";

interface RewriteViewProps {
    text: string;
}

const props = defineProps<RewriteViewProps>();
</script>

<template>
    <Teleport to=".quick-action-panel">
        <div class="flex justify-between">
            <TextQuickActionPanel :text="text" />
        </div>
    </Teleport>

    <div class="w-full h-full relative"><RewriteDiffViewer :text="text" /></div>
</template>

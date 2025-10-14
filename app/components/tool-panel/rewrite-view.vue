<script lang="ts" setup>

interface RewriteViewProps {
    text: string;
}

const props = defineProps<RewriteViewProps>();
</script>

<template>
    <Teleport to=".quick-action-panel">
        <div class="flex justify-between">
            <ToolPanelTextQuickActionPanel :text="text" />
        </div>
    </Teleport>

    <div class="w-full h-full relative pb-[35px]">
        <ToolPanelRewriteDiffViewer :text="text" />
    </div>
</template>

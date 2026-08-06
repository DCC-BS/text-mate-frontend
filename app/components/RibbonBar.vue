<script setup lang="ts">
import type { RibbonProps } from "~/types/ribbon";

const props = defineProps<RibbonProps>();

const emit = defineEmits<{
    clear: [];
    "update:selectedDocs": [string[]];
}>();

const { ribbonTab: activeTab } = useRibbonTab();
</script>

<template>
    <div class="border-b border-default min-w-0" data-tour="ribbon">
        <!-- Ribbon body -->
        <div class="flex items-stretch gap-0 px-2 pb-1.5 pt-1 min-w-0">
            <!-- TRANSFORM TAB -->
            <div
                v-if="activeTab === 'transform'"
                data-tour="quick-actions"
            >
                <RibbonTransformTab v-bind="props" />
            </div>
            <!-- VALIDATE TAB -->
            <div v-else class="flex justify-center items-stretch gap-3 w-full">
                <RibbonValidateTab v-bind="props" />
            </div>
        </div>
    </div>
</template>

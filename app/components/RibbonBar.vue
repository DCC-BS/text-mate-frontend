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
        <!-- Mobile ribbon -->
        <div class="px-2 pb-2 pt-1.5 min-w-0 md:hidden">
            <RibbonMobileTransformTab
                v-if="activeTab === 'transform'"
                :text="props.text"
                :busy="props.busy"
                :editable="props.editable"
            />
            <RibbonMobileValidateTab
                v-else
                :text="props.text"
                :busy="props.busy"
                :editable="props.editable"
                :selected-docs="props.selectedDocs"
                :max-docs="props.maxDocs"
                :to-fix-count="props.toFixCount"
                @clear="emit('clear')"
                @update:selected-docs="emit('update:selectedDocs', $event)"
            />
        </div>

        <!-- Ribbon body (desktop only) -->
        <div
            class="hidden md:flex items-stretch gap-0 px-2 pb-1.5 pt-1 min-w-0"
        >
            <!-- TRANSFORM TAB -->
            <div v-if="activeTab === 'transform'" data-tour="quick-actions">
                <RibbonTransformTab
                    v-bind="props"
                    @clear="emit('clear')"
                    @update:selected-docs="emit('update:selectedDocs', $event)"
                />
            </div>
            <!-- VALIDATE TAB -->
            <div v-else class="flex justify-center items-stretch gap-3 w-full">
                <RibbonValidateTab
                    v-bind="props"
                    @clear="emit('clear')"
                    @update:selected-docs="emit('update:selectedDocs', $event)"
                />
            </div>
        </div>
    </div>
</template>

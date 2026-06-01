<script lang="ts" setup>
import { computed } from "vue";
import { USkeleton, UTooltip } from "#components";

const { t } = useI18n();

// Define explicit types for props
const props = defineProps<{
    // True while fetching the score from the backend
    isLoading: boolean;
    // The CEFR score level (e.g. A1, B2) computed by the backend
    cefrLevel?: string;
    // Any error message returned during the analysis
    error?: string;
}>();

// Compute the localized description label for the CEFR level
const cefrLabelText = computed<string>(() => {
    if (!props.cefrLevel) {
        return "";
    }
    const levelKey = props.cefrLevel.toLowerCase();
    return t(`flesch-score.cefr-level-${levelKey}`);
});

// Compute the design-harmonised Tailwind class name depending on CEFR level
const cefrLevelClass = computed<string>(() => {
    if (!props.cefrLevel) {
        return "text-gray-400 dark:text-gray-500";
    }
    const level = props.cefrLevel.toUpperCase();
    if (level === "A1" || level === "A2") {
        return "text-blue-500 dark:text-blue-400"; // blue class
    }
    if (level === "B1" || level === "B2") {
        return "text-orange-500 dark:text-orange-400"; // orange class
    }
    if (level === "C1" || level === "C2") {
        return "text-red-500 dark:text-red-400"; // red class
    }
    return "text-gray-400 dark:text-gray-500";
});
</script>

<template>
    <!-- CEFR Text Understandability Score -->
    <div
        class="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between text-sm"
    >
        <!-- Left Side: Title with Tooltip (no info icon) -->
        <UTooltip :text="t('flesch-score.cefr-description')">
            <span
                class="text-xs font-medium text-gray-500 dark:text-gray-400 cursor-help hover:text-gray-600 dark:hover:text-gray-300"
            >
                {{ t("flesch-score.cefr-level") }}
            </span>
        </UTooltip>

        <!-- Right Side: Content based on state -->

        <!-- Error State -->
        <div v-if="props.error" class="text-xs text-rose-500 font-medium">
            {{ props.error }}
        </div>

        <!-- Loading State with compact Skeleton -->
        <div v-else-if="props.isLoading" class="py-0.5">
            <USkeleton class="h-4 w-[60px]" />
        </div>

        <!-- Text too short state -->
        <div
            v-else-if="!props.cefrLevel"
            class="text-xs text-gray-400 dark:text-gray-500 italic"
        >
            {{ t("flesch-score.cefr-too-short") }}
        </div>

        <!-- Success State: Blends in beautifully like the Flesch Score visualization header -->
        <div v-else class="flex items-center gap-2">
            <span class="text-base font-black text-gray-800 dark:text-gray-100">
                {{ props.cefrLevel }}
            </span>
            <span
                class="text-xs font-bold uppercase tracking-wider"
                :class="cefrLevelClass"
            >
                {{ cefrLabelText }}
            </span>
        </div>
    </div>
</template>

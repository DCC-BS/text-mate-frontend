<script lang="ts" setup>
import { computed } from "vue";
import { USkeleton, UTooltip } from "#components";
import ReadabilityScoreBadge from "~/components/ReadabilityScoreBadge.vue";
import { isUnscored, type ReadabilityScore } from "~/utils/readability";
import type { ReadabilityBand } from "~~/shared/types/simplify";

const { t } = useI18n();

// Define explicit types for props
const props = defineProps<{
    // True while fetching the score from the backend
    isLoading: boolean;
    // The CEFR score level (e.g. A1, B2) computed by the backend. Only `de`
    // and `en` have a CEFR mapping — see spec §10.
    cefrLevel?: string;
    // Detected language of the text, when the backend reports one
    language?: string;
    // Raw score on the analyzer's own scale (ZIX, LIX, Gulpease, …)
    score?: number;
    // Name of that metric, used as the row label for languages without CEFR
    scoreLabel?: string;
    // Calibrated band of the score
    band?: ReadabilityBand;
    // Any error message returned during the analysis
    error?: string;
}>();

/**
 * The score in the shape the shared badge understands. `scored` is derived
 * from what the backend actually sent: a language without an analyzer yields
 * neither a level nor a score, and nothing is rendered for it.
 */
const scoreValue = computed<ReadabilityScore>(() => ({
    scored: props.cefrLevel !== undefined || props.score !== undefined,
    language: props.language,
    scoreLabel: props.scoreLabel,
    score: props.score,
    band: props.band,
    cefr: props.cefrLevel,
}));

const hasNothingToShow = computed<boolean>(() => isUnscored(scoreValue.value));

/**
 * Row label: the CEFR wording for languages that have a level, the metric name
 * (e.g. "Lesbarkeit (LIX)") for those that do not.
 */
const rowLabel = computed<string>(() => {
    if (props.cefrLevel === undefined && props.scoreLabel !== undefined) {
        return t("simplify.readability", { label: props.scoreLabel });
    }
    return t("flesch-score.cefr-level");
});

const rowDescription = computed<string>(() =>
    props.cefrLevel === undefined && props.scoreLabel !== undefined
        ? t("simplify.readabilityDescription")
        : t("flesch-score.cefr-description"),
);

/**
 * Why nothing is shown: a language we have no analyzer for is a different
 * situation from a text that is simply too short to score.
 */
const emptyStateText = computed<string>(() =>
    props.language !== undefined
        ? t("simplify.notScored")
        : t("flesch-score.cefr-too-short"),
);
</script>

<template>
    <!-- Text Understandability Score: CEFR where the language has a mapping,
         the raw metric plus its band otherwise. -->
    <div
        class="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between text-sm"
    >
        <!-- Left Side: Title with Tooltip (no info icon) -->
        <UTooltip :text="rowDescription">
            <span
                class="text-xs font-medium text-gray-500 dark:text-gray-400 cursor-help hover:text-gray-600 dark:hover:text-gray-300"
            >
                {{ rowLabel }}
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

        <!-- Nothing to score: text too short, or a language without an analyzer -->
        <div
            v-else-if="hasNothingToShow"
            class="text-xs text-gray-400 dark:text-gray-500 italic"
        >
            {{ emptyStateText }}
        </div>

        <!-- Success State -->
        <ReadabilityScoreBadge v-else :value="scoreValue" />
    </div>
</template>
